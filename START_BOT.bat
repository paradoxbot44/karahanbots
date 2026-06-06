@echo off
chcp 65001 >nul
echo =============================================
echo 🤖 KARAHANBOTS - OTOMATİK BAŞLATICI
echo =============================================
echo.
echo 📥 Git'ten dosyalar indiriliyor...
echo.

git clone https://github.com/paradoxbot44/karahanbots.git karahanbots-bot
cd karahanbots-bot

echo.
echo 📦 Bağımlılıklar yükleniyor... (Biraz zaman alabilir)
echo.

call npm install

echo.
echo ✅ Kurulum tamamlandı!
echo.
echo 🚀 Bot başlatılıyor...
echo.

call npm start

pause
