<#
  Registers the LAD backend + frontend as Scheduled Tasks that start
  automatically at logon and run in the background (no console window).

  Usage (from an elevated PowerShell prompt):
      powershell -ExecutionPolicy Bypass -File .\install-startup.ps1
      powershell -ExecutionPolicy Bypass -File .\install-startup.ps1 -RepoRoot C:\lad

  Re-running it refreshes the tasks.
#>

param(
    # Folder that contains the LAD files. Defaults to C:\lad, then the repo
    # root two levels above this script.
    [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

# Re-launch elevated if we are not already Administrator (Register-ScheduledTask
# needs it on most machines -> "access denied" otherwise).
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Not elevated - relaunching as Administrator..."
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    if ($RepoRoot) { $argList += @('-RepoRoot', "`"$RepoRoot`"") }
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
    return
}

if (-not $RepoRoot) {
    if (Test-Path 'C:\lad') {
        $RepoRoot = 'C:\lad'
    } else {
        $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    }
}
$RepoRoot = (Resolve-Path $RepoRoot).Path
Write-Host "Using RepoRoot: $RepoRoot"

function Find-Script {
    param([string]$Name, [string[]]$Candidates)
    foreach ($c in $Candidates) {
        if (Test-Path $c) { return (Resolve-Path $c).Path }
    }
    # last resort: search the tree
    $hit = Get-ChildItem -Path $RepoRoot -Filter $Name -Recurse -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if ($hit) { return $hit.FullName }
    throw "Could not find $Name under $RepoRoot"
}

$Backend = Find-Script 'start_backend.cmd' @(
    (Join-Path $RepoRoot 'smartaggregator\start_backend.cmd'),
    (Join-Path $RepoRoot 'start_backend.cmd')
)
$Frontend = Find-Script 'start_frontend.cmd' @(
    (Join-Path $RepoRoot 'smartaggregator-ui\app\start_frontend.cmd'),
    (Join-Path $RepoRoot 'app\start_frontend.cmd'),
    (Join-Path $RepoRoot 'start_frontend.cmd')
)

Write-Host "Backend : $Backend"
Write-Host "Frontend: $Frontend"

$LogDir = Join-Path $RepoRoot 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Register-LadTask {
    param(
        [string]$Name,
        [string]$Script,
        [string]$WorkDir,
        [string]$Log
    )

    # cmd.exe /c "" "script" > log 2>&1 ""  -- keeps the window hidden and captures output
    $cmd = "/c """"$Script"" > ""$Log"" 2>&1"""

    $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $cmd -WorkingDirectory $WorkDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -Hidden
    # RunLevel Limited -> does not need the task to run elevated (java/node on
    # ports 8081/8082 don't need admin). Registering the task itself may still
    # require an elevated PowerShell depending on machine policy.
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

    if (Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $Name -Confirm:$false
    }

    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger `
        -Settings $settings -Principal $principal `
        -Description "LAD service: $Script" | Out-Null

    Write-Host "Registered task: $Name"
}

Register-LadTask -Name 'LAD Backend' `
    -Script $Backend `
    -WorkDir (Split-Path $Backend) `
    -Log (Join-Path $LogDir 'backend.log')

Register-LadTask -Name 'LAD Frontend' `
    -Script $Frontend `
    -WorkDir (Split-Path $Frontend) `
    -Log (Join-Path $LogDir 'frontend.log')

Write-Host ''
Write-Host 'Done. The services will start at your next logon.'
Write-Host 'Start them now with:'
Write-Host '    Start-ScheduledTask -TaskName "LAD Backend"'
Write-Host '    Start-ScheduledTask -TaskName "LAD Frontend"'
Write-Host ''
Write-Host "Logs: $LogDir"
