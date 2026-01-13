# PowerShell script to test the MA3 bridge manually

$script = @'
Printf("=== MA3 Bridge Test ===")
Printf("Time: %s", os.date())
Echo("Bridge is working!")

local fixtures = GetFixtureGroups()
if fixtures then
    Printf("Found %d fixture groups", #fixtures)
else
    Printf("No fixture groups found")
end

Printf("Test complete!")
'@

$body = @{
    script = $script
} | ConvertTo-Json

Write-Host "Testing MA3 Bridge..." -ForegroundColor Yellow
Write-Host "Sending Lua script to bridge..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/test" -Method Post -Body $body -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "`n✅ Success!" -ForegroundColor Green
        Write-Host "Job ID: $($response.job.id)" -ForegroundColor Gray
        Write-Host "Status: $($response.job.status)" -ForegroundColor Gray
        
        if ($response.job.result) {
            Write-Host "`nResult:" -ForegroundColor Yellow
            Write-Host "Success: $($response.job.result.success)" -ForegroundColor Gray
            Write-Host "Output: $($response.job.result.output)" -ForegroundColor Gray
            Write-Host "Execution Time: $($response.job.result.executionTime)ms" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n❌ Failed!" -ForegroundColor Red
        Write-Host $response | ConvertTo-Json
    }
    
    Write-Host "`n👀 Check MA3 Command Line window for script output!" -ForegroundColor Yellow
} catch {
    Write-Host "`n❌ Error calling bridge:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nMake sure the bridge is running on http://localhost:3001" -ForegroundColor Yellow
}