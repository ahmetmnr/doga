# Port temizleme ve uygulama baslatma scripti
Write-Host "Port temizleme basliyor..." -ForegroundColor Yellow

# Node.js process'lerini kapat
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 3000 ve 3001 portlarini kullanan process'leri bul ve kapat
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        Write-Host "Port $port kullanımda, kapatiliyor..." -ForegroundColor Red
        $connections | ForEach-Object {
            $processId = $_.OwningProcess
            if ($processId -gt 0) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "Process $processId kapatildi" -ForegroundColor Green
            }
        }
    }
}

# Kisa bekleme
Start-Sleep -Seconds 2

Write-Host "Uygulama baslatiliyor..." -ForegroundColor Green
npm run dev