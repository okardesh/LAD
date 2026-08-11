@echo off
setlocal

set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

if not exist "env\dev.env" (
  echo Missing env\dev.env
  exit /b 1
)

echo Starting UI in real-backend mode (NODE_ENV=development)
set "NODE_ENV=development"
node app.js

endlocal