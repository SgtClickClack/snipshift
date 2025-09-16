# Git Automation Script
# Automated push and pull operations without user interaction

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("push", "pull", "sync", "status")]
    [string]$Action = "status",
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$Quiet
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-GitRepository {
    if (-not (Test-Path ".git")) {
        Write-ColorOutput "Error: Not in a Git repository!" $ErrorColor
        return $false
    }
    return $true
}

function Get-CurrentBranch {
    $branch = git branch --show-current
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Error: Could not determine current branch" $ErrorColor
        return $null
    }
    return $branch
}

function Invoke-GitPull {
    param([string]$TargetBranch = "")
    
    Write-ColorOutput "=== Pulling Changes ===" $InfoColor
    
    if ($TargetBranch) {
        Write-ColorOutput "Pulling from branch: $TargetBranch" $InfoColor
        $result = git pull origin $TargetBranch
    } else {
        $currentBranch = Get-CurrentBranch
        if (-not $currentBranch) { return $false }
        
        Write-ColorOutput "Pulling from current branch: $currentBranch" $InfoColor
        $result = git pull origin $currentBranch
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Pull successful!" $SuccessColor
        if (-not $Quiet) {
            Write-ColorOutput $result $InfoColor
        }
        return $true
    } else {
        Write-ColorOutput "✗ Pull failed!" $ErrorColor
        Write-ColorOutput $result $ErrorColor
        return $false
    }
}

function Invoke-GitPush {
    param([string]$TargetBranch = "", [bool]$ForcePush = $false)
    
    Write-ColorOutput "=== Pushing Changes ===" $InfoColor
    
    if ($TargetBranch) {
        Write-ColorOutput "Pushing to branch: $TargetBranch" $InfoColor
        if ($ForcePush) {
            $result = git push origin $TargetBranch --force
        } else {
            $result = git push origin $TargetBranch
        }
    } else {
        $currentBranch = Get-CurrentBranch
        if (-not $currentBranch) { return $false }
        
        Write-ColorOutput "Pushing to current branch: $currentBranch" $InfoColor
        if ($ForcePush) {
            $result = git push origin $currentBranch --force
        } else {
            $result = git push origin $currentBranch
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Push successful!" $SuccessColor
        if (-not $Quiet) {
            Write-ColorOutput $result $InfoColor
        }
        return $true
    } else {
        Write-ColorOutput "✗ Push failed!" $ErrorColor
        Write-ColorOutput $result $ErrorColor
        return $false
    }
}

function Show-GitStatus {
    Write-ColorOutput "=== Git Status ===" $InfoColor
    
    # Show current branch
    $currentBranch = Get-CurrentBranch
    Write-ColorOutput "Current branch: $currentBranch" $InfoColor
    
    # Show status
    $status = git status --porcelain
    if ($status) {
        Write-ColorOutput "`nModified files:" $WarningColor
        Write-ColorOutput $status $WarningColor
    } else {
        Write-ColorOutput "Working directory clean" $SuccessColor
    }
    
    # Show remote info
    $remote = git remote -v
    Write-ColorOutput "`nRemote repositories:" $InfoColor
    Write-ColorOutput $remote $InfoColor
    
    # Show last commit
    $lastCommit = git log -1 --oneline
    Write-ColorOutput "`nLast commit:" $InfoColor
    Write-ColorOutput $lastCommit $InfoColor
}

function Invoke-GitSync {
    param([string]$TargetBranch = "")
    
    Write-ColorOutput "=== Syncing Repository ===" $InfoColor
    
    # First, pull changes
    $pullSuccess = Invoke-GitPull -TargetBranch $TargetBranch
    if (-not $pullSuccess) {
        Write-ColorOutput "Sync failed during pull phase" $ErrorColor
        return $false
    }
    
    # Then, push any local changes
    $pushSuccess = Invoke-GitPush -TargetBranch $TargetBranch
    if (-not $pushSuccess) {
        Write-ColorOutput "Sync failed during push phase" $ErrorColor
        return $false
    }
    
    Write-ColorOutput "✓ Sync completed successfully!" $SuccessColor
    return $true
}

# Main execution
if (-not (Test-GitRepository)) {
    exit 1
}

# Set default branch if not specified
if (-not $Branch) {
    $Branch = Get-CurrentBranch
}

Write-ColorOutput "Git Automation Script" $InfoColor
Write-ColorOutput "Action: $Action" $InfoColor
Write-ColorOutput "Branch: $Branch" $InfoColor
Write-ColorOutput "Force: $Force" $InfoColor
Write-ColorOutput ""

switch ($Action.ToLower()) {
    "pull" {
        $success = Invoke-GitPull -TargetBranch $Branch
        exit $(if ($success) { 0 } else { 1 })
    }
    "push" {
        $success = Invoke-GitPush -TargetBranch $Branch -ForcePush $Force
        exit $(if ($success) { 0 } else { 1 })
    }
    "sync" {
        $success = Invoke-GitSync -TargetBranch $Branch
        exit $(if ($success) { 0 } else { 1 })
    }
    "status" {
        Show-GitStatus
        exit 0
    }
    default {
        Write-ColorOutput "Invalid action: $Action" $ErrorColor
        Write-ColorOutput "Valid actions: push, pull, sync, status" $ErrorColor
        exit 1
    }
}