#!/usr/bin/env bash
set -e

# Pindah ke direktori root mc-host
cd "$(dirname "$0")"

# Pastikan wake lock aktif
if command -v termux-wake-lock &>/dev/null; then
    termux-wake-lock
fi

# Buat folder data server jika belum ada
mkdir -p mc-data

# Jalankan server
echo "[*] Menjalankan Minecraft Server Manager..."
cd server
if [ ! -d "node_modules" ]; then
    echo "[*] Menginstall dependensi pertama kali..."
    npm install --omit=dev
fi

exec node dist/src/index.js
