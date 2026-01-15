# Setup Pusher Environment Variables for Vercel
# This script sets up Pusher credentials for both frontend and backend on Vercel

param(
    [string]$PusherAppId,
    [string]$PusherKey,
    [string]$PusherSecret,
    [string]$PusherCluster = "us2",
    [string[]]$Environments = @("Production", "Preview")
)

Write-Host "🚀 Setting up Pusher environment variables for HospoGo on Vercel" -ForegroundColor Cyan
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

# Prompt for missing values
if (-not $PusherAppId) {
    $PusherAppId = Read-Host "Enter Pusher App ID"
}

if (-not $PusherKey) {
    $PusherKey = Read-Host "Enter Pusher Key"
}

if (-not $PusherSecret) {
    $PusherSecret = Read-Host "Enter Pusher Secret" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PusherSecret)
    $PusherSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if (-not $PusherCluster) {
    $PusherCluster = Read-Host "Enter Pusher Cluster (default: us2)" 
    if ([string]::IsNullOrWhiteSpace($PusherCluster)) {
        $PusherCluster = "us2"
    }
}

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   App ID: $PusherAppId"
Write-Host "   Key: $PusherKey"
Write-Host "   Cluster: $PusherCluster"
Write-Host "   Environments: $($Environments -join ', ')"
Write-Host ""

$confirm = Read-Host "Continue with setup? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 Setting up environment variables..." -ForegroundColor Cyan
Write-Host ""

# Function to set environment variable
function Set-VercelEnv {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Environment
    )
    
    Write-Host "   Setting $Name for $Environment..." -NoNewline
    
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

$success = $true

# Backend variables (for API)
Write-Host "📦 Backend Variables (API):" -ForegroundColor Yellow
foreach ($env in $Environments) {
    Write-Host "   Environment: $env" -ForegroundColor Gray
    
    $success = (Set-VercelEnv -Name "PUSHER_APP_ID" -Value $PusherAppId -Environment $env) -and $success
    $success = (Set-VercelEnv -Name "PUSHER_KEY" -Value $PusherKey -Environment $env) -and $success
    $success = (Set-VercelEnv -Name "PUSHER_SECRET" -Value $PusherSecret -Environment $env) -and $success
    $success = (Set-VercelEnv -Name "PUSHER_CLUSTER" -Value $PusherCluster -Environment $env) -and $success
}

Write-Host ""

# Frontend variables (for React app - must be prefixed with VITE_)
Write-Host "🌐 Frontend Variables (React):" -ForegroundColor Yellow
foreach ($env in $Environments) {
    Write-Host "   Environment: $env" -ForegroundColor Gray
    
    $success = (Set-VercelEnv -Name "VITE_PUSHER_APP_KEY" -Value $PusherKey -Environment $env) -and $success
    $success = (Set-VercelEnv -Name "VITE_PUSHER_CLUSTER" -Value $PusherCluster -Environment $env) -and $success
}

Write-Host ""

if ($success) {
    Write-Host "✅ Successfully set up all Pusher environment variables!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify the variables: vercel env ls" -ForegroundColor White
    Write-Host "   2. Redeploy your application to apply the changes" -ForegroundColor White
    Write-Host "   3. Test real-time features (chat, match invites, territory updates)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Some variables failed to set. Please check the errors above." -ForegroundColor Red
    Write-Host "   You can manually set them using: vercel env add <NAME> <ENVIRONMENT>" -ForegroundColor Yellow
    exit 1
}
