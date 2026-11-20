@echo off
REM World Conflict setup for Windows: double-click this file.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Install "Node.js 22 LTS" ^(Windows Installer, x64^) from https://nodejs.org
  echo then double-click setup.cmd again.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)
node scripts\setup.mjs %*
echo.
pause
