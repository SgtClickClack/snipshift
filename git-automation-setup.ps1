# Git Automation Setup Script
# This script helps configure Git for automated push/pull operations

Write-Host "=== Git Automation Setup ===" -ForegroundColor Green

# Check if we're in a Git repository
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not in a Git repository!" -ForegroundColor Red
    exit 1
}

Write-Host "Current Git configuration:" -ForegroundColor Yellow
git config --list | Select-String -Pattern "(user|credential|remote)"

Write-Host "`n=== Setup Options ===" -ForegroundColor Green
Write-Host "1. Use Personal Access Token (PAT) - Recommended"
Write-Host "2. Use SSH Key"
Write-Host "3. Configure existing credentials"
Write-Host "4. Test current setup"

$choice = Read-Host "`nSelect option (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n=== Personal Access Token Setup ===" -ForegroundColor Green
        Write-Host "1. Go to GitHub.com → Settings → Developer settings → Personal access tokens"
        Write-Host "2. Generate new token with 'repo' scope"
        Write-Host "3. Copy the token"
        Write-Host "`nAfter creating the token, run:"
        Write-Host "git config credential.helper store" -ForegroundColor Cyan
        Write-Host "git push" -ForegroundColor Cyan
        Write-Host "Enter your GitHub username and use the PAT as password"
    }
    "2" {
        Write-Host "`n=== SSH Key Setup ===" -ForegroundColor Green
        Write-Host "1. Generate SSH key: ssh-keygen -t ed25519 -C 'your-email@example.com'"
        Write-Host "2. Add to SSH agent: ssh-add ~/.ssh/id_ed25519"
        Write-Host "3. Add public key to GitHub: cat ~/.ssh/id_ed25519.pub"
        Write-Host "4. Change remote URL: git remote set-url origin git@github.com:SgtClickClack/snipshift.git"
    }
    "3" {
        Write-Host "`n=== Configure Existing Credentials ===" -ForegroundColor Green
        $username = Read-Host "Enter GitHub username"
        $email = Read-Host "Enter GitHub email"
        
        git config user.name $username
        git config user.email $email
        
        Write-Host "Credentials configured!" -ForegroundColor Green
    }
    "4" {
        Write-Host "`n=== Testing Current Setup ===" -ForegroundColor Green
        Write-Host "Testing git fetch..."
        git fetch --dry-run
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Git fetch works!" -ForegroundColor Green
        } else {
            Write-Host "✗ Git fetch failed" -ForegroundColor Red
        }
    }
    default {
        Write-Host "Invalid option!" -ForegroundColor Red
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "Run 'git-automation.ps1' to perform automated push/pull operations"
