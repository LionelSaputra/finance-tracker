# Finance Tracker

Aplikasi keuangan pribadi (satu pengguna): catat pemasukan, pengeluaran, dan transfer; budget per kategori; target tabungan; saran otomatis (aturan + AI Claude); angka **dana aman untuk trading**; dan API bertoken untuk aplikasi trading. Tampilan dibuat untuk HP (bisa "Add to Home Screen").

- Rancangan dan rencana: `docs/superpowers/specs/` dan `docs/superpowers/plans/`
- API untuk aplikasi trading: [`docs/api.md`](docs/api.md)

## Menjalankan di laptop (development)

Butuh Node.js 24 atau lebih baru.

```bash
npm install
cp .env.example .env.local      # lalu isi nilainya (lihat "Isi .env")
npm run dev                     # buka http://localhost:3000
npm test                        # unit test
```

## Isi `.env`

| Variabel | Cara membuat |
|---|---|
| `APP_PASSWORD_HASH` | **kosongkan.** Password dibuat lewat halaman Buat akun saat pertama dibuka. Isi hanya untuk reset password lupa (`npm run hash-password`). |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `TRADING_API_TOKEN` | `openssl rand -hex 32` (kosongkan kalau belum butuh API trading) |
| `ANTHROPIC_API_KEY` | opsional; lebih mudah diisi di menu ⚙ Pengaturan → Saran AI. Isian di aplikasi menang atas .env |
| `AI_MODEL` | default `claude-opus-5-5`; `claude-haiku-5-5` jauh lebih murah |

Password tidak pernah disimpan, hanya hash-nya. Ganti `SESSION_SECRET` = semua perangkat otomatis logout.

## Deploy ke VPS (Docker + Nginx di host)

Contoh memakai subdomain `finance.domainmu.com`.

1. **DNS:** buat record `A` untuk `finance.domainmu.com` → IP VPS.
2. **Ambil kode di VPS:**
   ```bash
   git clone https://github.com/LionelSaputra/finance-tracker.git
   cd finance-tracker
   ```
3. **Buat `.env`:** `cp .env.example .env`, lalu isi seperti tabel di atas (`APP_PASSWORD_HASH` dibiarkan kosong).
4. **Folder data** (container berjalan sebagai user id 1000):
   ```bash
   mkdir -p data && sudo chown 1000:1000 data
   ```
5. **Jalankan:**
   ```bash
   docker compose up -d --build
   curl -I http://127.0.0.1:3100/login     # harus 200
   ```
6. **Nginx:** salin `deploy/nginx-finance.conf` ke `/etc/nginx/sites-available/finance`, ganti `finance.example.com` dengan subdomainmu, lalu:
   ```bash
   sudo ln -s /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/finance
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d finance.domainmu.com
   ```
7. **Segera** buka `https://finance.domainmu.com`: kamu diarahkan ke halaman **Buat akun**. Buat password (minimal 12 karakter); setelah itu halaman ini tertutup untuk siapa pun. Lalu tambahkan akun (rekening, e-wallet, tunai) beserta saldonya sekarang.

Aplikasi hanya mendengarkan di `127.0.0.1:3100`, jadi dari internet hanya bisa diakses lewat Nginx (HTTPS). Jangan buka port 3100 di firewall.

### Update ke versi baru

```bash
cd finance-tracker
git pull
docker compose up -d --build
```

Migrasi database berjalan otomatis saat container start.

## Backup

- Aplikasi membuat backup otomatis sekali sehari ke `data/backups/finance-YYYY-MM-DD.db` dan menyimpan 14 terakhir.
- Backup itu masih di VPS yang sama. **Salin secara berkala ke tempat lain**, misalnya dari laptop:
  ```bash
  scp user@vps:finance-tracker/data/backups/*.db ./backup-finance/
  ```
- Export CSV semua transaksi: menu ⚙ Pengaturan → "Export transaksi (CSV)". File memakai pemisah koma; Excel dengan pengaturan Indonesia memakai titik koma, jadi buka lewat **Data → From Text/CSV** dan pilih pemisah *Comma*.

### Restore dari backup

```bash
docker compose down
cp data/backups/finance-2026-11-27.db data/finance.db
rm -f data/finance.db-wal data/finance.db-shm
docker compose up -d
```

## Lupa password

Buat hash baru dengan `npm run hash-password`, isi `APP_PASSWORD_HASH` di `.env` VPS, lalu `docker compose up -d`. Password dari `.env` selalu menang atas password yang didaftarkan.

## Saran AI

Isi API key (dan model) di menu ⚙ Pengaturan → **Saran AI**. Bisa key Anthropic langsung, atau provider yang kompatibel dengan Anthropic: isi juga **Endpoint**-nya (harus `https://`) dan nama model dari provider itu; tombol "Minta saran AI" lalu muncul di Beranda. Key disimpan di database aplikasi (ikut ter-backup) dan hanya 4 karakter terakhirnya yang ditampilkan. Yang dikirim ke Claude hanya ringkasan angka bulan itu (total per kategori, budget, dana darurat, target tabungan beserta namanya, dana aman trading) — **tanpa catatan transaksi dan tanpa nama rekening harian/dana darurat/trading**. Nama target tabungan ikut terkirim, jadi jangan beri nama yang sensitif. Setiap klik = satu permintaan berbayar (sekitar Rp1.000 dengan Opus). Saran AI bukan nasihat keuangan profesional.
