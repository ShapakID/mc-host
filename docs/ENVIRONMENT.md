# Dokumentasi Konfigurasi Lingkungan Termux

## Spesifikasi Target (TECNO LK6)
- **Arsitektur**: `aarch64` (ARM 64-bit)
- **OS**: Android 16
- **RAM Total**: 6 GB (Tersedia ~1.4 GB saat idle)
- **Swap**: 4 GB (~1.3 GB free zRAM)
- **Storage Termux**: ~44 GB bebas

## Alokasi Memori Rekomendasi
Untuk mencegah OOM (Out Of Memory) killer Android:
- JVM Heap: `-Xms1024M -Xmx2048M` (Max 2GB)
- Backend Node.js: ~150-250MB
- Jangan melebihi `-Xmx2500M` tanpa menghentikan app background di HP.

## Dependensi Wajib Termux
```bash
pkg update -y
pkg install -y openjdk-21 nodejs git
termux-wake-lock
```
