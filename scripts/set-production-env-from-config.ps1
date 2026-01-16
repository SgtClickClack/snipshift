# Set Production Environment Variables from Configuration
# Usage: .\scripts\set-production-env-from-config.ps1 -ConfigFile .env.production
# Or: .\scripts\set-production-env-from-config.ps1 -Environment production

param(
    [string]$Environment = "production",
    [string]$ConfigFile = $null
)

Write-Host "🚀 Setting up production environment variables for HospoGo" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is available
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Vercel. Please run: vercel login" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Logged in as: $($whoami -split "`n" | Select-Object -Last 1)" -ForegroundColor Green
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
        
        $process.StandardInput.Write($Value)
        $process.StandardInput.Close()
        
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host " ✓" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ✗" -ForegroundColor Red
            if ($error) {
                Write-Host "     $error" -ForegroundColor Red
            }
            return $false
        }
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "     Error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to parse .env file
function Parse-EnvFile {
    param([string]$FilePath)
    
    $envVars = @{}
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ Config file not found: $FilePath" -ForegroundColor Red
        return $null
    }
    
    $lines = Get-Content $FilePath
    foreach ($line in $lines) {
        # Skip comments and empty lines
        if ($line -match "^\s*#" -or $line -match "^\s*$") {
            continue
        }
        
        # Parse KEY=VALUE
        if ($line -match "^\s*([^#=]+?)\s*=\s*(.+?)\s*$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if present
            if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                $value = $matches[1]
            }
            
            $envVars[$key] = $value
        }
    }
    
    return $envVars
}

# Load environment variables
$envVars = @{}

if ($ConfigFile) {
    Write-Host "📄 Loading configuration from: $ConfigFile" -ForegroundColor Cyan
    $envVars = Parse-EnvFile -FilePath $ConfigFile
    if ($null -eq $envVars) {
        exit 1
    }
} else {
    Write-Host "📝 Using inline configuration from script parameters" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  No config file specified. Using default placeholder values." -ForegroundColor Yellow
    Write-Host "   To use a config file, run:" -ForegroundColor Yellow
    Write-Host "   .\scripts\set-production-env-from-config.ps1 -ConfigFile .env.production" -ForegroundColor White
    Write-Host ""
    
    # Use the values provided by the user
    $envVars = @{
        "NODE_ENV" = "production"
        "PORT" = "3001"
        "API_URL" = "https://api.hospogo.com.au"
        "FRONTEND_URL" = "https://app.hospogo.com.au"
        "JWT_SECRET" = "YOUR_SECURE_RANDOM_STRING_MIN_32_CHARS"
        "DATABASE_URL" = "postgresql://user:password@host:port/dbname?sslmode=require"
        "STRIPE_SECRET_KEY" = "sk_live_..."
        "STRIPE_PUBLISHABLE_KEY" = "pk_live_..."
        "STRIPE_WEBHOOK_SECRET" = "whsec_..."
        "FIREBASE_PROJECT_ID" = "hospogo-prod"
        "FIREBASE_CLIENT_EMAIL" = "..."
        "FIREBASE_PRIVATE_KEY" = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
        "FIREBASE_STORAGE_BUCKET" = "hospogo-prod.appspot.com"
        "VAPID_PUBLIC_KEY" = "..."
        "GOOGLE_MAPS_API_KEY" = "AIzaSy..."
        "CRON_SECRET" = "YOUR_SECURE_CRON_TOKEN"
    }
}

Write-Host ""
Write-Host "📋 Configuration Summary:" -ForegroundColor Cyan
Write-Host "   Environment: $Environment"
Write-Host "   Variables to set: $($envVars.Count)"
Write-Host ""

# Filter out placeholder values
$placeholders = @()
$validVars = @{}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    if ($value -match "\.\.\.|YOUR_|sk_live_\.\.\.|pk_live_\.\.\.|whsec_\.\.\.") {
        $placeholders += $key
    } else {
        $validVars[$key] = $value
    }
}

if ($placeholders.Count -gt 0) {
    Write-Host "⚠️  Skipping $($placeholders.Count) variables with placeholder values:" -ForegroundColor Yellow
    foreach ($key in $placeholders) {
        Write-Host "   - $key" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($validVars.Count -eq 0) {
    Write-Host "❌ No valid environment variables to set (all are placeholders)" -ForegroundColor Red
    Write-Host "   Please update your config file with actual values" -ForegroundColor Yellow
    exit 1
}

$confirm = Read-Host "Continue setting $($validVars.Count) environment variables? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 Setting up environment variables..." -ForegroundColor Cyan
Write-Host ""

$success = $true
$setCount = 0

foreach ($key in $validVars.Keys) {
    $value = $validVars[$key]
    
    if (Set-VercelEnv -Name $key -Value $value -Environment $Environment) {
        $setCount++
    } else {
        $success = $false
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Set: $setCount" -ForegroundColor Green
if ($placeholders.Count -gt 0) {
    Write-Host "   Skipped (placeholders): $($placeholders.Count)" -ForegroundColor Yellow
}

Write-Host ""

if ($success) {
    Write-Host "✅ Successfully set up environment variables!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify: vercel env ls $Environment" -ForegroundColor White
    if ($placeholders.Count -gt 0) {
        Write-Host "   2. Set remaining variables manually:" -ForegroundColor White
        foreach ($key in $placeholders) {
            Write-Host "      vercel env add $key $Environment" -ForegroundColor Gray
        }
    }
    Write-Host "   3. Redeploy your application" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Some variables failed to set. Check errors above." -ForegroundColor Red
    exit 1
}
