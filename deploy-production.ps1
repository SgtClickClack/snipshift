# Production Deployment Script for Snipshift (PowerShell)
# This script automates the production deployment process

$ErrorActionPreference = "Stop"

Write-Host "🚀 Snipshift Production Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create .env.production file with your production configuration." -ForegroundColor Yellow
    Write-Host "You can use PRODUCTION_DEPLOYMENT.md as a reference." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found .env.production file" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 1: Build production images
Write-Host "📦 Step 1: Building production images..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Start services
Write-Host "🚀 Step 2: Starting services..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services started" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start services!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Wait for services to be healthy
Write-Host "⏳ Step 3: Waiting for services to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check API health
Write-Host "Checking API health..." -ForegroundColor Cyan
$apiHealthy = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ API is healthy" -ForegroundColor Green
            $apiHealthy = $true
            break
        }
    } catch {
        if ($i -eq 30) {
            Write-Host "⚠️  API health check timeout. Check logs with: docker-compose -f docker-compose.prod.yml logs -f api" -ForegroundColor Yellow
        } else {
            Write-Host "   Waiting for API... ($i/30)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host ""

# Step 4: Show status
Write-Host "📊 Step 4: Service Status" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Promote your user to admin:"
Write-Host "   docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts <your-email>"
Write-Host ""
Write-Host "2. View logs:"
Write-Host "   docker-compose -f docker-compose.prod.yml logs -f"
Write-Host ""
Write-Host "3. Test the application:"
Write-Host "   - Frontend: http://localhost:3000"
Write-Host "   - API: http://localhost:5000/health"
Write-Host ""
