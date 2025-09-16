@echo off
setlocal enabledelayedexpansion

REM Deployment Script for SnipShift (Windows)
REM Handles different deployment scenarios (Replit, Docker, etc.)

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

if not exist "snipshift-next" (
    echo [ERROR] snipshift-next directory not found
    exit /b 1
)

REM Function to build the API
:build_api
echo [INFO] Building API...
cd snipshift-next\api

echo [INFO] Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

echo [INFO] Compiling TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build API
    exit /b 1
)

REM Verify build
if exist "dist\index.js" (
    echo [SUCCESS] API build completed successfully
) else (
    echo [ERROR] API build failed - dist\index.js not found
    exit /b 1
)

cd ..\..

REM Main script logic
if "%1"=="replit" goto :deploy_replit
if "%1"=="docker" goto :deploy_docker
if "%1"=="local" goto :deploy_local
if "%1"=="build" goto :end
if "%1"=="help" goto :show_help
if "%1"=="" goto :show_help
goto :show_help

:deploy_replit
echo [INFO] Deploying to Replit...

REM Check if .replit file exists
if not exist ".replit" (
    echo [ERROR] .replit file not found
    exit /b 1
)

call :build_api
echo [SUCCESS] Replit deployment configuration updated
echo [INFO] The deployment will use: npm run start:container
echo [WARNING] Make sure to trigger deployment from Replit dashboard
goto :end

:deploy_docker
echo [INFO] Deploying with Docker...

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

call :build_api

echo [INFO] Starting production services...
cd snipshift-next
docker-compose -f docker-compose.prod.yml up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker services
    exit /b 1
)

cd ..
echo [SUCCESS] Docker deployment completed
echo [INFO] API should be available at http://localhost:4000
goto :end

:deploy_local
echo [INFO] Deploying locally for development...

call :build_api

echo [INFO] Starting development services...
cd snipshift-next
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start development services
    exit /b 1
)

REM Wait for services to be ready
echo [INFO] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Starting API in development mode...
cd api
start "SnipShift API" cmd /k "npm run dev"

cd ..\..
echo [SUCCESS] Local development deployment completed
echo [INFO] API should be available at http://localhost:4000
echo [INFO] Web should be available at http://localhost:3000
goto :end

:show_help
echo SnipShift Deployment Script (Windows)
echo.
echo Usage: %0 [OPTION]
echo.
echo Options:
echo   replit     Deploy to Replit (production)
echo   docker     Deploy with Docker (production)
echo   local      Deploy locally for development
echo   build      Only build the API
echo   help       Show this help message
echo.
echo Examples:
echo   %0 replit    # Deploy to Replit
echo   %0 docker    # Deploy with Docker
echo   %0 local     # Start local development
echo   %0 build     # Just build the API
goto :end

:end
echo.
echo Deployment script completed.
