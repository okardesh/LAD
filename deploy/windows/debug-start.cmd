@echo off
REM Runs both LAD services in visible windows that stay open so you can see errors.
setlocal
set "ROOT=%~dp0"
REM strip trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\smartaggregator\start_backend.cmd"
set "FRONTEND=%ROOT%\smartaggregator-ui\app\start_frontend.cmd"
if not exist "%BACKEND%"  set "BACKEND=%ROOT%\start_backend.cmd"
if not exist "%FRONTEND%" set "FRONTEND=%ROOT%\start_frontend.cmd"

echo Root     : %ROOT%
echo Backend  : %BACKEND%
echo Frontend : %FRONTEND%
echo.

where java  || echo(*** java not found on PATH ***
where node  || echo(*** node not found on PATH ***
echo.

if not exist "%BACKEND%"  ( echo BACKEND SCRIPT MISSING & pause & exit /b 1 )
if not exist "%FRONTEND%" ( echo FRONTEND SCRIPT MISSING & pause & exit /b 1 )

start "LAD Backend"  cmd /k "%BACKEND%"
start "LAD Frontend" cmd /k "%FRONTEND%"

echo Two windows opened. Read any errors there.
pause
