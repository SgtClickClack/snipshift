# Non-Interactive Stripe CLI Setup Script
# Installs and authenticates Stripe CLI without browser intervention

Write-Host "🔧 Stripe CLI Non-Interactive Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Installation
Write-Host "1️⃣  Installing Stripe CLI..." -ForegroundColor Yellow
Write-Host ""

$stripeCli = Get-Command stripe -ErrorAction SilentlyContinue
if ($stripeCli) {
    Write-Host "   ✅ Stripe CLI is already installed" -ForegroundColor Green
    $version = stripe --version 2>&1
    Write-Host "      Version: $version" -ForegroundColor Gray
} else {
    Write-Host "   Installing via winget..." -ForegroundColor Gray
    try {
        winget install stripe.stripe-cli --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Stripe CLI installed successfully" -ForegroundColor Green
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
            Write-Host "   ❌ Installation failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "   Please install manually: winget install stripe.stripe-cli" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "   ❌ Installation error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Please install manually: winget install stripe.stripe-cli" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# Step 2: Read Stripe Secret Key from .env
Write-Host "2️⃣  Reading Stripe Secret Key from .env..." -ForegroundColor Yellow
Write-Host ""

$envFile = "api\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "   ❌ api\.env file not found" -ForegroundColor Red
    Write-Host "   Please create api\.env with STRIPE_SECRET_KEY=sk_test_..." -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content $envFile -Raw
$stripeKeyMatch = [regex]::Match($envContent, "STRIPE_SECRET_KEY\s*=\s*(sk_test_[^\s`r`n]+)")

if (-not $stripeKeyMatch.Success) {
    Write-Host "   ❌ STRIPE_SECRET_KEY not found in api\.env" -ForegroundColor Red
    Write-Host "   Please add: STRIPE_SECRET_KEY=sk_test_..." -ForegroundColor Yellow
    exit 1
}

$stripeSecretKey = $stripeKeyMatch.Groups[1].Value
$keyPreview = $stripeSecretKey.Substring(0, [Math]::Min(20, $stripeSecretKey.Length)) + "..."
Write-Host "   ✅ Found Stripe Secret Key: $keyPreview" -ForegroundColor Green

Write-Host ""

# Step 3: Configure Stripe CLI
Write-Host "3️⃣  Configuring Stripe CLI with API key..." -ForegroundColor Yellow
Write-Host ""

# Stripe CLI uses STRIPE_API_KEY environment variable for non-interactive auth
# We'll set it for the current session and optionally persist it

try {
    # Set environment variable for current session
    $env:STRIPE_API_KEY = $stripeSecretKey
    Write-Host "   ✅ Environment variable set for current session" -ForegroundColor Green
    
    # Try to persist to user environment variables
    try {
        [System.Environment]::SetEnvironmentVariable("STRIPE_API_KEY", $stripeSecretKey, "User")
        Write-Host "   ✅ Environment variable persisted to user profile" -ForegroundColor Green
        Write-Host "   Note: Restart terminal for persistent variable to take effect" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Could not persist to user profile: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Environment variable is set for current session only" -ForegroundColor Gray
    }
    
    # Also try to write to Stripe CLI config file (if it exists or we can create it)
    $stripeConfigDir = Join-Path $env:USERPROFILE ".config\stripe"
    $stripeConfigFile = Join-Path $stripeConfigDir "config.toml"
    
    try {
        if (-not (Test-Path $stripeConfigDir)) {
            New-Item -ItemType Directory -Path $stripeConfigDir -Force | Out-Null
        }
        
        # Read existing config if it exists
        $existingConfig = ""
        if (Test-Path $stripeConfigFile) {
            $existingConfig = Get-Content $stripeConfigFile -Raw
        }
        
        # Write/update config with API key
        if ($existingConfig -match "\[test_mode\]") {
            # Update existing test_mode section
            $configContent = $existingConfig -replace "(?s)\[test_mode\].*?(?=\[|$)", "[test_mode]`r`napi_key = `"$stripeSecretKey`"`r`n"
        } else {
            # Append new test_mode section
            $configContent = $existingConfig + "`r`n[test_mode]`r`napi_key = `"$stripeSecretKey`"`r`n"
        }
        
        Set-Content -Path $stripeConfigFile -Value $configContent.Trim() -Force
        Write-Host "   ✅ Config file updated: $stripeConfigFile" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Could not write config file: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Using environment variable only (this is sufficient)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Configuration error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Verification
Write-Host "4️⃣  Verifying Stripe CLI authentication..." -ForegroundColor Yellow
Write-Host ""

try {
    $statusResult = stripe status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Stripe CLI is authenticated" -ForegroundColor Green
        Write-Host "   Status output:" -ForegroundColor Gray
        Write-Host $statusResult -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Status check returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "   Output: $statusResult" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Status check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   This may be normal if the CLI needs additional setup" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Webhook Tunneling (Optional)
Write-Host "5️⃣  Webhook Tunneling Setup" -ForegroundColor Yellow
Write-Host ""

$startTunnel = Read-Host "Would you like to start webhook tunneling now? (y/n)"
if ($startTunnel -eq "y" -or $startTunnel -eq "Y") {
    Write-Host ""
    Write-Host "   Starting webhook tunnel..." -ForegroundColor Cyan
    Write-Host "   Forwarding to: localhost:5000/api/webhooks/stripe" -ForegroundColor Gray
    Write-Host "   Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Start the tunnel
    stripe listen --forward-to localhost:5000/api/webhooks/stripe
} else {
    Write-Host ""
    Write-Host "   To start webhook tunneling manually, run:" -ForegroundColor Cyan
    $tunnelCmd = "stripe listen --forward-to localhost:5000/api/webhooks/stripe"
    Write-Host "   $tunnelCmd" -ForegroundColor Green
    Write-Host ""
}

Write-Host "✅ Stripe CLI setup complete!" -ForegroundColor Green
Write-Host ""
