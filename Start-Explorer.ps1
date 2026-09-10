param(
    [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'NeuropixelsExplorer\projects'),
    [string]$Database = '',
    [string]$Python = 'python',
    [int]$Port = 8791,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$DataRoot = [IO.Path]::GetFullPath($DataRoot)
if (-not $Database) { $Database = Join-Path $DataRoot 'explorer\catalog.sqlite' }
$Database = [IO.Path]::GetFullPath($Database)
$appVersion = (Get-Content -LiteralPath (Join-Path $appRoot 'VERSION') -Raw).Trim()
$serviceVersion = $appVersion.Replace('-beta.', 'b').Replace('-alpha.', 'a').Replace('-rc.', 'rc')
$baseUrl = "http://127.0.0.1:$Port"
$logs = Join-Path (Split-Path $Database -Parent) 'logs'

function Read-Health {
    try { Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 2 } catch { $null }
}
try {
    $pythonCommand = Get-Command $Python -ErrorAction Stop
    $pythonExecutable = $pythonCommand.Source
    $env:PYTHONUTF8 = '1'
    $env:PYTHONPATH = Join-Path $appRoot 'server'
    $extraDependencies = Join-Path $appRoot 'runtime\allen-dependencies'
    if (Test-Path -LiteralPath $extraDependencies) { $env:PYTHONPATH += ";$extraDependencies" }
    & $pythonExecutable -c 'import numpy, h5py, tkinter'
    if ($LASTEXITCODE -ne 0) { throw 'Python dependencies are missing. In this checkout, run: python -m pip install -e ".[allen]"' }
    New-Item -ItemType Directory -Force -Path $DataRoot | Out-Null
    New-Item -ItemType Directory -Force -Path $logs | Out-Null
    if (-not (Test-Path -LiteralPath $Database)) {
        & $pythonExecutable -m neuropixels_explorer init-db --database $Database
        if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the local project catalog.' }
    }
    $runtimeId = & $pythonExecutable -c 'import hashlib, pathlib, sys; print(hashlib.sha256(str(pathlib.Path(sys.argv[1]).resolve()).lower().encode()).hexdigest()[:16])' $Database
    if ($LASTEXITCODE -ne 0) { throw 'Could not identify the local project catalog.' }
    $health = Read-Health
    if ($health -and $health.status -eq 'ok' -and $health.serviceVersion -eq $serviceVersion -and $health.runtimeId -eq $runtimeId) {
        Write-Output "Explorer $appVersion is already running."
    } else {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
            $command = [string]$existing.CommandLine
            $sameCatalog = $command.IndexOf($Database, [StringComparison]::OrdinalIgnoreCase) -ge 0
            if ($command -notmatch '-m\s+neuropixels_explorer(?:\.cli)?\s+serve' -or -not $sameCatalog) {
                throw "Port $Port is used by another application or project. Start with -Port and a different number."
            }
            Write-Output 'Restarting this catalog with the current Explorer version.'
            Stop-Process -Id $existing.ProcessId
            for ($i=0; $i -lt 30; $i++) {
                if (-not (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) { break }
                Start-Sleep -Milliseconds 100
            }
        }
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $stderrPath = Join-Path $logs "server-$stamp.stderr.log"
        $stdoutPath = Join-Path $logs "server-$stamp.stdout.log"
        $arguments = @('-m','neuropixels_explorer','serve','--database',('"{0}"' -f $Database),
            '--data-root',('"{0}"' -f $DataRoot),'--static-root',('"{0}"' -f $appRoot),
            '--cache-root',('"{0}"' -f (Join-Path (Split-Path $Database -Parent) 'activity-cache')),
            '--host','127.0.0.1','--port',"$Port",'--quiet')
        $helper = Start-Process -FilePath $pythonExecutable -ArgumentList $arguments -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
        @{pid=$helper.Id; version=$appVersion; url="$baseUrl/"; database=$Database; stderr=$stderrPath; startedUtc=[DateTime]::UtcNow.ToString('o')} |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logs 'latest-process.json') -Encoding UTF8
        $deadline = (Get-Date).AddSeconds(30)
        do {
            $health = Read-Health
            if ($health -and $health.status -eq 'ok') { break }
            $helper.Refresh()
            if ($helper.HasExited) { throw "Explorer exited during startup. Read $stderrPath" }
            Start-Sleep -Milliseconds 400
        } while ((Get-Date) -lt $deadline)
        if (-not $health -or $health.serviceVersion -ne $serviceVersion -or $health.runtimeId -ne $runtimeId) { throw "Explorer did not start correctly. Read $stderrPath" }
        Write-Output "Explorer $appVersion is ready."
    }
    Write-Output "Start screen: $baseUrl/"
    if (-not $NoBrowser) { Start-Process "$baseUrl/" }
} catch {
    Write-Host "Unable to start Explorer: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
