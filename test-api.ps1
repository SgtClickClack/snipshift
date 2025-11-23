# Quick API Verification Script
# Run this after starting the API server with: cd api && npm start

Write-Host "Testing API Server..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Debug Endpoint
Write-Host "1. Testing /api/debug endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/debug" -Method GET -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Database: $($json.services.database.status)" -ForegroundColor $(if ($json.services.database.status -eq "pool_initialized") { "Green" } else { "Yellow" })
    Write-Host "   Firebase: $($json.services.firebase.initialized)" -ForegroundColor $(if ($json.services.firebase.initialized) { "Green" } else { "Yellow" })
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure the API server is running on port 5000" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Register Endpoint (should work without auth)
Write-Host "2. Testing /api/register endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        email = "test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        name = "Test User"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   User ID: $($json.id)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 409) { "Yellow" } else { "Red" })
    Write-Host "   Response: $($_.Exception.Message)" -ForegroundColor $(if ($statusCode -eq 409) { "Yellow" } else { "Red" })
}

Write-Host ""

# Test 3: /api/me without auth (should return 401, not crash)
Write-Host "3. Testing /api/me without auth (should return 401)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/me" -Method GET -UseBasicParsing
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   Status: 401 (Expected - Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "   Status: $statusCode" -ForegroundColor Red
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Verification complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the responses above" -ForegroundColor White
Write-Host "  2. Check that all endpoints return JSON (not crashes)" -ForegroundColor White
Write-Host "  3. Verify environment variables are set correctly" -ForegroundColor White
Write-Host "  4. See VERIFICATION_CHECKLIST.md for deployment steps" -ForegroundColor White

