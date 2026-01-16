# Live Mock Webhook Validation with Real Account
# Creates a real Stripe test account and associates it with a test user

Write-Host "[TEST] Live Mock Webhook Validation (Real Account)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[STEP 1] Create Real Stripe Test Account" -ForegroundColor Yellow
Write-Host ""
Write-Host "Creating a real Stripe Connect Express account via API..." -ForegroundColor Cyan
Write-Host ""

try {
    # Create a real Stripe Connect account
    $createAccountResult = stripe accounts create --type express --country AU --email "test-venue@hospogo.test" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Extract account ID from output (format: "id": "acct_...")
        $accountIdMatch = [regex]::Match($createAccountResult, '"id"\s*:\s*"([^"]+)"')
        
        if ($accountIdMatch.Success) {
            $realAccountId = $accountIdMatch.Groups[1].Value
            Write-Host "   [OK] Created Stripe account: $realAccountId" -ForegroundColor Green
            Write-Host ""
            
            Write-Host "[STEP 2] Update Account to Trigger Webhook" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Updating account to simulate completed onboarding..." -ForegroundColor Cyan
            Write-Host ""
            
            # Update the account to trigger account.updated webhook
            # Note: In test mode, we can't fully enable accounts, but we can trigger the event
            $updateResult = stripe accounts update $realAccountId --email "test-updated@hospogo.test" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] Account updated - webhook should be triggered" -ForegroundColor Green
                Write-Host ""
                
                Write-Host "[STEP 3] Database Preparation SQL:" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Run this SQL query to associate a test user with the account:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "UPDATE users SET stripe_account_id = '$realAccountId'" -ForegroundColor Green
                Write-Host "WHERE id = (SELECT id FROM users WHERE stripe_account_id IS NULL LIMIT 1);" -ForegroundColor Green
                Write-Host ""
                Write-Host "Or to use a specific email:" -ForegroundColor Gray
                Write-Host "UPDATE users SET stripe_account_id = '$realAccountId'" -ForegroundColor Gray
                Write-Host "WHERE email = 'your-test-email@example.com';" -ForegroundColor Gray
                Write-Host ""
                
                Write-Host "[STEP 4] Verification SQL:" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Run this query to verify the database update:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "SELECT email, stripe_account_id, stripe_onboarding_complete, updated_at" -ForegroundColor Green
                Write-Host "FROM users" -ForegroundColor Green
                Write-Host "WHERE stripe_account_id = '$realAccountId';" -ForegroundColor Green
                Write-Host ""
                Write-Host "Expected result:" -ForegroundColor Cyan
                Write-Host "  - stripe_account_id = '$realAccountId'" -ForegroundColor Gray
                Write-Host "  - stripe_onboarding_complete = false (account not fully onboarded in test)" -ForegroundColor Gray
                Write-Host "  - updated_at should reflect recent webhook processing" -ForegroundColor Gray
                Write-Host ""
                Write-Host "[INFO] Check your API server logs for:" -ForegroundColor Yellow
                Write-Host "  [WEBHOOK] Account updated event received for account: $realAccountId" -ForegroundColor Gray
                Write-Host "  [WEBHOOK] Found user ... for account $realAccountId" -ForegroundColor Gray
                Write-Host ""
                Write-Host "[NOTE] In test mode, accounts won't be fully onboarded (charges_enabled=false)." -ForegroundColor Yellow
                Write-Host "       To test full onboarding, complete the actual Stripe Connect flow." -ForegroundColor Yellow
                Write-Host ""
            } else {
                Write-Host "   [WARN] Account update failed: $updateResult" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   [ERROR] Could not extract account ID from response" -ForegroundColor Red
            Write-Host "   Response: $createAccountResult" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [ERROR] Failed to create account: $createAccountResult" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Alternative: Use manual approach:" -ForegroundColor Yellow
        Write-Host "   1. Go to venue dashboard and click 'Connect with Stripe'" -ForegroundColor Gray
        Write-Host "   2. Complete onboarding (or skip in test mode)" -ForegroundColor Gray
        Write-Host "   3. Note the account_id from your database" -ForegroundColor Gray
        Write-Host "   4. Trigger webhook via Stripe Dashboard or API update" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [ERROR] Exception: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
