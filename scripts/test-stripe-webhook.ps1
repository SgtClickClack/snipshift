# Test Stripe Webhook Locally
# This script helps test webhook reception using Stripe CLI

Write-Host "🔔 Stripe Webhook Testing Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Stripe CLI is installed
Write-Host "Checking for Stripe CLI..." -ForegroundColor Yellow
$stripeCli = Get-Command stripe -ErrorAction SilentlyContinue

if (-not $stripeCli) {
    Write-Host "❌ Stripe CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Stripe CLI:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://stripe.com/docs/stripe-cli" -ForegroundColor Gray
    Write-Host "  2. Or use: scoop install stripe" -ForegroundColor Gray
    Write-Host "  3. Or use: winget install stripe.stripe-cli" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installation, run:" -ForegroundColor Yellow
    Write-Host "  stripe login" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "✅ Stripe CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Stripe CLI login status..." -ForegroundColor Yellow
$loginCheck = stripe config --list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Stripe CLI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run: stripe login" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "✅ Stripe CLI is configured" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "📋 Webhook Testing Instructions:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Start webhook forwarding (in a separate terminal):" -ForegroundColor Yellow
Write-Host "  stripe listen --forward-to localhost:5000/api/webhooks/stripe" -ForegroundColor Green
Write-Host ""
Write-Host "Step 2: In another terminal, trigger test events:" -ForegroundColor Yellow
Write-Host "  stripe trigger identity.verification_session.verified" -ForegroundColor Green
Write-Host "  stripe trigger account.updated" -ForegroundColor Green
Write-Host ""
Write-Host "Step 3: Check your API server logs for webhook reception" -ForegroundColor Yellow
Write-Host ""
Write-Host "Step 4: Verify database update:" -ForegroundColor Yellow
Write-Host "  Run: scripts/verify-stripe-webhook.sql in your database" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start forwarding now
$startForwarding = Read-Host "Would you like to start webhook forwarding now? (y/n)"
if ($startForwarding -eq "y" -or $startForwarding -eq "Y") {
    Write-Host ""
    Write-Host "Starting webhook forwarding..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    stripe listen --forward-to localhost:5000/api/webhooks/stripe
} else {
    Write-Host ""
    $manualRunMsg = 'To start webhook forwarding manually, run:'
    Write-Host $manualRunMsg -ForegroundColor Yellow
    $forwardCommand = 'stripe listen --forward-to localhost:5000/api/webhooks/stripe'
    Write-Host $forwardCommand -ForegroundColor Green
    Write-Host ""
}
