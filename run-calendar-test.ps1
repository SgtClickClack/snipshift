# Run Calendar E2E Test and Capture Output
Write-Host "Running Calendar E2E Test..." -ForegroundColor Cyan
Write-Host ""

$output = npm run test:e2e -- tests/e2e/professional-calendar.spec.ts -g "should display calendar week view correctly on desktop" --project=chromium --timeout=60000 2>&1

# Save full output
$output | Out-File -FilePath "calendar-test-output.txt" -Encoding UTF8

# Filter for CALENDAR-related logs
Write-Host "=== CALENDAR DIAGNOSTIC LOGS ===" -ForegroundColor Yellow
$output | Select-String -Pattern "CALENDAR|Page content|Calendar elements|error|Error" | ForEach-Object {
    Write-Host $_.Line
}

Write-Host ""
Write-Host "=== FULL OUTPUT SAVED TO: calendar-test-output.txt ===" -ForegroundColor Green

