# Running LAD at Windows startup (in the background)

Assumes the LAD files live in **`C:\lad`**, i.e.:

| Service  | Script                                          | Port |
|----------|-------------------------------------------------|------|
| Backend  | `C:\lad\smartaggregator\start_backend.cmd`      | 8081 |
| Frontend | `C:\lad\smartaggregator-ui\app\start_frontend.cmd` | 8082 |

(If the two `.cmd` files sit directly in `C:\lad`, the scripts here detect that too.)

Both run `java` / `node` in the foreground, so to get them "in the background"
you need something that starts them without a console window. Pick one option.

---

## Option A — Scheduled Tasks (recommended)

Starts at logon, no window, auto-restarts on crash, captures logs.

Copy the `deploy\windows` folder onto the Windows box (or just these 3 files),
then from an **elevated** PowerShell prompt in that folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-startup.ps1 -RepoRoot C:\lad

# Start them right now without logging out:
Start-ScheduledTask -TaskName "LAD Backend"
Start-ScheduledTask -TaskName "LAD Frontend"
```

`-RepoRoot` defaults to `C:\lad`, so you can omit it if that's where the files are.

Manage:

```powershell
Get-ScheduledTask -TaskName "LAD *" | Get-ScheduledTaskInfo   # status / last result
Stop-ScheduledTask  -TaskName "LAD Backend"
Start-ScheduledTask -TaskName "LAD Frontend"
powershell -ExecutionPolicy Bypass -File .\uninstall-startup.ps1
```

Logs: `C:\lad\logs\backend.log` and `C:\lad\logs\frontend.log`.

---

## Option B — Startup folder + hidden launcher

No admin rights needed, but no auto-restart.

1. Put `lad-start-hidden.vbs` somewhere on the box (e.g. `C:\lad`). Edit the
   `repoRoot` line inside it if the path isn't `C:\lad`.
2. Press `Win+R`, type `shell:startup`, press Enter.
3. Right-click → New → Shortcut. Target:
   `wscript.exe "C:\lad\lad-start-hidden.vbs"`
4. Both services now launch hidden at every logon.

To start now: double-click the `.vbs`.
To stop: end the `java.exe` / `node.exe` processes in Task Manager.

---

## Option C — true Windows Service (survives with no user logged in)

Use [NSSM](https://nssm.cc/):

```cmd
nssm install LadBackend  "C:\lad\smartaggregator\start_backend.cmd"
nssm install LadFrontend "C:\lad\smartaggregator-ui\app\start_frontend.cmd"
nssm set LadFrontend AppDirectory "C:\lad\smartaggregator-ui\app"
nssm start LadBackend
nssm start LadFrontend
```
