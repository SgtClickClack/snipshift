# Git Automation Batch Script (Windows CMD)
# Alternative to PowerShell script for automated operations

@echo off
setlocal enabledelayedexpansion

REM Check if we're in a Git repository
if not exist ".git" (
    echo Error: Not in a Git repository!
    exit /b 1
)

REM Parse command line arguments
set ACTION=%1
set BRANCH=%2
set FORCE=%3

if "%ACTION%"=="" set ACTION=status
if "%BRANCH%"=="" (
    for /f "tokens=*" %%i in ('git branch --show-current') do set BRANCH=%%i
)

echo Git Automation Script
echo Action: %ACTION%
echo Branch: %BRANCH%
echo Force: %FORCE%
echo.

if "%ACTION%"=="pull" goto :pull
if "%ACTION%"=="push" goto :push
if "%ACTION%"=="sync" goto :sync
if "%ACTION%"=="status" goto :status
goto :invalid

:pull
echo === Pulling Changes ===
echo Pulling from branch: %BRANCH%
git pull origin %BRANCH%
if %errorlevel% equ 0 (
    echo ✓ Pull successful!
) else (
    echo ✗ Pull failed!
    exit /b 1
)
goto :end

:push
echo === Pushing Changes ===
echo Pushing to branch: %BRANCH%
if "%FORCE%"=="--force" (
    git push origin %BRANCH% --force
) else (
    git push origin %BRANCH%
)
if %errorlevel% equ 0 (
    echo ✓ Push successful!
) else (
    echo ✗ Push failed!
    exit /b 1
)
goto :end

:sync
echo === Syncing Repository ===
echo Pulling changes...
git pull origin %BRANCH%
if %errorlevel% neq 0 (
    echo Sync failed during pull phase
    exit /b 1
)
echo Pushing changes...
if "%FORCE%"=="--force" (
    git push origin %BRANCH% --force
) else (
    git push origin %BRANCH%
)
if %errorlevel% neq 0 (
    echo Sync failed during push phase
    exit /b 1
)
echo ✓ Sync completed successfully!
goto :end

:status
echo === Git Status ===
for /f "tokens=*" %%i in ('git branch --show-current') do echo Current branch: %%i
echo.
echo Working directory status:
git status --porcelain
echo.
echo Remote repositories:
git remote -v
echo.
echo Last commit:
git log -1 --oneline
goto :end

:invalid
echo Invalid action: %ACTION%
echo Valid actions: push, pull, sync, status
echo Usage: git-automation.bat [action] [branch] [--force]
echo Examples:
echo   git-automation.bat pull
echo   git-automation.bat push main
echo   git-automation.bat sync develop --force
exit /b 1

:end
echo.
echo Automation completed.
