# Minecraft Server Manager for Android (Termux)

Aplikasi pengelola Minecraft Server Paper di Android (Termux) dengan web dashboard remote.

## Arsitektur
- **Host Server Minecraft & Backend**: HP Android (Termux non-root)
- **Dashboard Client**: Laptop / Browser via WiFi lokal atau tunnel
- **Stack**: Node.js, Express, WebSocket, TypeScript, React + Tailwind

## Setup Termux (Di HP)
```bash
pkg update && pkg upgrade
pkg install openjdk-21 nodejs git
termux-wake-lock
```

## Setup Development (Di Laptop)
```bash
git clone <repo>
cd mc-server-manager
npm install
```
