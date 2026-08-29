<#
  Removes the LAD backend + frontend Scheduled Tasks.

  Usage:
      powershell -ExecutionPolicy Bypass -File .\uninstall-startup.ps1
#>

$ErrorActionPreference = 'Stop'

foreach ($name in 'LAD Backend', 'LAD Frontend') {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
        Write-Host "Removed task: $name"
    } else {
        Write-Host "Task not found: $name"
    }
}
