@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LightEat Local Server

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "server\node_modules" (
  echo Installing dependencies ^(first run only^)...
  pushd server
  call npm install
  popd
)

if not exist "node_modules" (
  echo Installing Tailwind CLI ^(first run only^)...
  call npm install
)

if not exist "css\tailwind.css" (
  echo Building Tailwind CSS...
  call npm run build:css
)

echo.
echo Starting LightEat server at http://localhost:3000 ...
echo Keep this window open while using the app.
echo.
start "" http://localhost:3000
node server\server.js

pause
