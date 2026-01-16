# Quick script to check Stripe Connect status for a user
# Usage: .\scripts\check-stripe-status.ps1 -Email "user@example.com"

param(
    [Parameter(Mandatory=$false)]
    [string]$Email
)

Write-Host "🔍 Checking Stripe Connect Status" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if API is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ API server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ API server is not running on port 5000" -ForegroundColor Red
    Write-Host "   Please start the API server first" -ForegroundColor Yellow
    exit 1
}

if ($Email) {
    Write-Host "Checking status for: $Email" -ForegroundColor Yellow
    Write-Host ""
    
    # Note: This would require authentication. In a real scenario, you'd need to:
    # 1. Get a valid auth token
    # 2. Call GET /api/stripe-connect/account/status with the token
    
    Write-Host "To check status via API:" -ForegroundColor Cyan
    Write-Host "  1. Log in as the user" -ForegroundColor Gray
    Write-Host "  2. Navigate to: http://localhost:5173/venue/dashboard" -ForegroundColor Gray
    Write-Host "  3. Check the Stripe Connect banner status" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "To check a specific user's status:" -ForegroundColor Yellow
    Write-Host "  .\scripts\check-stripe-status.ps1 -Email 'user@example.com'" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Database Query (run in PostgreSQL):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SELECT email, stripe_account_id, stripe_onboarding_complete, updated_at" -ForegroundColor Gray
Write-Host "  FROM users" -ForegroundColor Gray
if ($Email) {
    Write-Host "  WHERE email = '$Email';" -ForegroundColor Gray
} else {
    Write-Host "  WHERE stripe_account_id IS NOT NULL" -ForegroundColor Gray
    Write-Host "  ORDER BY updated_at DESC" -ForegroundColor Gray
    Write-Host "  LIMIT 10;" -ForegroundColor Gray
}
Write-Host ""
