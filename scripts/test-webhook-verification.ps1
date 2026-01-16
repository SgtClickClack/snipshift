# Stripe Webhook Integration Test Verification Script
# Verifies that webhook events are received and processed correctly

Write-Host "[TEST] Stripe Webhook Integration Verification" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check API server is running
Write-Host "[1/3] Checking API server status..." -ForegroundColor Yellow
$apiPort = 5000
$portCheck = netstat -ano | Select-String ":$apiPort" | Select-Object -First 1

if ($portCheck) {
    Write-Host "   [OK] API server appears to be running on port $apiPort" -ForegroundColor Green
} else {
    Write-Host "   [WARN] API server may not be running on port $apiPort" -ForegroundColor Yellow
    Write-Host "   Start the API server: cd api && npm start" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Check webhook tunnel is running
Write-Host "[2/3] Checking webhook tunnel status..." -ForegroundColor Yellow
$stripeListen = Get-Process | Where-Object { $_.ProcessName -eq "powershell" -and $_.CommandLine -like "*stripe listen*" } | Select-Object -First 1

if ($stripeListen) {
    Write-Host "   [OK] Stripe webhook tunnel is running (PID: $($stripeListen.Id))" -ForegroundColor Green
} else {
    Write-Host "   [WARN] Stripe webhook tunnel may not be running" -ForegroundColor Yellow
    Write-Host "   Start tunnel: stripe listen --forward-to localhost:$apiPort/api/webhooks/stripe" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Instructions for manual verification
Write-Host "[3/3] Manual Verification Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Trigger a test webhook event:" -ForegroundColor Cyan
Write-Host "      stripe trigger account.updated" -ForegroundColor Green
Write-Host ""
Write-Host "   2. Check API server console logs for:" -ForegroundColor Cyan
Write-Host "      [WEBHOOK] Account updated event received" -ForegroundColor Gray
Write-Host "      ✅ Updated Connect account status for user ... - fully onboarded" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Verify database update (run SQL query):" -ForegroundColor Cyan
Write-Host "      SELECT id, email, stripe_account_id, stripe_onboarding_complete, updated_at" -ForegroundColor Gray
Write-Host "      FROM users" -ForegroundColor Gray
Write-Host "      WHERE stripe_account_id IS NOT NULL" -ForegroundColor Gray
Write-Host "      ORDER BY updated_at DESC;" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Expected result:" -ForegroundColor Cyan
Write-Host "      - Webhook returns 200 OK response" -ForegroundColor Gray
Write-Host "      - API logs show successful processing" -ForegroundColor Gray
Write-Host "      - Database shows stripe_onboarding_complete = true (if account is fully onboarded)" -ForegroundColor Gray
Write-Host ""

Write-Host "[INFO] Note: Test events from Stripe CLI may not match existing accounts in your database." -ForegroundColor Yellow
Write-Host "       For real testing, use a user account with a valid stripe_account_id." -ForegroundColor Yellow
Write-Host ""
