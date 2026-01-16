# Setup Production Environment Variables for HospoGo on Vercel
# This script sets up all production environment variables using Vercel CLI

param(
    [string]$Environment = "production",
    [switch]$Interactive = $false
)

Write-Host "[*] Setting up production environment variables for HospoGo on Vercel" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is available
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Vercel CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Not logged in to Vercel. Please run: vercel login" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Logged in as: $($whoami -split "`n" | Select-Object -Last 1)" -ForegroundColor Green
Write-Host ""

# Function to set environment variable
function Set-VercelEnv {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Environment
    )
    
    Write-Host "   Setting $Name..." -NoNewline
    
    try {
        # Use ProcessStartInfo to properly pipe stdin to vercel CLI
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "vercel"
        $processInfo.Arguments = "env add $Name $Environment --yes"
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardInput = $true
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null
        
        # Write value to stdin
        $process.StandardInput.Write($Value)
        $process.StandardInput.Close()
        
        # Wait for completion
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
            return $true
        } else {
            Write-Host " [FAIL]" -ForegroundColor Red
            if ($error) {
                Write-Host "     $error" -ForegroundColor Red
            }
            return $false
        }
    } catch {
        Write-Host " [FAIL]" -ForegroundColor Red
        Write-Host "     Error: $_" -ForegroundColor Red
        return $false
    }
}

# Define all environment variables from the user's configuration
$envVars = @{
    # Core API Config
    "NODE_ENV" = "production"
    "PORT" = "3001"
    "API_URL" = "https://api.hospogo.com.au"
    "FRONTEND_URL" = "https://app.hospogo.com.au"
    "JWT_SECRET" = "YOUR_SECURE_RANDOM_STRING_MIN_32_CHARS"
    
    # Database
    "DATABASE_URL" = "postgresql://user:password@host:port/dbname?sslmode=require"
    
    # Stripe
    "STRIPE_SECRET_KEY" = "sk_live_..."
    "STRIPE_PUBLISHABLE_KEY" = "pk_live_..."
    "STRIPE_WEBHOOK_SECRET" = "whsec_..."
    
    # Firebase
    "FIREBASE_PROJECT_ID" = "hospogo-prod"
    "FIREBASE_CLIENT_EMAIL" = "..."
    "FIREBASE_PRIVATE_KEY" = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    "FIREBASE_STORAGE_BUCKET" = "hospogo-prod.appspot.com"
    "VAPID_PUBLIC_KEY" = "..."
    
    # Google Maps
    "GOOGLE_MAPS_API_KEY" = "AIzaSy..."
    
    # Cron
    "CRON_SECRET" = "YOUR_SECURE_CRON_TOKEN"
}

# If interactive mode, prompt for values
if ($Interactive) {
    Write-Host "[*] Interactive mode: You will be prompted for each value" -ForegroundColor Yellow
    Write-Host ""
    
    $envVars["JWT_SECRET"] = Read-Host "Enter JWT_SECRET (min 32 chars)"
    $envVars["DATABASE_URL"] = Read-Host "Enter DATABASE_URL"
    $envVars["STRIPE_SECRET_KEY"] = Read-Host "Enter STRIPE_SECRET_KEY (sk_live_...)"
    $envVars["STRIPE_PUBLISHABLE_KEY"] = Read-Host "Enter STRIPE_PUBLISHABLE_KEY (pk_live_...)"
    $envVars["STRIPE_WEBHOOK_SECRET"] = Read-Host "Enter STRIPE_WEBHOOK_SECRET (whsec_...)"
    $envVars["FIREBASE_PROJECT_ID"] = Read-Host "Enter FIREBASE_PROJECT_ID"
    $envVars["FIREBASE_CLIENT_EMAIL"] = Read-Host "Enter FIREBASE_CLIENT_EMAIL"
    
    Write-Host "Enter FIREBASE_PRIVATE_KEY (paste the full key, script will handle formatting):" -ForegroundColor Yellow
    $firebaseKey = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($firebaseKey)
    $firebaseKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    # Replace actual newlines with \n
    $envVars["FIREBASE_PRIVATE_KEY"] = $firebaseKeyPlain -replace "`r?`n", "\n"
    
    $envVars["FIREBASE_STORAGE_BUCKET"] = Read-Host "Enter FIREBASE_STORAGE_BUCKET"
    $envVars["VAPID_PUBLIC_KEY"] = Read-Host "Enter VAPID_PUBLIC_KEY"
    $envVars["GOOGLE_MAPS_API_KEY"] = Read-Host "Enter GOOGLE_MAPS_API_KEY"
    $envVars["CRON_SECRET"] = Read-Host "Enter CRON_SECRET"
}

Write-Host ""
Write-Host "[*] Configuration Summary:" -ForegroundColor Cyan
Write-Host "   Environment: $Environment"
Write-Host "   Variables to set: $($envVars.Count)"
Write-Host ""

# Show which variables have placeholder values
$placeholders = @()
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    if ($value -match "\.\.\.|YOUR_|sk_live_\.\.\.|pk_live_\.\.\.|whsec_\.\.\.") {
        $placeholders += $key
    }
}

if ($placeholders.Count -gt 0 -and -not $Interactive) {
    Write-Host "[!] Warning: The following variables have placeholder values:" -ForegroundColor Yellow
    foreach ($key in $placeholders) {
        Write-Host "   - $key" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "These will be set with placeholder values. Update them manually if needed." -ForegroundColor Yellow
    Write-Host ""
}

$confirm = Read-Host "Continue with setup? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "[X] Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[*] Setting up environment variables..." -ForegroundColor Cyan
Write-Host ""

$success = $true
$setCount = 0
$skipCount = 0

# Set each environment variable
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    
    # Skip placeholder values unless explicitly set
    if (-not $Interactive -and ($value -match "\.\.\.|YOUR_|sk_live_\.\.\.|pk_live_\.\.\.|whsec_\.\.\.")) {
        Write-Host "   Skipping $key (placeholder value)..." -ForegroundColor Gray
        $skipCount++
        continue
    }
    
    if (Set-VercelEnv -Name $key -Value $value -Environment $Environment) {
        $setCount++
    } else {
        $success = $false
    }
}

Write-Host ""
Write-Host "[*] Summary:" -ForegroundColor Cyan
Write-Host "   Set: $setCount" -ForegroundColor Green
if ($skipCount -gt 0) {
    Write-Host "   Skipped (placeholders): $skipCount" -ForegroundColor Yellow
}

Write-Host ""

if ($success) {
    Write-Host "[OK] Successfully set up environment variables!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify the variables: vercel env ls $Environment" -ForegroundColor White
    Write-Host "   2. Update any placeholder values manually if needed" -ForegroundColor White
    Write-Host "   3. Redeploy your application to apply the changes" -ForegroundColor White
    Write-Host ""
    
    if ($skipCount -gt 0) {
        Write-Host "[!] Remember to update placeholder values:" -ForegroundColor Yellow
        foreach ($key in $placeholders) {
            Write-Host "   vercel env add $key $Environment" -ForegroundColor White
        }
        Write-Host ""
    }
} else {
    Write-Host "[X] Some variables failed to set. Please check the errors above." -ForegroundColor Red
    Write-Host '   You can manually set them using: vercel env add NAME ENVIRONMENT' -ForegroundColor Yellow
    exit 1
}
