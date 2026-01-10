@echo off
echo Starting HospoGo Development Servers...
echo.

start "HospoGo API Server" cmd /k "cd api && npm start"
timeout /t 2 /nobreak >nul

start "HospoGo Frontend" cmd /k "npm run dev"

echo.
echo Servers are starting in separate windows.
echo.
echo Frontend: http://localhost:3002
echo API: http://localhost:5000
echo.
echo Press any key to exit this window (servers will continue running)...
pause >nul

