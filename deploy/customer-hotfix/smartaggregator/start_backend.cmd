@echo off
REM LAD backend launcher - fixed paths so a fresh DB regenerates + seeds correctly.
REM - forces working dir to this folder (so ./smartaggregator-db and data.sql resolve)
REM - loads the H2 driver from lib\ (the jar does not bundle it)
REM - initialization-mode=always so config\data.sql runs on a fresh DB
setlocal
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
cd /d "%BASE_DIR%"

set "JAR_PATH=%~1"
if "%JAR_PATH%"=="" set "JAR_PATH=%BASE_DIR%\smartaggregator.jar"
set "CONF_PATH=%~2"
if "%CONF_PATH%"=="" set "CONF_PATH=%BASE_DIR%\config\application-local.properties"

if not exist "%JAR_PATH%"  ( echo Backend jar not found: %JAR_PATH% & exit /b 1 )
if not exist "%CONF_PATH%" ( echo Config not found: %CONF_PATH% & exit /b 1 )

if "%JAVA_OPTS%"=="" set "JAVA_OPTS=-Xmx2048m -Xms512m"

REM Java 17 + Spring LDAP needs this export. Harmless to remove on Java 8.
set "ADD_OPTS=--add-exports java.naming/com.sun.jndi.ldap=ALL-UNNAMED"

echo Starting backend
echo   JAR    : %JAR_PATH%
echo   Config : %CONF_PATH%
echo   DB     : %BASE_DIR%\smartaggregator-db.mv.db
echo   Seed   : %BASE_DIR%\config\data.sql

java %JAVA_OPTS% %ADD_OPTS% -Dloader.path=lib -cp "%JAR_PATH%" ^
  org.springframework.boot.loader.PropertiesLauncher ^
  --spring.config.location="file:%CONF_PATH%" ^
  --spring.datasource.url="jdbc:h2:file:%BASE_DIR%\smartaggregator-db;DB_CLOSE_DELAY=-1" ^
  --spring.datasource.data="file:%BASE_DIR%\config\data.sql" ^
  --spring.datasource.initialization-mode=always ^
  --spring.datasource.continue-on-error=true ^
  --server.port=8080

endlocal
