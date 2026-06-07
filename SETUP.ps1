# Masaüstü yolu
$Desktop = "C:\Users\vyusu\Desktop"
$BotFolder = "$Desktop\karahanbots-bot"

# Masaüstüne git
Set-Location $Desktop

# Repo'yu indir (ZIP olarak)
Write-Host "📥 Bot indiriliyor..." -ForegroundColor Cyan
$zipUrl = "https://github.com/paradoxbot44/karahanbots/archive/refs/heads/main.zip"
$zipPath = "$Desktop\karahanbots.zip"

# İndirme
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

# Çıkart
Write-Host "📦 Dosyalar çıkartılıyor..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $Desktop -Force

# Klasör ismini değiştir
Rename-Item -Path "$Desktop\karahanbots-main" -NewName "karahanbots-bot" -Force

# Klasöre gir
Set-Location $BotFolder

# npm install
Write-Host "⚙️  Bağımlılıklar yükleniyor... (Biraz zaman alabilir)" -ForegroundColor Yellow
npm install

# npm start
Write-Host "🚀 Bot başlatılıyor..." -ForegroundColor Green
npm start
