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

# Stripe CLI stores config in ~/.config/stripe/config.toml
# We'll set the API key via environment variable and config file
$stripeConfigDir = Join-Path $env:USERPROFILE ".config\stripe"
$stripeConfigFile = Join-Path $stripeConfigDir "config.toml"

try {
    # Create config directory if it doesn't exist
    if (-not (Test-Path $stripeConfigDir)) {
        New-Item -ItemType Directory -Path $stripeConfigDir -Force | Out-Null
    }

    # Write config file with API key
    $configContent = @"
[test_mode]
api_key = "$stripeSecretKey"
"@
    
    Set-Content -Path $stripeConfigFile -Value $configContent -Force
    Write-Host "   ✅ Stripe CLI configured successfully" -ForegroundColor Green
    Write-Host "   Config file: $stripeConfigFile" -ForegroundColor Gray
    
    # Also set as environment variable for current session
    $env:STRIPE_API_KEY = $stripeSecretKey
    Write-Host "   ✅ Environment variable set for current session" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Configuration error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Falling back to environment variable only" -ForegroundColor Yellow
    $env:STRIPE_API_KEY = $stripeSecretKey
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
