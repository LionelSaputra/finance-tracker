# Finance Tracker

Aplikasi keuangan pribadi untuk satu pengguna: catat pemasukan/pengeluaran, budget per kategori, target tabungan, saran (aturan + AI Claude), angka "dana aman untuk trading", dan API bertoken untuk aplikasi trading terpisah (belum dibuat).

**Baca `docs/superpowers/plans/2026-11-27-finance-app.md` sebelum mengerjakan apa pun.** Isinya rancangan yang sudah disetujui (bagian "Rancangan") dan rencana implementasi per task (bagian "Implementation Plan").

## Ringkasan keputusan

- Stack: Next.js (App Router) + TypeScript + Tailwind, SQLite (`better-sqlite3`) + Drizzle, zod, Vitest, `@anthropic-ai/sdk`.
- Hosting: VPS milik user (Docker, Nginx di host, RAM ≥ 4 GB), domain publik + HTTPS lewat certbot.
- Uang = integer rupiah; tanggal Asia/Jakarta lewat `lib/dates.ts`; UI Bahasa Indonesia.
- Semua hitungan uang di `computeSnapshot` (`lib/finance.ts`), dipakai dashboard, API, dan AI.
- Setiap page/server action/route handler memanggil `requireSession()`; `/api/v1` pakai Bearer token.
- AI hanya menerima ringkasan angka (tanpa catatan transaksi, tanpa nama akun); model default `claude-opus-5-5`.

## Status

Rencana disetujui 2026-11-27. Implementasi berjalan di branch `feat/finance-v1`; progres per task tercatat di commit git.

## Next.js

@AGENTS.md
