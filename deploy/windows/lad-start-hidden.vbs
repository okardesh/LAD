' Launches the LAD backend and frontend with no visible console window.
' Put this file in your LAD folder (e.g. C:\lad) and drop a shortcut to it
' into the Startup folder (Win+R -> shell:startup).

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

q = Chr(34)   ' a double-quote character

' The folder this .vbs lives in = the LAD root.
repoRoot = fso.GetParentFolderName(WScript.ScriptFullName)

backend  = repoRoot & "\smartaggregator\start_backend.cmd"
frontend = repoRoot & "\smartaggregator-ui\app\start_frontend.cmd"

' Fall back to a flat layout (scripts directly next to this file)
If Not fso.FileExists(backend)  Then backend  = repoRoot & "\start_backend.cmd"
If Not fso.FileExists(frontend) Then frontend = repoRoot & "\start_frontend.cmd"

If Not fso.FileExists(backend) Then
  MsgBox "start_backend.cmd not found under " & repoRoot, vbExclamation, "LAD"
  WScript.Quit 1
End If
If Not fso.FileExists(frontend) Then
  MsgBox "start_frontend.cmd not found under " & repoRoot, vbExclamation, "LAD"
  WScript.Quit 1
End If

logDir = repoRoot & "\logs"
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

' cmd /c ""<script>" > "<log>" 2>&1"
Sub RunHidden(script, logFile)
  line = "cmd /c " & q & q & script & q & " > " & q & logFile & q & " 2>&1" & q
  sh.Run line, 0, False
End Sub

RunHidden backend,  logDir & "\backend.log"
RunHidden frontend, logDir & "\frontend.log"
