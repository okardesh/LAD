@echo off
setlocal

set "BASE_DIR=%~dp0"
set "JAR_PATH=%~1"
set "CONF_PATH=%~2"

if "%JAR_PATH%"=="" set "JAR_PATH=%BASE_DIR%smartaggregator.jar"
if "%CONF_PATH%"=="" set "CONF_PATH=%BASE_DIR%config\application-local.properties"

if not exist "%JAR_PATH%" (
  echo Backend jar not found: %JAR_PATH%
  echo Place smartaggregator.jar in %BASE_DIR% or pass jar path as arg1.
  exit /b 1
)

if not exist "%CONF_PATH%" (
  echo Config file not found: %CONF_PATH%
  echo Pass config path as arg2.
  exit /b 1
)

if "%JAVA_OPTS%"=="" set "JAVA_OPTS=-Xmx2048m -Xms512m"

echo Starting backend
echo JAR: %JAR_PATH%
echo Config: %CONF_PATH%

java %JAVA_OPTS% -jar "%JAR_PATH%" --spring.config.location="file:%CONF_PATH%"

endlocal