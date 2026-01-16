# Live Mock Webhook Validation Script (Non-Interactive)
# Associates a test user with a mock Stripe account ID and triggers webhook

Write-Host "[TEST] Live Mock Webhook Validation" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$testAccountId = "acct_test_1234567890"

Write-Host "[STEP 1] Database Preparation SQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this SQL query in your database to prepare a test user:" -ForegroundColor Cyan
Write-Host ""
Write-Host "UPDATE users SET stripe_account_id = '$testAccountId'" -ForegroundColor Green
Write-Host "WHERE id = (SELECT id FROM users WHERE stripe_account_id IS NULL LIMIT 1);" -ForegroundColor Green
Write-Host ""
Write-Host "Or to use a specific email:" -ForegroundColor Gray
Write-Host "UPDATE users SET stripe_account_id = '$testAccountId'" -ForegroundColor Gray
Write-Host "WHERE email = 'your-test-email@example.com';" -ForegroundColor Gray
Write-Host ""

Write-Host "[STEP 2] Triggering webhook with account override..." -ForegroundColor Yellow
Write-Host ""

$webhookCmd = "stripe trigger account.updated --override account:id=$testAccountId"
Write-Host "Command: $webhookCmd" -ForegroundColor Cyan
Write-Host ""

try {
    $result = stripe trigger account.updated --override "account:id=$testAccountId" 2>&1
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
}

Write-Host ""
Write-Host "[STEP 3] Verification SQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this query to verify the database update:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SELECT email, stripe_account_id, stripe_onboarding_complete, updated_at" -ForegroundColor Green
Write-Host "FROM users" -ForegroundColor Green
Write-Host "WHERE stripe_account_id = '$testAccountId';" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "  - stripe_account_id = '$testAccountId'" -ForegroundColor Gray
Write-Host "  - stripe_onboarding_complete = true (if account is fully onboarded)" -ForegroundColor Gray
Write-Host "  - updated_at should reflect recent webhook processing" -ForegroundColor Gray
Write-Host ""

Write-Host "[INFO] Check your API server logs for:" -ForegroundColor Yellow
Write-Host "  [WEBHOOK] Account updated event received for account: $testAccountId" -ForegroundColor Gray
Write-Host "  [WEBHOOK] Found user ... for account $testAccountId" -ForegroundColor Gray
Write-Host "  ✅ Updated Connect account status for user ... - fully onboarded" -ForegroundColor Gray
Write-Host ""
