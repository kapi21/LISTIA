@echo off
cd /d "%~dp0"
echo Iniciando Cuaderno de la Compra en LAN (http://192.168.1.4:5174)...

:: Actualizar catálogo de Mercadona si pasaron 24 horas (en segundo plano silencioso)
powershell -NoProfile -Command "if (!(Test-Path public\mercadona-news.json) -or ((Get-Date) - (Get-Item public\mercadona-news.json).LastWriteTime).TotalHours -ge 24) { Start-Process python -ArgumentList 'sync_mercadona.py' -WindowStyle Hidden }"

start http://localhost:5174
npm run dev -- --host 0.0.0.0 --port 5174
