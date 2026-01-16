# Live Mock Webhook Validation Script
# Associates a test user with a mock Stripe account ID and triggers webhook

Write-Host "[TEST] Live Mock Webhook Validation" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$testAccountId = "acct_test_1234567890"
$testEmail = Read-Host "Enter test user email (or press Enter to use first available user)"

Write-Host ""
Write-Host "[1/4] Preparing database..." -ForegroundColor Yellow

# Read database URL from .env
$envFile = "api\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "   [ERROR] api\.env file not found" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile -Raw
$dbUrlMatch = [regex]::Match($envContent, "DATABASE_URL\s*=\s*([^\s`r`n]+)")

if (-not $dbUrlMatch.Success) {
    Write-Host "   [ERROR] DATABASE_URL not found in api\.env" -ForegroundColor Red
    exit 1
}

$databaseUrl = $dbUrlMatch.Groups[1].Value
Write-Host "   [OK] Database URL found" -ForegroundColor Green

# Check if psql is available
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "   [WARN] psql not found. You'll need to run SQL queries manually." -ForegroundColor Yellow
    Write-Host "   Install PostgreSQL client tools or use a database GUI." -ForegroundColor Gray
    Write-Host ""
    Write-Host "   SQL Query to prepare test user:" -ForegroundColor Cyan
    Write-Host "   UPDATE users SET stripe_account_id = '$testAccountId'" -ForegroundColor Green
    if ($testEmail) {
        Write-Host "   WHERE email = '$testEmail';" -ForegroundColor Green
    } else {
        Write-Host "   WHERE id = (SELECT id FROM users LIMIT 1);" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "   [OK] psql found" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Database Preparation SQL:" -ForegroundColor Yellow
Write-Host ""
$updateQuery = "UPDATE users SET stripe_account_id = '$testAccountId'"
if ($testEmail) {
    $updateQuery += " WHERE email = '$testEmail';"
} else {
    $updateQuery += " WHERE id = (SELECT id FROM users WHERE stripe_account_id IS NULL LIMIT 1);"
}
Write-Host "   $updateQuery" -ForegroundColor Green
Write-Host ""
Write-Host "   Run this query in your database before proceeding." -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Have you updated the database? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "   [INFO] Exiting. Run the SQL query and try again." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[3/4] Triggering webhook with account override..." -ForegroundColor Yellow
Write-Host ""

$webhookCmd = "stripe trigger account.updated --override account:id=$testAccountId"
Write-Host "   Command: $webhookCmd" -ForegroundColor Cyan
Write-Host ""

try {
    $result = Invoke-Expression $webhookCmd 2>&1
    Write-Host $result
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   [OK] Webhook triggered successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   [WARN] Webhook trigger returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERROR] Failed to trigger webhook: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/4] Verification SQL:" -ForegroundColor Yellow
Write-Host ""
$verifyQuery = "SELECT email, stripe_account_id, stripe_onboarding_complete, updated_at FROM users WHERE stripe_account_id = '$testAccountId';"
Write-Host "   $verifyQuery" -ForegroundColor Green
Write-Host ""
Write-Host "   Expected result:" -ForegroundColor Cyan
Write-Host "   - stripe_account_id = '$testAccountId'" -ForegroundColor Gray
Write-Host "   - stripe_onboarding_complete = true (if account is fully onboarded)" -ForegroundColor Gray
Write-Host "   - updated_at should reflect recent webhook processing" -ForegroundColor Gray
Write-Host ""

Write-Host "[INFO] Check your API server logs for webhook processing details:" -ForegroundColor Yellow
Write-Host "   [WEBHOOK] Account updated event received for account: $testAccountId" -ForegroundColor Gray
Write-Host "   [WEBHOOK] Found user ... for account $testAccountId" -ForegroundColor Gray
Write-Host "   ✅ Updated Connect account status for user ... - fully onboarded" -ForegroundColor Gray
Write-Host ""

Write-Host "[OK] Test complete! Verify the database update using the SQL query above." -ForegroundColor Green
Write-Host ""
