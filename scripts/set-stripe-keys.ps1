<#
  Securely set Stripe keys for local development without putting secrets in command history.

  What it does:
  - Prompts for Stripe publishable + secret key (secret is entered as SecureString)
  - Writes/updates:
    - .\.env                  (frontend build env)
    - .\api\.env              (backend env)
  - Ensures variables:
    - VITE_STRIPE_PUBLISHABLE_KEY
    - STRIPE_SECRET_KEY

  Usage:
    powershell -ExecutionPolicy Bypass -File .\scripts\set-stripe-keys.ps1

  Notes:
  - These files are already in .gitignore. Do not commit them.
#>

$ErrorActionPreference = "Stop"

function ConvertTo-PlainText([Security.SecureString]$Secure) {
  $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
  }
}

function Upsert-EnvVar([string]$FilePath, [string]$Key, [string]$Value) {
  if (-not (Test-Path -LiteralPath $FilePath)) {
    New-Item -ItemType File -Path $FilePath -Force | Out-Null
  }

  $lines = Get-Content -LiteralPath $FilePath -ErrorAction SilentlyContinue
  if ($null -eq $lines) { $lines = @() }

  $pattern = "^\s*{0}\s*=" -f [Regex]::Escape($Key)
  $idx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) { $idx = $i; break }
  }

  $newLine = "{0}={1}" -f $Key, $Value
  if ($idx -ge 0) {
    $lines[$idx] = $newLine
  } else {
    # Keep a small separator for readability if file already has content
    if ($lines.Count -gt 0 -and ($lines[-1].Trim() -ne "")) {
      $lines += ""
    }
    $lines += $newLine
  }

  Set-Content -LiteralPath $FilePath -Value $lines -Encoding UTF8
}

Write-Host ""
Write-Host "Snipshift - Set Stripe Keys (local)" -ForegroundColor Cyan
Write-Host "This will update .env and api/.env (both are gitignored)." -ForegroundColor DarkGray
Write-Host ""

$publishable = Read-Host "Enter Stripe Publishable Key (pk_...)"
$secretSecure = Read-Host "Enter Stripe Secret Key (sk_...)" -AsSecureString
$secret = ConvertTo-PlainText $secretSecure

if ([string]::IsNullOrWhiteSpace($publishable) -or -not $publishable.Trim().StartsWith("pk_")) {
  throw "Publishable key must start with pk_."
}
if ([string]::IsNullOrWhiteSpace($secret) -or -not $secret.Trim().StartsWith("sk_")) {
  throw "Secret key must start with sk_."
}

$rootEnv = Join-Path (Get-Location) ".env"
$apiEnv = Join-Path (Get-Location) "api\.env"

Upsert-EnvVar -FilePath $rootEnv -Key "VITE_STRIPE_PUBLISHABLE_KEY" -Value $publishable.Trim()
Upsert-EnvVar -FilePath $apiEnv -Key "STRIPE_SECRET_KEY" -Value $secret.Trim()

Write-Host ""
Write-Host "Updated:" -ForegroundColor Green
Write-Host " - .env: VITE_STRIPE_PUBLISHABLE_KEY=pk_***"
Write-Host " - api/.env: STRIPE_SECRET_KEY=sk_***"
Write-Host ""
