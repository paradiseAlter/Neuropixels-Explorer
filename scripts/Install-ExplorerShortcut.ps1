param(
    [Parameter(Mandatory=$true)][string]$DataRoot,
    [Parameter(Mandatory=$true)][string]$Database,
    [string]$Python = 'python',
    [ValidateRange(1024,65535)][int]$Port = 8791,
    [string]$Name = 'Neuropixels Explorer'
)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
if ($Name.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0) { throw 'Invalid shortcut name.' }
$DataRoot = (Resolve-Path -LiteralPath $DataRoot).Path
$Database = (Resolve-Path -LiteralPath $Database).Path
$pythonExecutable = (Get-Command $Python -CommandType Application).Source
$configDirectory = Join-Path $appRoot 'config'
New-Item -ItemType Directory -Force -Path $configDirectory | Out-Null
$profilePath = Join-Path $configDirectory 'local.launcher.json'
if (Test-Path -LiteralPath $profilePath) { Copy-Item -LiteralPath $profilePath -Destination (Join-Path $configDirectory ("local.launcher-backup-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))) }
@{dataRoot=$DataRoot; database=$Database; python=$pythonExecutable; port=$Port; openDatabase=$true; requireExistingCatalog=$true} |
    ConvertTo-Json | Set-Content -LiteralPath $profilePath -Encoding UTF8
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) ($Name + '.lnk')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $appRoot 'Start-Explorer.cmd'
$shortcut.Arguments = '-DataRoot "{0}" -Database "{1}" -Python "{2}" -Port {3} -OpenDatabase -RequireExistingCatalog' -f $DataRoot,$Database,$pythonExecutable,$Port
$shortcut.WorkingDirectory = $appRoot
$shortcut.Description = "Start or reopen Neuropixels Explorer for $DataRoot"
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,15"
$shortcut.WindowStyle = 1
$shortcut.Save()
Write-Output "Desktop shortcut: $shortcutPath"
Write-Output "Local launch profile: $profilePath"
