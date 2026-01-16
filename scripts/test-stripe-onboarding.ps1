# Stripe Connect Onboarding Test Verification Script
# This script helps verify the complete Stripe Connect onboarding flow

Write-Host "🔍 Stripe Connect Onboarding Test Verification" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Environment Check
Write-Host "1️⃣  Checking Environment Variables..." -ForegroundColor Yellow
Write-Host ""

$envFile = "api\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    $hasStripeKey = $envContent -match "STRIPE_SECRET_KEY\s*=\s*sk_test_"
    $hasWebhookSecret = $envContent -match "STRIPE_WEBHOOK_SECRET\s*="
    
    if ($hasStripeKey) {
        Write-Host "   ✅ STRIPE_SECRET_KEY found (test key)" -ForegroundColor Green
        $stripeKeyMatch = [regex]::Match($envContent, "STRIPE_SECRET_KEY\s*=\s*(sk_test_[^\s`r`n]+)")
        if ($stripeKeyMatch.Success) {
            $keyPreview = $stripeKeyMatch.Groups[1].Value.Substring(0, [Math]::Min(20, $stripeKeyMatch.Groups[1].Value.Length)) + "..."
            Write-Host "      Key: $keyPreview" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ STRIPE_SECRET_KEY not found or not a test key (sk_test_...)" -ForegroundColor Red
        Write-Host "      Please set STRIPE_SECRET_KEY=sk_test_... in api/.env" -ForegroundColor Yellow
    }
    
    if ($hasWebhookSecret) {
        Write-Host "   ✅ STRIPE_WEBHOOK_SECRET found" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  STRIPE_WEBHOOK_SECRET not found" -ForegroundColor Yellow
        Write-Host "      This is needed for webhook verification" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ api/.env file not found" -ForegroundColor Red
    Write-Host "      Please create api/.env with STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET" -ForegroundColor Yellow
}

Write-Host ""

# 2. Database Connection Check
Write-Host "2️⃣  Checking Database Connection..." -ForegroundColor Yellow
Write-Host ""

try {
    $dbMatch = Get-Content $envFile -Raw | Select-String -Pattern "DATABASE_URL\s*=\s*([^\s`r`n]+)"
    if ($dbMatch) {
        $dbUrl = $dbMatch.Matches.Groups[1].Value
        Write-Host "   ✅ DATABASE_URL found" -ForegroundColor Green
        $previewLength = [Math]::Min(30, $dbUrl.Length)
        Write-Host "      Connection: $($dbUrl.Substring(0, $previewLength))..." -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  DATABASE_URL not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not read DATABASE_URL" -ForegroundColor Yellow
}

Write-Host ""

# 3. API Server Check
Write-Host "3️⃣  Checking API Server Status..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API server is running on port 5000" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  API server not responding on port 5000" -ForegroundColor Yellow
    Write-Host "      Make sure the server is running: cd api; npm start" -ForegroundColor Gray
}

Write-Host ""

# 4. Frontend Server Check
Write-Host "4️⃣  Checking Frontend Server Status..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend server is running on port 5173" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Frontend server not responding on port 5173" -ForegroundColor Yellow
    Write-Host "      Make sure the frontend is running: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# 5. Test Instructions
Write-Host "5️⃣  Manual Test Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   📋 Step 1: Navigate to venue dashboard" -ForegroundColor Cyan
Write-Host "      URL: http://localhost:5173/venue/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 Step 2: Look for the orange 'Incomplete' banner" -ForegroundColor Cyan
Write-Host "      You should see: 'Connect with Stripe' button" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 Step 3: Click 'Connect with Stripe'" -ForegroundColor Cyan
Write-Host "      Expected: Redirect to connect.stripe.com/setup/s/..." -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 Step 4: Complete Stripe onboarding (or use test mode)" -ForegroundColor Cyan
Write-Host "      Use Stripe test data: https://stripe.com/docs/testing" -ForegroundColor Gray
Write-Host ""

# 6. Webhook Testing Instructions
Write-Host "6️⃣  Webhook Testing:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   📋 Option A: Use Stripe CLI (Recommended)" -ForegroundColor Cyan
Write-Host "      Install: https://stripe.com/docs/stripe-cli" -ForegroundColor Gray
Write-Host "      Login: stripe login" -ForegroundColor Gray
Write-Host "      Forward webhooks: stripe listen --forward-to localhost:5000/api/webhooks/stripe" -ForegroundColor Gray
Write-Host "      Trigger event: stripe trigger identity.verification_session.verified" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 Option B: Use Stripe Dashboard" -ForegroundColor Cyan
Write-Host "      1. Go to https://dashboard.stripe.com/test/webhooks" -ForegroundColor Gray
Write-Host "      2. Add endpoint: http://localhost:5000/api/webhooks/stripe" -ForegroundColor Gray
Write-Host "      3. Select event: identity.verification_session.verified" -ForegroundColor Gray
Write-Host "      4. Send test webhook" -ForegroundColor Gray
Write-Host ""

# 7. Database Verification Query
Write-Host "7️⃣  Database Verification:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Run this SQL query to check user status:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   SELECT id, email, stripe_account_id, stripe_onboarding_complete" -ForegroundColor Gray
Write-Host "   FROM users" -ForegroundColor Gray
Write-Host "   WHERE stripe_account_id IS NOT NULL;" -ForegroundColor Gray
Write-Host ""
Write-Host "   Expected: stripe_onboarding_complete should be true after webhook" -ForegroundColor Gray
Write-Host ""

Write-Host "Test verification script complete!" -ForegroundColor Green
Write-Host ""
