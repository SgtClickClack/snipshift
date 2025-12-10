# Script to start server and capture logs
$logFile = "server-logs.txt"

Write-Host "Starting server and capturing logs to $logFile..."
Write-Host "Press Ctrl+C to stop the server"

# Start server and redirect output to file
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start 2>&1 | Tee-Object -FilePath $logFile"

Write-Host "Server started. Waiting 5 seconds for it to initialize..."
Start-Sleep -Seconds 5

Write-Host "Running test endpoints..."
node test-endpoints.js

Write-Host "`nWaiting 2 seconds for logs to flush..."
Start-Sleep -Seconds 2

Write-Host "`n=== SERVER LOGS (last 100 lines) ==="
Get-Content $logFile -Tail 100

Write-Host "`n=== Full log file: $logFile ==="

