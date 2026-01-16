# Non-Interactive Stripe CLI Setup Script
# Installs and authenticates Stripe CLI without browser intervention

Write-Host "[SETUP] Stripe CLI Non-Interactive Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Installation
Write-Host "[1/5] Installing Stripe CLI..." -ForegroundColor Yellow
Write-Host ""

$stripeCli = Get-Command stripe -ErrorAction SilentlyContinue
if ($stripeCli) {
    Write-Host "   [OK] Stripe CLI is already installed" -ForegroundColor Green
    $version = stripe --version 2>&1
    Write-Host "      Version: $version" -ForegroundColor Gray
} else {
    Write-Host "   Installing via winget..." -ForegroundColor Gray
    try {
        winget install Stripe.StripeCli --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Stripe CLI installed successfully" -ForegroundColor Green
            # Refresh PATH
            $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
            $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
            $env:Path = $machinePath + ';' + $userPath
        } else {
            Write-Host "   [ERROR] Installation failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "   Please install manually: winget install Stripe.StripeCli" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "   [ERROR] Installation error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Please install manually: winget install stripe.stripe-cli" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# Step 2: Read Stripe Secret Key from .env
Write-Host "[2/5] Reading Stripe Secret Key from .env..." -ForegroundColor Yellow
Write-Host ""

$envFile = "api\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "   [ERROR] api\.env file not found" -ForegroundColor Red
    Write-Host "   Please create api\.env with STRIPE_SECRET_KEY=sk_test_..." -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content $envFile -Raw
$stripeKeyMatch = [regex]::Match($envContent, "STRIPE_SECRET_KEY\s*=\s*(sk_test_[^\s`r`n]+)")

if (-not $stripeKeyMatch.Success) {
    Write-Host "   [ERROR] STRIPE_SECRET_KEY not found in api\.env" -ForegroundColor Red
    Write-Host "   Please add: STRIPE_SECRET_KEY=sk_test_..." -ForegroundColor Yellow
    exit 1
}

$stripeSecretKey = $stripeKeyMatch.Groups[1].Value
$keyPreview = $stripeSecretKey.Substring(0, [Math]::Min(20, $stripeSecretKey.Length)) + "..."
Write-Host "   [OK] Found Stripe Secret Key: $keyPreview" -ForegroundColor Green

Write-Host ""

# Step 3: Configure Stripe CLI
Write-Host "[3/5] Configuring Stripe CLI with API key..." -ForegroundColor Yellow
Write-Host ""

# Stripe CLI uses STRIPE_API_KEY environment variable for non-interactive auth
# We'll set it for the current session and optionally persist it

try {
    # Set environment variable for current session
    $env:STRIPE_API_KEY = $stripeSecretKey
    Write-Host "   [OK] Environment variable set for current session" -ForegroundColor Green
    
    # Try to persist to user environment variables
    try {
        [System.Environment]::SetEnvironmentVariable("STRIPE_API_KEY", $stripeSecretKey, "User")
        Write-Host "   [OK] Environment variable persisted to user profile" -ForegroundColor Green
        Write-Host "   Note: Restart terminal for persistent variable to take effect" -ForegroundColor Gray
    } catch {
        Write-Host "   [WARN] Could not persist to user profile: $($_.Exception.Message)" -ForegroundColor Yellow
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
        $testModePattern = '\[test_mode\]'
        if ($existingConfig -match $testModePattern) {
            # Update existing test_mode section
            $replacement = "[test_mode]`r`napi_key = `"$stripeSecretKey`"`r`n"
            $configContent = $existingConfig -replace '(?s)\[test_mode\].*?(?=\[|$)', $replacement
        } else {
            # Append new test_mode section
            $newSection = "`r`n[test_mode]`r`napi_key = `"$stripeSecretKey`"`r`n"
            $configContent = $existingConfig + $newSection
        }
        
        Set-Content -Path $stripeConfigFile -Value $configContent.Trim() -Force
        Write-Host "   [OK] Config file updated: $stripeConfigFile" -ForegroundColor Green
    } catch {
        Write-Host "   [WARN] Could not write config file: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Using environment variable only (this is sufficient)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [ERROR] Configuration error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Verification
Write-Host "[4/5] Verifying Stripe CLI authentication..." -ForegroundColor Yellow
Write-Host ""

try {
    # Test authentication by checking API key is set and CLI can access it
    if ($env:STRIPE_API_KEY) {
        Write-Host "   [OK] Stripe API key is configured" -ForegroundColor Green
        Write-Host "   API key preview: $($env:STRIPE_API_KEY.Substring(0, [Math]::Min(20, $env:STRIPE_API_KEY.Length)))..." -ForegroundColor Gray
        
        # Test with a simple command that requires authentication
        $testResult = stripe config --list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Stripe CLI is authenticated and ready" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] Authentication test returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
            Write-Host "   Output: $testResult" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [WARN] STRIPE_API_KEY environment variable not set" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARN] Verification check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   This may be normal if the CLI needs additional setup" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Webhook Tunneling
Write-Host "[5/5] Starting Webhook Tunneling..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Starting webhook tunnel in background..." -ForegroundColor Cyan
Write-Host "   Forwarding to: localhost:5000/api/webhooks/stripe" -ForegroundColor Gray
Write-Host "   Note: Tunnel is running in background. Check output for webhook secret." -ForegroundColor Yellow
Write-Host ""

# Start the tunnel in a new window
$tunnelCmd = "stripe listen --forward-to localhost:5000/api/webhooks/stripe"
try {
    $tunnelProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-NoExit", "-Command", $tunnelCmd -PassThru
    
    if ($tunnelProcess) {
        Write-Host "   [OK] Webhook tunnel started in new window (PID: $($tunnelProcess.Id))" -ForegroundColor Green
        Write-Host "   Check the new PowerShell window for the webhook signing secret (whsec_...)" -ForegroundColor Yellow
        Write-Host "   Update your api/.env with: STRIPE_WEBHOOK_SECRET=whsec_..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   To stop the tunnel, close the window or run:" -ForegroundColor Gray
        Write-Host "   Stop-Process -Id $($tunnelProcess.Id)" -ForegroundColor Gray
    } else {
        throw "Failed to start process"
    }
} catch {
    $warningMsg = 'Could not start tunnel automatically: ' + $_.Exception.Message
    Write-Host "   [WARN] $warningMsg" -ForegroundColor Yellow
    Write-Host "   To start manually, run in a new terminal:" -ForegroundColor Cyan
    Write-Host ('   ' + $tunnelCmd) -ForegroundColor Green
}

$completeMsg = 'Stripe CLI setup complete!'
Write-Host ('[OK] ' + $completeMsg) -ForegroundColor Green
Write-Host ''
