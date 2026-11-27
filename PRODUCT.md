# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Satu orang: pemilik aplikasi, yang mengatur keuangan pribadinya sendiri di Indonesia (Rupiah). Tidak ada pengguna lain, tim, atau pendaftaran publik.

- Trader aktif (harian/mingguan). Angka "dana aman trading" adalah rem: dicek sebelum setor ke broker/exchange supaya tidak memakai uang hidup.
- Saat membuka aplikasi, yang paling sering dicari duluan: sisa uang dan budget bulan ini ("masih aman belanja, atau sudah mepet?").

## Product Purpose

Aplikasi keuangan pribadi untuk tiga hal:

1. Tahu uang habis ke mana: total per kategori, dibanding periode yang sama bulan lalu.
2. Disiplin budget dan menabung: budget bulanan per kategori, target tabungan, dana darurat.
3. Tahu berapa dana yang aman untuk trading, beserta rinciannya.

Saran berbasis aturan selalu tampil. Saran AI (Claude) diminta manual, satu klik = satu permintaan berbayar.

Berhasil berarti: pemilik tetap rajin mencatat (aplikasi tidak ditinggalkan karena ribet), tidak pernah trading memakai uang hidup, dan setiap angka bisa dijelaskan.

## Positioning

Angka "dana aman untuk trading" = saldo akun harian − sisa kebutuhan bulan ini − kekurangan dana darurat. Angka ini selalu tampil bersama rinciannya dan bisa dibaca aplikasi trading lewat API bertoken. Pencatat keuangan biasa berhenti di "uang ke mana"; aplikasi ini menjaga batas antara uang hidup dan uang trading.

## Operating Context

- Mencatat dengan rekap, bukan di tempat: sekali sehari di HP (beberapa transaksi sekaligus) dan sekali seminggu di laptop (rekap dan cek menyeluruh). Banyak transaksi dicatat dengan tanggal kemarin atau beberapa hari lalu.
- Di HP dipakai sebagai web app ("Add to Home Screen", mode standalone); di laptop lewat browser.
- Di-host sendiri di VPS pemilik, lewat domain publik + HTTPS, login dengan satu password.
- Aplikasi trading terpisah (belum dibuat) akan membaca dana aman dan mencatat setor/tarik/profit/rugi lewat `/api/v1` (lihat `docs/api.md`).

## Capabilities and Constraints

- Fitur: catat pemasukan/pengeluaran/transfer; akun (Harian, Tabungan / target, Dana darurat, Trading) dengan "sesuaikan saldo" dan arsip; budget per kategori dengan peringatan di 80% dan 100%; target tabungan; pembagian 50/30/20; dana darurat (target N bulan pengeluaran); dashboard per bulan; saran aturan + saran AI; export CSV; backup harian; API trading.
- Istilah tetap di UI: Beranda, Transaksi, Budget, Akun, Pengaturan; Masuk / Keluar / Sisa / Transfer; Kebutuhan / Keinginan; "dana aman trading".
- Uang = Rupiah bulat tanpa desimal, format id-ID ("Rp 1.500.000"). "Hari ini" dan batas bulan mengikuti WIB (Asia/Jakarta).
- Seluruh UI berbahasa Indonesia.
- Di luar cakupan (keputusan v1): banyak pengguna, banyak mata uang, sinkron bank/impor mutasi, transaksi berulang otomatis, mode offline, aplikasi native.
- AI hanya menerima ringkasan angka (tanpa catatan transaksi, tanpa nama akun). AI tidak pernah memindahkan uang dan tidak merekomendasikan saham, kripto, atau aset tertentu.
- Belum diputuskan: nama produk. Yang dipakai sekarang "Finance" (judul halaman, manifest, ikon), belum dikonfirmasi sebagai nama final.

## Evidence on Hand

- Datanya hanya milik pemilik sendiri. Tidak ada testimoni, pengguna lain, statistik, atau sertifikasi; jangan dikarang.
- Rancangan yang disetujui: `docs/superpowers/specs/2026-11-27-finance-app-design.md`. Kontrak API: `docs/api.md`. Ikon: `app/icon.png`, `public/icon-192.png`, `public/icon-512.png`.

## Product Principles

1. Uang hidup dilindungi dulu: saat data kurang, angka yang mengizinkan belanja atau trading memilih nilai yang lebih hati-hati.
2. Setiap angka bisa dijelaskan: sisa, dana aman, dan dana darurat selalu tampil bersama rinciannya.
3. Mencatat harus ringan, terutama rekap beberapa transaksi sekaligus dengan tanggal mundur. Kalau ribet, aplikasi ditinggalkan.
4. Pertanyaan pertama dijawab duluan: "masih aman bulan ini?" harus terjawab begitu aplikasi dibuka.
5. Data keuangan tidak keluar dari server, kecuali ringkasan angka yang dikirim ke AI atas permintaan pemilik.
