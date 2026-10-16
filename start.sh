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

# Jalankan build jika dist belum ada atau setelah update
cd server
npm run build

echo "[*] Menjalankan Minecraft Server Manager..."
exec node dist/src/index.js
