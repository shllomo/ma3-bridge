# Quick health check for MA3 Bridge

Write-Host "`n🔍 Checking MA3 Bridge Health..." -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health"
    
    Write-Host "`n✅ Bridge is running!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    Write-Host "Bridge Status: " -NoNewline
    if ($health.status -eq "connected") {
        Write-Host $health.status -ForegroundColor Green
    } else {
        Write-Host $health.status -ForegroundColor Yellow
    }
    
    Write-Host "Bridge Service: " -NoNewline
    Write-Host $health.bridge -ForegroundColor Green
    
    Write-Host "`nMA3 Configuration:" -ForegroundColor Yellow
    Write-Host "  Host: $($health.ma3.host)" -ForegroundColor Gray
    Write-Host "  Port: $($health.ma3.port)" -ForegroundColor Gray
    Write-Host "  Connected: " -NoNewline -ForegroundColor Gray
    Write-Host $health.ma3.connected -ForegroundColor $(if($health.ma3.connected){"Green"}else{"Red"})
    
    Write-Host "`nVercel App URL: " -NoNewline
    Write-Host $health.vercelApp -ForegroundColor Cyan
    
    $uptime = [math]::Round($health.uptime)
    $minutes = [math]::Floor($uptime / 60)
    $seconds = $uptime % 60
    Write-Host "Uptime: " -NoNewline
    Write-Host "${minutes}m ${seconds}s" -ForegroundColor Green
    
    Write-Host "`n💡 Note: Even though it shows 'connected', MA3 must be running" -ForegroundColor Yellow
    Write-Host "   with OSC enabled to actually receive scripts." -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Bridge is not running!" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nTo start the bridge:" -ForegroundColor Yellow
    Write-Host "  cd ma3-bridge-local" -ForegroundColor Gray
    Write-Host "  npm start" -ForegroundColor Gray
}