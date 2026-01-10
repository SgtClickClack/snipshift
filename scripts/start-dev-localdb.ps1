$ErrorActionPreference = "Stop"

Write-Host "Starting HospoGo local dev database + servers..." -ForegroundColor Cyan

$dbUrl = "postgres://dev:dev@localhost:5434/snipshift_dev"

function Wait-Port {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
      if ($null -ne $conn) { return }
    } catch {
      # ignore
    }
    Start-Sleep -Milliseconds 500
  }

  throw "Timed out waiting for port $Port to be listening."
}

Write-Host "Stopping existing dev servers on ports 3000 and 5000 (if any)..." -ForegroundColor Yellow
try {
  $pids = @()
  $pids += (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue)
  $pids += (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue)
  $pids = $pids | Where-Object { $_ -and $_ -ne 0 } | Sort-Object -Unique
  foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
} catch {
  # ignore
}

Write-Host "Starting local Postgres (Docker) on port 5434..." -ForegroundColor Yellow
Push-Location "api"
try {
  npm run dev:db:up | Out-Host
} finally {
  Pop-Location
}

Write-Host "Waiting for Postgres to be reachable..." -ForegroundColor Yellow
Wait-Port -Port 5434 -TimeoutSeconds 90

Write-Host "Syncing schema to local dev DB (drizzle-kit push)..." -ForegroundColor Yellow
$env:DATABASE_URL = $dbUrl
$env:POSTGRES_URL = $dbUrl

Push-Location "api"
try {
  # drizzle-kit push can prompt for confirmation; use the force variant for non-interactive runs
  npm run db:push:force | Out-Host
} finally {
  Pop-Location
}

Write-Host "Starting dev servers with local DB..." -ForegroundColor Green
Write-Host "DATABASE_URL=$dbUrl" -ForegroundColor DarkGray

npm run dev:all


