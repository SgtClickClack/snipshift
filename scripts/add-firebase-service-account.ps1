# PowerShell script to add Firebase Service Account to Vercel
# Usage: .\scripts\add-firebase-service-account.ps1 -ServiceAccountPath "path\to\service-account.json" -Environment "production"

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceAccountPath,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("production", "preview", "development")]
    [string]$Environment = "production"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Service Account Setup for Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "   Install it with: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Get service account JSON content
$serviceAccountJson = $null

if ($ServiceAccountPath -and (Test-Path $ServiceAccountPath)) {
    Write-Host "📄 Reading service account from file: $ServiceAccountPath" -ForegroundColor Cyan
    try {
        $serviceAccountJson = Get-Content -Path $ServiceAccountPath -Raw -Encoding UTF8
        Write-Host "✅ Service account file loaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to read service account file: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📋 Manual input mode" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please provide the Firebase Service Account JSON:" -ForegroundColor Yellow
    Write-Host "1. Open the service account JSON file in a text editor" -ForegroundColor Gray
    Write-Host "2. Copy the ENTIRE contents (all lines)" -ForegroundColor Gray
    Write-Host "3. Paste it below (press Enter, then Ctrl+Z, then Enter to finish)" -ForegroundColor Gray
    Write-Host ""
    
    # Read multi-line input
    $lines = @()
    Write-Host "Paste JSON content (Ctrl+Z + Enter when done):" -ForegroundColor Yellow
    while ($true) {
        $line = Read-Host
        if ($line -eq $null) { break }
        $lines += $line
    }
    $serviceAccountJson = $lines -join "`n"
}

if ([string]::IsNullOrWhiteSpace($serviceAccountJson)) {
    Write-Host "❌ Service account JSON is empty" -ForegroundColor Red
    exit 1
}

# Validate JSON
try {
    $null = $serviceAccountJson | ConvertFrom-Json
    Write-Host "✅ JSON is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Invalid JSON format: $_" -ForegroundColor Red
    exit 1
}

# Extract project_id for verification
try {
    $serviceAccount = $serviceAccountJson | ConvertFrom-Json
    $projectId = $serviceAccount.project_id
    Write-Host "📦 Project ID from service account: $projectId" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not extract project_id from JSON" -ForegroundColor Yellow
}

Write-Host "🚀 Adding FIREBASE_SERVICE_ACCOUNT to Vercel ($Environment)..." -ForegroundColor Cyan
Write-Host ""

# Use Vercel CLI to add the environment variable
# Note: Vercel CLI will prompt for the value, so we need to pipe it
$serviceAccountJson | vercel env add FIREBASE_SERVICE_ACCOUNT $Environment

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ FIREBASE_SERVICE_ACCOUNT added successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify FIREBASE_PROJECT_ID
    Write-Host "🔍 Verifying FIREBASE_PROJECT_ID..." -ForegroundColor Cyan
    $projectIdCheck = vercel env ls $Environment | Select-String -Pattern "FIREBASE_PROJECT_ID"
    
    if ($projectIdCheck) {
        Write-Host "✅ FIREBASE_PROJECT_ID is set" -ForegroundColor Green
    } else {
        Write-Host "⚠️  FIREBASE_PROJECT_ID not found. Setting it to: $projectId" -ForegroundColor Yellow
        Write-Host "   Run: vercel env add FIREBASE_PROJECT_ID $Environment" -ForegroundColor Yellow
        Write-Host "   Enter: $projectId" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Redeploy: vercel --prod" -ForegroundColor Yellow
    Write-Host "   2. Verify: curl https://hospogo.com/api/debug" -ForegroundColor Yellow
    Write-Host "   3. Check logs: vercel logs hospogo.com --limit=30" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Failed to add environment variable" -ForegroundColor Red
    Write-Host "   Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
