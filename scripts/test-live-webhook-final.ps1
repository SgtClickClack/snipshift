# Live Mock Webhook Validation Script
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

Write-Host "[STEP 2] Creating custom fixture for account.updated..." -ForegroundColor Yellow
Write-Host ""

# Create a temporary fixture file
$fixtureContent = @"
{
  "fixtures": [
    {
      "name": "account",
      "path": "account",
      "method": "post",
      "params": {
        "type": "express",
        "country": "AU",
        "email": "test@example.com",
        "capabilities": {
          "card_payments": {"requested": true},
          "transfers": {"requested": true}
        }
      }
    },
    {
      "name": "update_account",
      "path": "account",
      "method": "post",
      "params": {
        "id": "$testAccountId",
        "details_submitted": true,
        "charges_enabled": true,
        "payouts_enabled": true
      }
    }
  ]
}
"@

$fixtureFile = "stripe-test-fixture.json"
$fixtureContent | Out-File -FilePath $fixtureFile -Encoding UTF8
Write-Host "   [OK] Created fixture file: $fixtureFile" -ForegroundColor Green
Write-Host ""

Write-Host "[STEP 3] Triggering webhook with custom account ID..." -ForegroundColor Yellow
Write-Host ""

# Use the raw fixture approach
Write-Host "Command: stripe trigger account.updated --raw '$fixtureContent'" -ForegroundColor Cyan
Write-Host ""

try {
    # Try using --raw with the fixture
    $result = stripe trigger account.updated --raw $fixtureContent 2>&1
    Write-Host $result
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   [OK] Webhook triggered successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   [INFO] Trying alternative method..." -ForegroundColor Yellow
        
        # Alternative: Use --add to add the account ID after trigger
        Write-Host "   Note: Stripe CLI may not support custom account IDs in test triggers." -ForegroundColor Yellow
        Write-Host "   For real testing, use an actual Stripe account created via your API." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARN] Could not trigger with custom fixture: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   This is expected - Stripe CLI test triggers use fixture data." -ForegroundColor Gray
}

# Cleanup
if (Test-Path $fixtureFile) {
    Remove-Item $fixtureFile -Force
    Write-Host "   [OK] Cleaned up fixture file" -ForegroundColor Green
}

Write-Host ""
Write-Host "[STEP 4] Alternative: Use Real Account for Testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "Since Stripe CLI test triggers don't support custom account IDs," -ForegroundColor Cyan
Write-Host "use one of these approaches:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Create a real test account via your API:" -ForegroundColor Green
Write-Host "  1. Use your venue dashboard to 'Connect with Stripe'" -ForegroundColor Gray
Write-Host "  2. Complete onboarding (or use test mode shortcuts)" -ForegroundColor Gray
Write-Host "  3. Note the account_id created" -ForegroundColor Gray
Write-Host "  4. Update your test user: UPDATE users SET stripe_account_id = '<real_account_id>'" -ForegroundColor Gray
Write-Host "  5. Trigger via Stripe Dashboard or API update" -ForegroundColor Gray
Write-Host ""
Write-Host "Option B: Use Stripe API to update account (triggers webhook):" -ForegroundColor Green
Write-Host "  stripe accounts update $testAccountId --business-profile[name]='Test Update'" -ForegroundColor Gray
Write-Host ""

Write-Host "[STEP 5] Verification SQL:" -ForegroundColor Yellow
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
Write-Host "  [WEBHOOK] Account updated event received for account: ..." -ForegroundColor Gray
Write-Host "  [WEBHOOK] Found user ... for account ..." -ForegroundColor Gray
Write-Host "  ✅ Updated Connect account status for user ... - fully onboarded" -ForegroundColor Gray
Write-Host ""
