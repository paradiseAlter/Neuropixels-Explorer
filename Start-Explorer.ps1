param(
    [string]$DataRoot = '',
    [string]$Database = '',
    [string]$Python = '',
    [ValidateRange(1024,65535)][int]$Port = 8791,
    [switch]$OpenDatabase,
    [switch]$RequireExistingCatalog,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$launchLock = $null
$ownsLock = $false
$stderrPath = $null
function Read-Health {
    try { Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 2 } catch { $null }
}
try {
    # Explicit data paths bypass the optional, unversioned project profile.
    $profilePath = Join-Path $appRoot 'config\local.launcher.json'
    if (-not $DataRoot -and -not $Database -and (Test-Path -LiteralPath $profilePath)) {
        $profile = Get-Content -LiteralPath $profilePath -Raw | ConvertFrom-Json
        $DataRoot = [string]$profile.dataRoot
        $Database = [string]$profile.database
        if (-not $Python) { $Python = [string]$profile.python }
        if (-not $PSBoundParameters.ContainsKey('Port')) { $Port = [int]$profile.port }
        if (-not $PSBoundParameters.ContainsKey('OpenDatabase')) { $OpenDatabase = [bool]$profile.openDatabase }
        if (-not $PSBoundParameters.ContainsKey('RequireExistingCatalog')) { $RequireExistingCatalog = [bool]$profile.requireExistingCatalog }
    }
    if (-not $DataRoot) { $DataRoot = Join-Path $env:LOCALAPPDATA 'NeuropixelsExplorer\projects' }
    if (-not $Python) { $Python = 'python' }
    if ($Port -lt 1024 -or $Port -gt 65535) { throw 'The configured port must be between 1024 and 65535.' }
    $DataRoot = [IO.Path]::GetFullPath($DataRoot)
    if (-not $Database) { $Database = Join-Path $DataRoot 'explorer\catalog.sqlite' }
    $Database = [IO.Path]::GetFullPath($Database)
    if ($RequireExistingCatalog -and (-not (Test-Path -LiteralPath $DataRoot -PathType Container) -or -not (Test-Path -LiteralPath $Database -PathType Leaf))) {
        throw "The selected project is unavailable. Connect its drive and try again. No empty replacement was created. Expected catalog: $Database"
    }
    $appVersion = (Get-Content -LiteralPath (Join-Path $appRoot 'VERSION') -Raw).Trim()
    $serviceVersion = $appVersion.Replace('-beta.', 'b').Replace('-alpha.', 'a').Replace('-rc.', 'rc')
    $baseUrl = "http://127.0.0.1:$Port"
    $openUrl = if ($OpenDatabase) { "$baseUrl/?database=1" } else { "$baseUrl/" }
    $logs = Join-Path (Split-Path $Database -Parent) 'logs'
    $bootstrap = Join-Path $appRoot 'server\launch_explorer.py'
    $pythonExecutable = (Get-Command $Python -CommandType Application -ErrorAction Stop).Source
    $env:PYTHONUTF8 = '1'
    $env:PYTHONPATH = Join-Path $appRoot 'server'
    $extraDependencies = Join-Path $appRoot 'runtime\allen-dependencies'
    if (Test-Path -LiteralPath $extraDependencies) { $env:PYTHONPATH += ";$extraDependencies" }
    $runtimeId = & $pythonExecutable -c 'import hashlib, pathlib, sys; print(hashlib.sha256(str(pathlib.Path(sys.argv[1]).resolve()).lower().encode()).hexdigest()[:16])' $Database
    if ($LASTEXITCODE -ne 0) { throw 'Python could not identify the selected project.' }
    # Serialize double clicks and starts for different catalogs sharing one port.
    $launchLock = New-Object Threading.Mutex($false, "Local\NeuropixelsExplorer-$Port")
    try { $ownsLock = $launchLock.WaitOne(45000) } catch [Threading.AbandonedMutexException] { $ownsLock = $true }
    if (-not $ownsLock) { throw 'Another launch is still in progress. Wait a moment, then open Explorer again.' }
    $health = Read-Health
    if ($health -and $health.status -eq 'ok' -and $health.serviceVersion -eq $serviceVersion -and $health.runtimeId -eq $runtimeId) {
        Write-Output "Explorer $appVersion is already running; reusing this project."
    } else {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
            $command = [string]$existing.CommandLine
            $legacyOwned = $command -match '-m\s+neuropixels_explorer(?:\.cli)?\s+serve' -and $command.IndexOf(('"' + $Database + '"'), [StringComparison]::OrdinalIgnoreCase) -ge 0
            $newOwned = $command.IndexOf(('"' + $bootstrap + '"'), [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $command.IndexOf(('"' + $logs + '\launch-'), [StringComparison]::OrdinalIgnoreCase) -ge 0
            if (-not ($legacyOwned -or $newOwned) -or -not $health -or $health.runtimeId -ne $runtimeId) {
                throw "Port $Port belongs to another application/project or an unresponsive process. It was left running. Close that application or choose another -Port."
            }
            Write-Output 'Updating this project to the current Explorer version.'
            Stop-Process -Id $existing.ProcessId
            for ($i=0; $i -lt 30; $i++) {
                if (-not (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) { break }
                Start-Sleep -Milliseconds 100
            }
        }
        & $pythonExecutable -c 'import numpy, h5py, tkinter'
        if ($LASTEXITCODE -ne 0) { throw 'Python dependencies are missing. In the application folder, run: python -m pip install -e ".[allen]"' }
        New-Item -ItemType Directory -Force -Path $DataRoot, $logs | Out-Null
        if (-not (Test-Path -LiteralPath $Database)) {
            & $pythonExecutable -m neuropixels_explorer init-db --database $Database
            if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the local project catalog.' }
        }
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $stderrPath = Join-Path $logs "server-$stamp.stderr.log"
        $stdoutPath = Join-Path $logs "server-$stamp.stdout.log"
        $configPath = Join-Path $logs "launch-$stamp.json"
        @{ database=$Database; dataRoot=$DataRoot; staticRoot=$appRoot; cacheRoot=(Join-Path (Split-Path $Database -Parent) 'activity-cache'); port=$Port; stdout=$stdoutPath; stderr=$stderrPath } |
            ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
        # WMI starts an on-demand process outside this terminal/job tree.
        # No login task or Windows service is registered. Keep its window hidden.
        $startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow=[uint16]0 }
        $created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine=('"{0}" "{1}" "{2}"' -f $pythonExecutable,$bootstrap,$configPath)
            CurrentDirectory=$appRoot
            ProcessStartupInformation=$startup
        }
        if ($created.ReturnValue -ne 0) { throw "Windows could not start Explorer (process creation code $($created.ReturnValue))." }
        $servicePid = [int]$created.ProcessId
        $processRecord = @{pid=$servicePid; version=$appVersion; url=$openUrl; database=$Database; stderr=$stderrPath; stdout=$stdoutPath; config=$configPath; startedUtc=[DateTime]::UtcNow.ToString('o'); ready=$false}
        $processRecord | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logs 'latest-process.json') -Encoding UTF8
        $deadline = (Get-Date).AddSeconds(30)
        do {
            $health = Read-Health
            if ($health -and $health.status -eq 'ok' -and $health.serviceVersion -eq $serviceVersion -and $health.runtimeId -eq $runtimeId) { break }
            if (-not (Get-Process -Id $servicePid -ErrorAction SilentlyContinue)) { throw 'Explorer stopped before it became ready.' }
            Start-Sleep -Milliseconds 400
        } while ((Get-Date) -lt $deadline)
        if (-not $health -or $health.status -ne 'ok' -or $health.serviceVersion -ne $serviceVersion -or $health.runtimeId -ne $runtimeId) { throw 'Explorer did not become ready within 30 seconds. Check the startup log below.' }
        $processRecord.ready = $true
        $processRecord | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logs 'latest-process.json') -Encoding UTF8
        Write-Output "Explorer $appVersion is ready."
    }
    Write-Output "Project: $Database"
    Write-Output "Open: $openUrl"
    if (-not $NoBrowser) { Start-Process $openUrl }
} catch {
    Write-Host "Unable to open Explorer: $($_.Exception.Message)" -ForegroundColor Red
    if ($stderrPath -and (Test-Path -LiteralPath $stderrPath)) {
        Get-Content -LiteralPath $stderrPath -Tail 8 | Write-Host
        Write-Host "Startup log: $stderrPath"
    }
    Write-Host 'Fix the issue shown above, then double-click the same Explorer shortcut again.'
    exit 1
} finally {
    if ($ownsLock) { $launchLock.ReleaseMutex() }
    if ($launchLock) { $launchLock.Dispose() }
}
