# Finance App Pribadi — Rancangan

## Context

Kamu ingin aplikasi keuangan pribadi untuk tiga hal: (1) tahu uang habis ke mana, (2) disiplin budget & menabung, (3) tahu berapa dana yang **aman** dipakai trading. Hanya kamu penggunanya, mencatat dari HP dan laptop. Aplikasi di-host di **VPS milikmu** (Docker sudah ada, domain ada, sudah ada aplikasi lain di VPS itu) dan diakses lewat **domain publik + HTTPS**. Nanti ada aplikasi trading terpisah (belum dibuat) yang terhubung lewat API.

## Tujuan, bukan tujuan, anti-tujuan

**Tujuan v1**
1. Catat pemasukan / pengeluaran / transfer dari HP dalam < 10 detik.
2. Lihat ke mana uang pergi: total per kategori bulan ini vs periode yang sama bulan lalu, kategori terbesar.
3. Budget bulanan per kategori, peringatan di 80% dan 100%.
4. Target tabungan dengan progres dan setoran per bulan yang dibutuhkan.
5. Saran berbasis aturan (selalu tampil) + saran AI on-demand (Claude).
6. Angka "dana aman untuk trading" beserta rincian perhitungannya.
7. API bertoken untuk aplikasi trading: baca dana aman, daftar akun & kategori, catat transaksi trading.
8. Export CSV + backup otomatis harian.

**Bukan tujuan v1:** multi-user/registrasi; sinkron bank/impor mutasi; multi-mata uang (IDR saja — aplikasi trading mengonversi sendiri); transaksi berulang otomatis; aplikasi mobile native; mode offline; eksekusi trading atau rekomendasi aset spesifik.

**Anti-tujuan (gagal walau "jalan"):** data keuangan bocor (login lemah, token di log, transaksi mentah dikirim ke AI); data hilang tanpa backup; input di HP lambat/ribet sehingga ditinggalkan; AI mengambil keputusan atau memindahkan uang; angka "dana aman" yang tidak bisa dijelaskan.

## Pendekatan yang dipertimbangkan

| Pendekatan | Plus | Minus | Status |
|---|---|---|---|
| Vercel + Neon (hosting gratis) | Rp0, tanpa urus server | data di pihak ketiga | Ditolak — kamu punya VPS |
| Laptop + Tailscale | paling privat | laptop harus menyala | Ditolak |
| **VPS sendiri + Docker + SQLite + domain publik** | selalu online, data di tanganmu, aplikasi trading bisa di VPS yang sama | terbuka ke internet → auth harus kuat | **Dipilih** |
| VPS + akses privat via Tailscale | tidak terekspos internet | HP wajib Tailscale | Ditawarkan; kamu pilih domain publik |
| Aplikasi mobile native | rasa native | dua codebase | Dicoret |

## Keputusan teknis (keputusan saya, bisa dikoreksi)

- **Next.js (App Router) + TypeScript**, satu aplikasi untuk UI, server actions, dan REST API. Tailwind untuk styling.
- **SQLite** (`better-sqlite3`) + **Drizzle ORM**; file DB di volume Docker. Uang disimpan sebagai **integer rupiah**.
- **zod** untuk validasi input (form, API, output AI). **Vitest** untuk test.
- Zona waktu **Asia/Jakarta** lewat satu helper (`Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`) untuk "hari ini" dan batas bulan — tidak bergantung pada TZ container. Tanggal disimpan `YYYY-MM-DD`, bulan `YYYY-MM`.
- UI Bahasa Indonesia, mobile-first, bisa "Add to Home Screen" (manifest PWA, tanpa offline).
- Grafik cukup bar CSS — tanpa library chart di v1.

## Model data

- **accounts**: `id, name, kind ('spending'|'savings'|'emergency'|'trading'), opening_balance, target_amount?, target_date?, archived, created_at`
  - `spending` = rekening harian/e-wallet/tunai (uang bebas) · `savings` = kantong tabungan; kalau punya `target_amount` dia jadi **target tabungan** · `emergency` = dana darurat · `trading` = RDN/exchange.
  - "Sesuaikan saldo": user memasukkan saldo nyata → `opening_balance` digeser supaya saldo terhitung = saldo nyata.
- **categories**: `id, name, kind ('income'|'expense'), group ('needs'|'wants'|null), monthly_budget?, archived`
  - Budget = satu angka per kategori yang berlaku tiap bulan (tanpa tabel budget terpisah).
  - Seed awal: Gaji, Bonus, Pemasukan Lain, Profit Trading (income); Makan, Transportasi, Tagihan & Utilitas, Belanja Rumah, Kesehatan, Cicilan (needs); Makan di Luar, Hiburan, Belanja, Langganan (wants); Rugi & Biaya Trading (expense, group null).
- **transactions**: `id, occurred_on, type ('income'|'expense'|'transfer'), amount (>0), account_id, to_account_id?, category_id?, note?, source ('manual'|'trading'), external_id? (unique), created_at, updated_at`
  - Transfer wajib `to_account_id ≠ account_id`, tanpa kategori. Income/expense wajib kategori dengan `kind` yang cocok.
- **settings** (1 baris): `emergency_months` (default 6).
- **ai_insights**: `id, month, created_at, model, summary_json, result_json, input_tokens, output_tokens`.
- Akun dan kategori tidak pernah dihapus, hanya diarsip. Akun hanya bisa diarsip jika saldonya 0. `opening_balance` boleh negatif (mis. kartu kredit: belanja membuat saldo minus, bayar tagihan = transfer dari rekening).

## Perhitungan (`lib/finance.ts`, fungsi murni + unit test)

- **Saldo akun** = opening_balance + income − expense − transfer keluar + transfer masuk.
- **Analitik "uang ke mana" dan 50/30/20 hanya memakai akun non-trading.** Income/expense di akun trading = hasil trading, ditampilkan terpisah.
- **Perbandingan bulan:** bulan ini tanggal 1–hari ini vs bulan lalu tanggal 1–tanggal yang sama (dipotong ke panjang bulan). Untuk bulan yang sudah lewat: bulan penuh vs bulan penuh sebelumnya. Lonjakan = naik ≥ 30% **dan** ≥ Rp100.000. Pengeluaran di kategori tanpa group ditampilkan sebagai "Lainnya".
- **Status budget:** < 80% aman · 80–99% peringatan · ≥ 100% lewat.
- **50/30/20 (bulan ini):** basis = income bulan ini. needs% & wants% dari pengeluaran per group; tabungan% = transfer bersih dari akun `spending` ke `savings`/`emergency`/`trading`. Income 0 → dilewati dengan pesan.
- **Rata-rata pengeluaran bulanan** = rata-rata 3 bulan penuh terakhir yang ada datanya; kalau belum ada → jumlah `monthly_budget`; kalau itu juga kosong → "belum cukup data".
- **Dana darurat:** target = `emergency_months` × rata-rata pengeluaran; saat ini = saldo akun `emergency`; kekurangan = max(0, target − saat ini).
- **Target tabungan:** progres = saldo/target; jika ada `target_date`: setoran per bulan = sisa ÷ bulan tersisa (min 1).
- **Dana aman trading** = max(0, saldo akun `spending` − sisa budget bulan ini − kekurangan dana darurat), di mana sisa budget = Σ max(0, budget − terpakai). Kalau rata-rata pengeluaran belum bisa dihitung → **0** dengan alasan "belum cukup data" (konservatif). Selalu dikembalikan bersama rinciannya.

## Saran

**Berbasis aturan (`lib/suggestions.ts`)**, selalu tampil di dashboard: budget ≥ 80% / ≥ 100%; lonjakan kategori; penyimpangan 50/30/20; status dana darurat ("baru 2,1 dari 6 bulan"); setoran per bulan yang dibutuhkan untuk tiap target.

**AI (`lib/ai.ts`)** — tombol "Minta saran AI" di dashboard:
- Dikirim hanya **ringkasan angka** bulan terpilih: total income/expense, per kategori (bulan ini, periode sama bulan lalu, budget), 50/30/20, dana darurat, target tabungan (nama, target, saldo, tanggal), dana aman trading, hasil trading bulan ini, dan saran berbasis aturan. **Tanpa catatan transaksi, tanpa nama akun.**
- `@anthropic-ai/sdk`, model dari env `AI_MODEL` (default `claude-opus-5-5`, `effort: "medium"`; bisa diganti `claude-haiku-5-5` untuk ~40× lebih murah). Server-side refusal fallback (`fallbacks: "default"`) aktif untuk Opus/Sonnet, tidak dipakai untuk Haiku.
- System prompt Bahasa Indonesia: asisten keuangan pribadi, 3–6 saran konkret untuk bulan ini berbasis angka yang diberikan, tidak merekomendasikan aset/saham/kripto tertentu, sebutkan data yang kurang.
- Output terstruktur (zod): `{ ringkasan, saran: [{ judul, detail, prioritas: 'tinggi'|'sedang'|'rendah' }] }`.
- Hasil disimpan di `ai_insights`; dashboard menampilkan hasil terakhir + waktunya; klik ulang = request baru (≈ Rp1.000 untuk Opus).
- Tanpa `ANTHROPIC_API_KEY` tombol disembunyikan. Error API / `refusal` → pesan ramah, aplikasi tetap jalan.

## API untuk aplikasi trading (`/api/v1`, dokumentasi di `docs/api.md`)

Auth: `Authorization: Bearer <TRADING_API_TOKEN>` (dibandingkan constant-time). Token kosong di env → API mati.

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/safe-to-trade` | `{ currency: "IDR", amount, breakdown: { freeCash, remainingBudget, emergencyTarget, emergencyCurrent, emergencyGap }, reason, asOf }` |
| `GET /api/v1/accounts` | akun aktif: `id, name, kind, balance` |
| `GET /api/v1/categories` | kategori aktif: `id, name, kind, group` |
| `POST /api/v1/transactions` | `{ externalId, occurredOn, type, amount, accountId, toAccountId?, categoryId?, note? }` → `201 {id}`; `externalId` yang sama → `200 {id, duplicate: true}`; tidak valid → `400` dengan detail |

Nama field camelCase, sama dengan tipe internal (tidak ada lapisan konversi).

Pola pemakaian: setor ke broker = transfer `spending → trading`; tarik = sebaliknya; profit = income "Profit Trading" di akun trading; rugi/fee = expense "Rugi & Biaya Trading" di akun trading.

## Keamanan

- Password tunggal (min 12 karakter) di-hash **scrypt** (`node:crypto`) → env `APP_PASSWORD_HASH`, dibuat dengan `npm run hash-password`.
- Sesi = cookie bertanda tangan HMAC-SHA256 (`SESSION_SECRET`), `HttpOnly; Secure; SameSite=Lax`, berlaku 30 hari. Ganti secret = logout semua perangkat.
- **Setiap page, server action, dan route handler memeriksa sesi sendiri** (bukan hanya middleware); `/api/v1` memeriksa token.
- Batas login: 5 gagal / 15 menit per IP + 20 gagal / jam total → 429 (in-memory). IP diambil dari nilai paling kanan `X-Forwarded-For` (diisi reverse proxy; port aplikasi hanya terbuka di loopback/jaringan internal).
- CSRF: proteksi bawaan server actions (cek Origin); set `serverActions.allowedOrigins` ke domainmu kalau perlu di balik proxy.
- Header: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Robots-Tag: noindex`; HSTS di reverse proxy.
- Tidak pernah me-log body request, password, atau token. `.env` tidak di-commit; `.env.example` di-commit. Container jalan sebagai non-root.

## Tampilan

Navigasi bawah: **Beranda · Transaksi · (+) · Budget · Akun**; Pengaturan lewat ikon ⚙ di header. Tombol (+) membuka form cepat: tipe (Keluar/Masuk/Transfer), nominal (keypad angka, pemisah ribuan), chip kategori (paling sering dipakai di depan), akun (default terakhir dipakai), tanggal (default hari ini), catatan opsional.

```
┌ Finance ──────────── Nov 2026 ▾ ┐
│ Masuk   Rp 12.500.000            │
│ Keluar  Rp  7.240.000   Sisa 5,3jt│
├──────────────────────────────────┤
│ Dana aman trading   Rp 1.850.000 │
│  saldo bebas 6,1jt − sisa budget │
│  2,0jt − kurang dana darurat 2,25jt│
├──────────────────────────────────┤
│ ⚠ Makan di Luar 92% dari budget  │
│ ↑ Transportasi +45% vs bln lalu  │
│ [ Minta saran AI ]               │
├──────────────────────────────────┤
│ Budget  Makan    ████████░░ 80%  │
│         Hiburan  ███░░░░░░░ 30%  │
└ Beranda  Transaksi  (+)  Budget  Akun ┘
```

Halaman: `/login`, `/` (dashboard, pilih bulan), `/transaksi` (daftar + filter bulan/kategori/akun + edit/hapus), `/akun` (saldo, target, sesuaikan saldo, arsip), `/budget`, `/pengaturan` (kategori, bulan dana darurat, export CSV, status token API, logout).

## Deploy & backup

- `Dockerfile` multi-stage, Next.js `output: "standalone"`, base `node:24-slim`, user non-root.
- `docker-compose.yml`: satu service, `restart: unless-stopped`, `env_file: .env`, volume `./data:/app/data`, port hanya di loopback (`127.0.0.1:3100:3000`).
- **Nginx di host** (sudah ada) mendapat server block baru `finance.<domainmu>` → `proxy_pass http://127.0.0.1:3100` dengan `Host`, `X-Forwarded-For`, `X-Forwarded-Proto` diteruskan, plus header HSTS; sertifikat lewat `certbot --nginx -d finance.<domainmu>`. Contoh config ada di `deploy/nginx-finance.conf`.
- RAM VPS ≥ 4 GB → image di-build langsung di VPS (`docker compose up -d --build`).
- Migrasi Drizzle + seed kategori dijalankan otomatis saat server start (`instrumentation.ts`, hanya saat `NEXT_RUNTIME === "nodejs"`; folder `drizzle/` ikut disalin ke image).
- Backup harian di dalam aplikasi: cek tiap jam, kalau backup hari ini belum ada → `db.backup()` ke `data/backups/`, simpan 14 terakhir. README menyarankan menyalin backup ke luar VPS.

## Diserahkan ke builder

Gaya visual (bersih, kontras baik, angka mudah dibaca), teks UI di luar yang dipatok di bawah, isi lengkap system prompt AI, versi pasti dependensi, ikon aplikasi.

---

# Finance App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplikasi keuangan pribadi mobile-first (tracker, budget, target, saran aturan + AI, dana aman trading, API untuk aplikasi trading) yang jalan di VPS lewat Docker.

**Architecture:** Satu aplikasi Next.js App Router. Semua hitungan uang ada di fungsi murni `computeSnapshot` (`lib/finance.ts`) yang dipakai dashboard, API, dan AI — satu sumber kebenaran. UI memakai server actions; aplikasi trading memakai REST `/api/v1` bertoken; data di SQLite lewat Drizzle.

**Tech Stack:** Node 24, Next.js + TypeScript + Tailwind, SQLite (`better-sqlite3`) + Drizzle, zod, Vitest, `@anthropic-ai/sdk`, Docker Compose, Nginx di host.

**Spec:** bagian "Rancangan" di atas (disalin ke `docs/superpowers/specs/2026-11-27-finance-app-design.md` di Langkah 0).

## Global Constraints

- Node 24 (container `node:24-slim`), TypeScript strict, Next.js App Router.
- Uang = integer rupiah. `amount` transaksi 1 … `MAX_AMOUNT` (1.000.000.000.000). `openingBalance` boleh negatif (kartu kredit).
- Semua "hari ini"/batas bulan lewat `lib/dates.ts` (Asia/Jakarta). Format `YYYY-MM-DD` / `YYYY-MM`.
- Teks UI Bahasa Indonesia. Format uang `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Dependensi runtime hanya: next, react, react-dom, tailwind (bawaan scaffold), drizzle-orm, better-sqlite3, zod, @anthropic-ai/sdk. Dev: drizzle-kit, vitest, tsx, @types/better-sqlite3.
- Env: `DATABASE_PATH` (default `./data/finance.db`), `APP_PASSWORD_HASH`, `SESSION_SECRET` (≥ 32 karakter), `APP_ORIGIN`, `TRADING_API_TOKEN` (≥ 32 karakter), `ANTHROPIC_API_KEY`, `AI_MODEL` (default `claude-opus-5-5`).
- Setiap page, server action, dan route handler memanggil `requireSession()` di baris pertama; route `/api/v1` mengecek token **sebelum** membaca body.
- Tidak pernah me-log body request, password, token, atau ringkasan AI.
- Data ke AI hanya keluaran `buildAiSummary(...)`.
- Commit lokal per task di branch `feat/finance-v1`; tidak di-push.

## Review Focus

1. Nominal diketik format Indonesia dengan koma desimal ("12,5") atau tanda minus → ditolak, tidak pernah diam-diam jadi ×100 atau positif. (test di Task 1)
2. Mencatat jam 23.30–00.59 WIB → tanggal ikut WIB, bukan UTC. (test di Task 1)
3. Aplikasi trading mengirim ulang POST yang sama karena timeout → tetap satu transaksi. (test di Task 5 & Task 7)
4. Catatan transaksi diawali `=` lalu CSV dibuka di Excel → tidak jadi formula. (test di Task 9)
5. Mengarsip akun yang masih ada saldonya → ditolak dengan pesan, angka dana aman tidak berubah diam-diam. (test di Task 5)

## Struktur file

```
app/(auth)/login/{page.tsx,actions.ts}
app/(app)/layout.tsx                 # requireSession + nav bawah + tombol (+)
app/(app)/page.tsx                   # dashboard, ?bulan=YYYY-MM
app/(app)/actions.ts                 # askAi
app/(app)/transaksi/{page.tsx,baru/page.tsx,[id]/page.tsx,actions.ts}
app/(app)/{akun,budget,pengaturan}/{page.tsx,actions.ts}
app/(app)/export/route.ts            # CSV
app/api/v1/{safe-to-trade,accounts,categories,transactions}/route.ts
app/manifest.ts
components/{BottomNav,TransactionForm,AmountInput,SafeToTradeCard,BudgetBars,SuggestionList,AiInsightCard}.tsx
lib/{dates,money,validation,finance,suggestions,ai,csv,backup}.ts
lib/db/{schema,index,migrate,seed}.ts
lib/data/{transactions,accounts,categories,load}.ts
lib/auth/{password,session,rate-limit,api-token}.ts
scripts/hash-password.ts
instrumentation.ts next.config.ts drizzle.config.ts vitest.config.ts
Dockerfile .dockerignore docker-compose.yml .env.example deploy/nginx-finance.conf
docs/api.md README.md .claude/launch.json
```
Test di samping modulnya (`*.test.ts`).

### Langkah 0: Folder & repo

- [ ] Minta folder project lewat `request_directory`, lalu `change_directory` ke sana (folder sesi ini terhapus bersama sesi).
- [ ] `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`, lalu `propose_branch` → `feat/finance-v1`.
- [ ] `npm i drizzle-orm better-sqlite3 zod @anthropic-ai/sdk` dan `npm i -D drizzle-kit vitest tsx @types/better-sqlite3`. Scripts: `"test": "vitest run --passWithNoTests"`, `"hash-password": "tsx scripts/hash-password.ts"`, `"db:generate": "drizzle-kit generate"`. `vitest.config.ts`: environment `node`, alias `@` → root. `.gitignore` + `data/`, `.env`.
- [ ] Salin spec dan plan ini ke `docs/superpowers/specs/2026-11-27-finance-app-design.md` dan `docs/superpowers/plans/2026-11-27-finance-app.md`.
- [ ] `npm test` dan `npm run build` → sukses. Commit `chore: scaffold`.

### Task 1: Tanggal & Rupiah

**Files:** Create `lib/dates.ts`, `lib/money.ts` · Test `lib/dates.test.ts`, `lib/money.test.ts`

**Interfaces — Produces:** `todayJakarta(now?: Date): string` · `monthOf(date: string): string` · `monthRange(month: string): { start: string; end: string }` · `addMonths(month: string, n: number): string` · `sameDayLastMonth(date: string): string` · `isValidDate(date: string): boolean` · `monthsUntil(from: string, to: string): number` · `MAX_AMOUNT` · `parseRupiah(input: string): number | null` · `formatIDR(amount: number): string`

- [ ] Tulis test:
```ts
expect(todayJakarta(new Date("2026-11-30T18:00:00Z"))).toBe("2026-12-01");
expect(todayJakarta(new Date("2026-11-30T16:59:59Z"))).toBe("2026-11-30");
expect(sameDayLastMonth("2026-03-31")).toBe("2026-02-28");
expect(sameDayLastMonth("2028-03-31")).toBe("2028-02-29");
expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
expect(addMonths("2026-01", -1)).toBe("2025-12");
expect(isValidDate("2026-02-30")).toBe(false);
expect(monthsUntil("2026-11-27", "2027-05-27")).toBe(6);
expect(monthsUntil("2026-11-27", "2027-05-28")).toBe(7);
expect(monthsUntil("2026-11-27", "2026-11-01")).toBe(1);
expect(parseRupiah("1.500.000")).toBe(1_500_000);
expect(parseRupiah("Rp 25.000")).toBe(25_000);
expect(parseRupiah("1.500.000,00")).toBe(1_500_000);
for (const bad of ["12,5", "-5000", "0", "abc", "", "9999999999999999"]) expect(parseRupiah(bad)).toBeNull();
expect(formatIDR(1_500_000).replace(/\s/g, " ")).toBe("Rp 1.500.000");
```
- [ ] `npm test` → FAIL (modul belum ada).
- [ ] Implementasi. `todayJakarta`: `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`. `parseRupiah`: buang awalan "Rp" dan spasi; yang diterima hanya digit, titik ribuan, dan ",00" opsional di akhir; hasil wajib 1…`MAX_AMOUNT`. `monthsUntil`: selisih bulan kalender, +1 jika hari di `to` > hari di `from`, minimal 1.
- [ ] `npm test` → PASS.
- [ ] Commit `feat: date and rupiah helpers`.

### Task 2: Database, migrasi, seed

**Files:** Create `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/migrate.ts`, `lib/db/seed.ts`, `drizzle.config.ts`, `drizzle/*` (generated), `instrumentation.ts` · Test `lib/db/seed.test.ts`

**Interfaces — Produces:** tabel `accounts`, `categories`, `transactions`, `settings`, `aiInsights` sesuai "Model data" (kolom group bernama `category_group`, unik `(name, kind)`; `CHECK (amount > 0)`; index `occurred_on`); tipe `Account`, `Category`, `Transaction`, `Settings` = `$inferSelect`; `type Db`; `createDb(path: string): Db` (pragma `journal_mode=WAL`, `foreign_keys=ON`); `getDb(): Db` dan `getSqlite(): Database.Database` (singleton dari `DATABASE_PATH`); `migrateDb(db: Db): void` (folder `drizzle/`); `seedDefaults(db: Db): void` (idempoten: 15 kategori seed + baris settings `id=1`).

- [ ] Tulis test:
```ts
const db = createDb(":memory:"); migrateDb(db); seedDefaults(db); seedDefaults(db);
expect(db.select().from(categories).all()).toHaveLength(15);
expect(db.select().from(settings).get()?.emergencyMonths).toBe(6);
expect(() => db.insert(transactions).values({ ...validExpense, amount: 0 }).run()).toThrow();
```
- [ ] `npm test` → FAIL.
- [ ] Tulis schema, `npm run db:generate`, implementasi `createDb`/`migrateDb`/`seedDefaults`. `instrumentation.ts` `register()`: jika `process.env.NEXT_RUNTIME === "nodejs"`, import dinamis lalu `migrateDb(getDb())` + `seedDefaults(getDb())`.
- [ ] `npm test` → PASS.
- [ ] Commit `feat: sqlite schema, migrations and seed`.

### Task 3: `computeSnapshot`

**Files:** Create `lib/finance.ts` · Test `lib/finance.test.ts`

**Interfaces — Consumes:** tipe tabel (Task 2), helper tanggal (Task 1). **Produces:**
- `type FinanceData = { accounts: Account[]; categories: Category[]; txns: Transaction[]; settings: Settings }`
- `accountBalances(data: FinanceData): Map<number, number>`
- `budgetStatus(spent: number, budget: number): "ok" | "warn" | "over"`
- `computeSnapshot(data: FinanceData, month: string, today: string): FinanceSnapshot` dengan
  `FinanceSnapshot = { month; income; expense; categories: CategoryLine[]; split: { needsPct; wantsPct; savingsPct; otherPct } | null; avgMonthlyExpense: number | null; emergency: { months; target; current; gap; monthsCovered } | null; goals: GoalLine[]; safeToTrade: SafeToTrade; tradingResult: number }`
  - `CategoryLine = { id; name; kind; group; current; previous; budget: number | null; status: "ok" | "warn" | "over" | null }`
  - `GoalLine = { accountId; name; target; balance; progressPct; neededPerMonth: number | null; targetDate: string | null }`
  - `SafeToTrade = { amount; freeCash; remainingBudget; emergencyTarget: number | null; emergencyCurrent; emergencyGap: number | null; reason: string | null }`
  - `month` hanya memengaruhi income/expense/categories/split/tradingResult; saldo, dana darurat, target, dan dana aman selalu per `today`. Rata-rata pengeluaran = rata-rata dari 3 bulan penuh sebelum bulan `today` yang punya pengeluaran (bulan kosong dilewati) → fallback Σ `monthlyBudget` → `null`. Persen dibulatkan `Math.round`.

- [ ] Tulis test. Fixture utama (today `2026-11-27`, month `2026-11`): akun Dompet (spending, saldo akhir 6.100.000), Darurat (emergency, saldo 21.750.000), Trading (trading); pengeluaran Dompet Agustus/September/Oktober 3.000.000 / 4.000.000 / 5.000.000; Makan (needs, budget 3.000.000) terpakai 1.000.000 di November; `emergencyMonths` 6.
```ts
expect(snap.avgMonthlyExpense).toBe(4_000_000);
expect(snap.safeToTrade).toEqual({ amount: 1_850_000, freeCash: 6_100_000, remainingBudget: 2_000_000,
  emergencyTarget: 24_000_000, emergencyCurrent: 21_750_000, emergencyGap: 2_250_000, reason: null });
// saldo: opening 1.000.000 + income 500.000 − expense 200.000 − transfer keluar 100.000 + masuk 50.000
expect(accountBalances(d).get(acc.id)).toBe(1_250_000);
expect([budgetStatus(79_999, 100_000), budgetStatus(80_000, 100_000), budgetStatus(100_000, 100_000)]).toEqual(["ok", "warn", "over"]);
// expense 300.000 di akun Trading: tidak masuk categories, tradingResult = -300_000
// today 2026-03-31, month 2026-03: expense 2026-02-28 masuk `previous`; month 2026-01: previous = Desember penuh
// income 10.000.000, needs 4.000.000, wants 3.500.000, transfer Dompet→Darurat 2.000.000
expect(snap.split).toEqual({ needsPct: 40, wantsPct: 35, savingsPct: 20, otherPct: 0 });
// income 0 → split null; tanpa riwayat & budget Σ 2.500.000 → avgMonthlyExpense 2_500_000
// tanpa riwayat & tanpa budget → safeToTrade { amount: 0, emergencyTarget: null, emergencyGap: null, reason: "belum cukup data", ... }
// freeCash 1.000.000, sisa budget 2.000.000, gap 0 → amount 0, reason null
// akun Laptop (savings, target 12.000.000, saldo 3.000.000, targetDate 2027-05-27)
expect(snap.goals[0]).toMatchObject({ progressPct: 25, neededPerMonth: 1_500_000 });
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi sesuai bagian "Perhitungan" di spec.
- [ ] `npm test` → PASS.
- [ ] Commit `feat: finance snapshot calculations`.

### Task 4: Saran berbasis aturan

**Files:** Create `lib/suggestions.ts` · Test `lib/suggestions.test.ts`

**Interfaces — Consumes:** `FinanceSnapshot`, `formatIDR`. **Produces:** `type Suggestion = { level: "info" | "warn" | "alert"; text: string }` · `ruleSuggestions(s: FinanceSnapshot): Suggestion[]` (urut alert → warn → info).

Teks dipatok:
- budget: `` `${name} sudah ${pct}% dari budget` `` — warn 80–99, alert ≥ 100
- lonjakan (previous > 0, naik ≥ 30% dan ≥ Rp100.000): `` `${name} naik ${pct}% dibanding periode yang sama bulan lalu` `` — warn
- `` `Kebutuhan ${needsPct}% dari pemasukan (batas 50%)` `` warn jika > 50 · `` `Keinginan ${wantsPct}% dari pemasukan (batas 30%)` `` warn jika > 30 · `` `Tabungan & investasi baru ${savingsPct}% dari pemasukan (target 20%)` `` info jika < 20
- `` `Dana darurat baru ${monthsCovered} dari ${months} bulan pengeluaran` `` info jika gap > 0 (`monthsCovered` 1 desimal format id-ID)
- `` `Target "${name}": sisihkan ${formatIDR(neededPerMonth)} per bulan` `` info
- reason dana aman ada: `"Dana aman trading belum bisa dihitung: catat pengeluaran atau isi budget dulu"` info

- [ ] Tulis test (snapshot dibuat langsung sebagai objek):
```ts
expect(ruleSuggestions(snap({ budget: 1_000_000, current: 1_050_000, name: "Makan di Luar" })))
  .toContainEqual({ level: "alert", text: "Makan di Luar sudah 105% dari budget" });
// lonjakan: 1.000.000→1.290.000 tidak; 300.000→390.000 tidak (+30% tapi < Rp100.000); 1.000.000→1.300.000 ya "naik 30%"
// dana darurat 21.750.000 / rata-rata 4.000.000, 6 bulan → "Dana darurat baru 5,4 dari 6 bulan pengeluaran"
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi.
- [ ] `npm test` → PASS.
- [ ] Commit `feat: rule-based suggestions`.

### Task 5: Data layer & validasi

**Files:** Create `lib/validation.ts`, `lib/data/transactions.ts`, `lib/data/accounts.ts`, `lib/data/categories.ts`, `lib/data/load.ts` · Test `lib/data/data.test.ts`

**Interfaces — Consumes:** `Db`, tabel (Task 2), `isValidDate`, `MAX_AMOUNT`, `accountBalances`, `FinanceData`. **Produces:**
- `class DomainError extends Error`
- `txnInputSchema` → `TxnInput = { occurredOn; type; amount; accountId; toAccountId?; categoryId?; note? (≤ 500); externalId? (≤ 100) }` · `apiTxnInputSchema` (sama, `externalId` wajib) · `accountInputSchema` → `AccountInput = { name (1–50); kind; openingBalance (bilangan bulat, ± MAX_AMOUNT); targetAmount?; targetDate? }` · `categoryInputSchema` → `CategoryInput = { name (1–50); kind; group (null wajib untuk income); monthlyBudget (≥ 0 atau null) }` · `settingsInputSchema` (`emergencyMonths` 1–24)
- `createTransaction(db, input: TxnInput, source?: "manual" | "trading"): { id: number; duplicate: boolean }` · `updateTransaction(db, id, input)` · `deleteTransaction(db, id)` · `listTransactions(db, f: { month: string; categoryId?: number; accountId?: number })` (dengan nama akun/kategori, terbaru dulu) · `lastUsedAccountId(db): number | null`
- `createAccount(db, input): number` · `updateAccount(db, id, input)` · `adjustBalance(db, id, actualBalance: number)` · `archiveAccount(db, id)`
- `createCategory(db, input): number` · `updateCategory(db, id, input)` · `archiveCategory(db, id)` · `listCategoriesByUsage(db, kind)` (pemakaian 90 hari terakhir, terbanyak dulu)
- `loadFinanceData(db): FinanceData` · `updateSettings(db, input)`

Pesan `DomainError` dipatok: "Akun tidak ditemukan", "Akun sudah diarsip", "Transfer butuh akun tujuan yang berbeda", "Transfer tidak memakai kategori", "Kategori tidak cocok dengan tipe transaksi", "Saldo harus 0 sebelum akun diarsip", "Kategori sudah ada".

- [ ] Tulis test (DB `:memory:` + migrate + seed):
```ts
expect(() => createTransaction(db, { ...expense, categoryId: gajiId })).toThrow("Kategori tidak cocok dengan tipe transaksi");
expect(() => createTransaction(db, { ...transfer, toAccountId: transfer.accountId })).toThrow("Transfer butuh akun tujuan yang berbeda");
const a = createTransaction(db, { ...expense, externalId: "t-1" }, "trading");
expect(createTransaction(db, { ...expense, externalId: "t-1" }, "trading")).toEqual({ id: a.id, duplicate: true });
for (const amount of [0, 1.5, MAX_AMOUNT + 1]) expect(() => txnInputSchema.parse({ ...expense, amount })).toThrow();
expect(() => txnInputSchema.parse({ ...expense, occurredOn: "2026-02-30" })).toThrow();
// opening 0, expense 300.000, adjustBalance → 1.000.000: saldo 1_000_000, openingBalance 1_300_000
expect(() => archiveAccount(db, accWithBalance50k)).toThrow("Saldo harus 0 sebelum akun diarsip");
// transaksi ke akun yang diarsip → "Akun sudah diarsip"; kategori dipakai 3× tampil sebelum yang dipakai 1×
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi; cek domain dilakukan di dalam satu transaksi DB.
- [ ] `npm test` → PASS.
- [ ] Commit `feat: data layer with validation`.

### Task 6: Login, sesi, kerangka aplikasi

**Files:** Create `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/rate-limit.ts`, `scripts/hash-password.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `app/(app)/layout.tsx`, `app/(app)/page.tsx` (placeholder "Beranda", diganti di Task 10), `components/BottomNav.tsx`, `.env.example`, `.claude/launch.json` (dev server port 3000) · Delete `app/page.tsx` (bawaan scaffold, bentrok dengan `/`) · Modify `next.config.ts` · Test `lib/auth/auth.test.ts`

**Interfaces — Produces:** `hashPassword(pw: string): Promise<string>` (format `scrypt:16384:8:1:<saltB64url>:<hashB64url>` — tanpa `$` supaya aman di `.env` Docker) · `verifyPassword(pw: string, stored: string): Promise<boolean>` (format rusak → false) · `SESSION_COOKIE = "fin_session"` · `createSessionToken(secret: string, nowMs?: number): Promise<string>` · `verifySessionToken(token: string, secret: string, nowMs?: number): Promise<boolean>` (HMAC-SHA256 via Web Crypto, umur 30 hari) · `requireSession(): Promise<void>` (cookie tidak valid → `redirect("/login")`; `SESSION_SECRET` kosong/< 32 → throw) · `isLoginBlocked(ip, nowMs?)` · `recordLoginFailure(ip, nowMs?)` · `clearLoginFailures(ip)` · `clientIp(h: Headers): string` · `login(prev, formData)` · `logout()`.

- [ ] Tulis test:
```ts
const h = await hashPassword("benar-panjang-123");
expect(await verifyPassword("benar-panjang-123", h)).toBe(true);
expect(await verifyPassword("salah-panjang-123", h)).toBe(false);
expect(await verifyPassword("x", "bukan-format")).toBe(false);
const s = "s".repeat(32), t = await createSessionToken(s, 0);
expect(await verifySessionToken(t, s, 1000)).toBe(true);
expect(await verifySessionToken(t, s, 30 * 864e5 + 1)).toBe(false);
expect(await verifySessionToken(t + "x", s, 1000)).toBe(false);
expect(await verifySessionToken(t, "t".repeat(32), 1000)).toBe(false);
for (let i = 0; i < 5; i++) recordLoginFailure("1.1.1.1", 0);
expect(isLoginBlocked("1.1.1.1", 1000)).toBe(true);
expect(isLoginBlocked("1.1.1.1", 15 * 60e3 + 1)).toBe(false);
// 20 kegagalan dari 20 IP berbeda dalam 1 jam → IP baru pun diblokir
expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
expect(clientIp(new Headers())).toBe("unknown");
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi. Cookie: `httpOnly`, `sameSite: "lax"`, `secure` saat production, `maxAge` 30 hari. Pesan login: "Password salah" / "Terlalu banyak percobaan, coba lagi nanti". `BottomNav`: Beranda `/`, Transaksi `/transaksi`, (+) `/transaksi/baru`, Budget `/budget`, Akun `/akun`; ikon ⚙ di header → `/pengaturan`. `next.config.ts`: `output: "standalone"`, header keamanan dari spec, `serverActions.allowedOrigins` dari host `APP_ORIGIN`. `.env.local` (git-ignored) diisi nilai dev yang dibuat sendiri; password dev dicatat sebagai komentar di file itu.
- [ ] `npm test` → PASS; di browser pane: `/` → dialihkan ke `/login`, password salah → pesan, password benar → placeholder Beranda dengan nav bawah.
- [ ] Commit `feat: single-user login and app shell`.

### Task 7: API untuk aplikasi trading

**Files:** Create `lib/auth/api-token.ts`, `app/api/v1/safe-to-trade/route.ts`, `app/api/v1/accounts/route.ts`, `app/api/v1/categories/route.ts`, `app/api/v1/transactions/route.ts`, `docs/api.md` · Test `app/api/v1/api.test.ts`

**Interfaces — Consumes:** `getDb`, `loadFinanceData`, `computeSnapshot`, `accountBalances`, `createTransaction`, `apiTxnInputSchema`, `DomainError`, `todayJakarta`, `monthOf`. **Produces:** `isValidApiToken(authHeader: string | null, expected: string | undefined): boolean` (false jika `expected` kosong/< 32; bandingkan digest SHA-256 dengan `timingSafeEqual`) · kontrak HTTP di tabel API spec. Semua route `dynamic = "force-dynamic"`. Error: 401 `{ error: "unauthorized" }`; JSON rusak 400 `{ error: "invalid_json" }`; zod 400 `{ error: "invalid", issues }`; `DomainError` 400 `{ error: message }`. `source` selalu `"trading"`.

- [ ] Tulis test (`DATABASE_PATH=":memory:"`, `TRADING_API_TOKEN="x".repeat(32)` di-set sebelum import; migrate + seed di `beforeAll`):
```ts
expect((await GET_safe(req())).status).toBe(401);
expect((await GET_safe(req({ auth: "Bearer salah" }))).status).toBe(401);
const ok = await GET_safe(req({ auth: `Bearer ${token}` }));
expect(ok.status).toBe(200); expect((await ok.json()).currency).toBe("IDR");
expect((await POST_txn(req({ auth, body: valid }))).status).toBe(201);
const dup = await POST_txn(req({ auth, body: valid }));
expect(dup.status).toBe(200); expect((await dup.json()).duplicate).toBe(true);
expect((await POST_txn(req({ auth, body: { ...valid, externalId: undefined } }))).status).toBe(400);
expect((await POST_txn(req({ auth, rawBody: "bukan json" }))).status).toBe(400);
expect(isValidApiToken("Bearer abc", undefined)).toBe(false);
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi + `docs/api.md` (contoh `curl` tiap endpoint dan pola setor/tarik/profit/rugi dari spec).
- [ ] `npm test` → PASS.
- [ ] Commit `feat: token-protected trading API`.

### Task 8: Akun, budget, pengaturan (UI)

**Files:** Create `app/(app)/akun/{page.tsx,actions.ts}`, `app/(app)/budget/{page.tsx,actions.ts}`, `app/(app)/pengaturan/{page.tsx,actions.ts}`

**Interfaces — Consumes:** `requireSession`, `parseRupiah`, `formatIDR`, fungsi akun/kategori/settings (Task 5), `loadFinanceData`, `accountBalances`, `computeSnapshot`, `logout`. **Produces:** server actions per halaman (`requireSession()` dulu; `DomainError`/zod → pesan di form; lalu `revalidatePath`).

- [ ] Akun: daftar per jenis dengan saldo, buat/edit (nominal lewat `parseRupiah`; target & tanggal target untuk savings), "Sesuaikan saldo", arsip. Budget: budget per kategori expense + pemakaian bulan ini dari snapshot. Pengaturan: kategori (tambah/ubah/arsip), bulan dana darurat, status token API "terpasang/belum", link export `/export` (dibuat di Task 9), logout.
- [ ] Browser pane, viewport 375×812: buat BCA (spending, 5.000.000) dan Dana Darurat (emergency, 1.000.000); budget Makan 3.000.000; sesuaikan BCA ke 4.900.000 → saldo 4.900.000; arsip BCA → pesan "Saldo harus 0 sebelum akun diarsip"; bulan dana darurat jadi 3 → tersimpan. Tidak ada scroll horizontal.
- [ ] Commit `feat: accounts, budgets and settings`.

### Task 9: Catat transaksi & export CSV

**Files:** Create `app/(app)/transaksi/page.tsx`, `app/(app)/transaksi/baru/page.tsx`, `app/(app)/transaksi/[id]/page.tsx`, `app/(app)/transaksi/actions.ts`, `components/TransactionForm.tsx`, `components/AmountInput.tsx`, `app/(app)/export/route.ts`, `lib/csv.ts`, `app/manifest.ts` · Test `lib/csv.test.ts`

**Interfaces — Consumes:** `requireSession`, `parseRupiah`, `formatIDR`, `todayJakarta`, `listTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `listCategoriesByUsage`, `lastUsedAccountId`. **Produces:** server actions `saveTransaction(prev, formData)` dan `removeTransaction(id: number)` (`requireSession()` dulu, lalu `revalidatePath`; `DomainError`/zod → pesan di form) · `toCsv(rows: (string | number)[][]): string` (CRLF; kutip jika ada koma/kutip/baris baru; sel teks yang diawali `= + - @` diberi awalan `'`). Route export memanggil `requireSession()`, kolom `tanggal,tipe,jumlah,akun,akun_tujuan,kategori,catatan,sumber`, diawali BOM UTF-8, nama file `finance-YYYY-MM-DD.csv`.

- [ ] Tulis test:
```ts
expect(toCsv([["a,b", 'c"d', 5]])).toBe('"a,b","c""d",5\r\n');
expect(toCsv([["=SUM(A1)"]])).toBe("'=SUM(A1)\r\n");
expect(toCsv([["baris\nbaru"]])).toBe('"baris\nbaru"\r\n');
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi `toCsv` + route export; form cepat sesuai spec: tipe (Keluar/Masuk/Transfer), `AmountInput` (`inputMode="numeric"`, tampil dengan pemisah ribuan, dikirim lewat `parseRupiah`), chip dari `listCategoriesByUsage`, akun default `lastUsedAccountId`, tanggal default `todayJakarta()`, catatan opsional; daftar dengan filter bulan/kategori/akun; edit; hapus dengan konfirmasi; `app/manifest.ts` (nama "Finance", `display: "standalone"`, ikon 192/512).
- [ ] `npm test` → PASS; browser pane 375×812 dengan akun dari Task 8: (+) → "25.000", Makan, catatan "=1+1", simpan → "Makan · Rp 25.000" hari ini; "12,5" → ditolak dengan pesan; edit jadi 30.000 → berubah; export → CSV berisi baris itu dengan catatan `'=1+1`; hapus → hilang. Tidak ada scroll horizontal.
- [ ] Commit `feat: transaction entry, list and CSV export`.

### Task 10: Dashboard

**Files:** Modify `app/(app)/page.tsx` (ganti placeholder) · Create `components/SafeToTradeCard.tsx`, `components/BudgetBars.tsx`, `components/SuggestionList.tsx`

**Interfaces — Consumes:** `requireSession`, `loadFinanceData`, `computeSnapshot`, `ruleSuggestions`, `formatIDR`, `monthOf`, `todayJakarta`, `addMonths`.

- [ ] Dashboard sesuai sketsa spec: pilih bulan lewat `?bulan=YYYY-MM` (tidak valid → bulan ini), kartu Masuk/Keluar/Sisa, kartu dana aman + rincian (tampilkan `reason` jika ada), daftar saran, bar budget (warna ok/warn/over), kategori terbesar, target tabungan, hasil trading bulan ini. Belum ada akun → kartu "Tambah akun dulu" ke `/akun`.
- [ ] Browser pane: dengan akun dari Task 8 + beberapa transaksi, angka cocok dengan hitungan manual; ganti ke bulan lalu → perbandingan bulan penuh; viewport 375×812 tanpa scroll horizontal.
- [ ] Commit `feat: dashboard`.

### Task 11: Saran AI

**Files:** Create `lib/ai.ts`, `app/(app)/actions.ts`, `components/AiInsightCard.tsx` · Modify `app/(app)/page.tsx` · Test `lib/ai.test.ts`

**Interfaces — Consumes:** `FinanceSnapshot`, `Suggestion`, `computeSnapshot`, `ruleSuggestions`, `loadFinanceData`, tabel `aiInsights`. **Produces:** `aiEnabled(): boolean` · `buildAiSummary(s: FinanceSnapshot, rules: Suggestion[]): AiSummary` · `aiResultSchema` (zod: `{ ringkasan: string; saran: { judul; detail; prioritas: "tinggi" | "sedang" | "rendah" }[] }`, 1–6 saran) · `AiInsight = z.infer<typeof aiResultSchema> & { createdAt: string; model: string }` · `AiSummary` = objek JSON biasa hasil `buildAiSummary` · `requestAiInsight(db, month, today, client?: Anthropic): Promise<{ ok: true; insight: AiInsight } | { ok: false; error: string }>` · `latestAiInsight(db, month): AiInsight | null` · action `askAi(month: string)` (`requireSession()` dulu).

- [ ] **Sebelum menulis `lib/ai.ts`, load skill `claude-api`** dan pastikan binding TypeScript untuk `client.beta.messages.create` dengan `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`, `max_tokens: 16000`, `output_config: { effort: "medium", format: <JSON schema dari aiResultSchema> }`, plus penanganan `stop_reason: "refusal"`.
- [ ] Tulis test (client tiruan berbentuk `{ beta: { messages: { create } } }`):
```ts
const json = JSON.stringify(buildAiSummary(snapWithNote("catatan-rahasia", "BCA Utama"), []));
expect(json).not.toContain("catatan-rahasia"); expect(json).not.toContain("BCA Utama"); expect(json).toContain("Makan");
// respons valid → ok true, 1 baris ai_insights dengan model & token
// stop_reason "refusal" → { ok: false, error: "AI tidak bisa memberi saran untuk data ini." }
// teks tidak sesuai schema → { ok: false, error: "Jawaban AI tidak terbaca, coba lagi." }
// create melempar error → { ok: false, error: "Gagal menghubungi AI, coba lagi nanti." }
// AI_MODEL "claude-opus-5-5" → request berisi fallbacks "default"; "claude-haiku-5-5" → tanpa fallbacks
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi; tombol "Minta saran AI" + `AiInsightCard` (hasil terakhir + waktunya) di dashboard, disembunyikan jika `aiEnabled()` false.
- [ ] `npm test` → PASS. Uji dengan API key asli **hanya setelah user setuju** (± Rp1.000 per klik).
- [ ] Commit `feat: on-demand AI suggestions`.

### Task 12: Backup, Docker, Nginx, README

**Files:** Create `lib/backup.ts`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deploy/nginx-finance.conf`, `README.md` · Modify `instrumentation.ts` · Test `lib/backup.test.ts`

**Interfaces — Consumes:** `getSqlite`, `todayJakarta`. **Produces:** `runDailyBackup(sqlite: Database.Database, dir: string, today: string, keep = 14): Promise<string | null>` (file `finance-YYYY-MM-DD.db`; null jika backup hari itu sudah ada; hapus yang tertua di atas `keep`). `instrumentation.ts` menjadwalkan `runDailyBackup` tiap jam ke `dirname(DATABASE_PATH)/backups`.

- [ ] Tulis test (folder `fs.mkdtempSync`):
```ts
expect(path.basename((await runDailyBackup(sqlite, dir, "2026-11-27"))!)).toBe("finance-2026-11-27.db");
expect(await runDailyBackup(sqlite, dir, "2026-11-27")).toBeNull();
// dengan 15 file backup lama → setelah run tersisa 14, yang tertua terhapus
```
- [ ] `npm test` → FAIL.
- [ ] Implementasi backup. `Dockerfile` multi-stage `node:24-slim` (build → runner berisi `.next/standalone`, `.next/static`, `public`, `drizzle/`; `USER node`; `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`, `DATABASE_PATH=/app/data/finance.db`; `CMD ["node", "server.js"]`). `docker-compose.yml` sesuai spec. `deploy/nginx-finance.conf` sesuai spec (+ `client_max_body_size 1m`). README: DNS record A, `git clone`, `.env` dari `.env.example` (`openssl rand -hex 32` untuk secret & token, `npm run hash-password` untuk hash), `mkdir data && sudo chown 1000:1000 data`, `docker compose up -d --build`, pasang config Nginx + `sudo nginx -t && sudo systemctl reload nginx`, `sudo certbot --nginx -d finance.<domainmu>`, cara update, restore backup, reset password, saran salin backup ke luar VPS.
- [ ] `npm test` → PASS; `npm run build` → sukses; jika Docker tersedia di laptop: `docker compose up -d --build` lalu `curl -I http://127.0.0.1:3100/login` → `200`.
- [ ] Commit `feat: daily backup and docker deployment`.

### Penutup

- [ ] Satu reviewer baru (model paling kuat) memeriksa seluruh branch terhadap spec; perbaiki temuan yang valid.
- [ ] Ulang semua test + build, lalu satu putaran browser pane penuh (login → akun → budget → transaksi → dashboard → export).
- [ ] Deploy ke VPS dilakukan oleh kamu mengikuti README (saya tidak punya akses SSH ke VPS-mu).

## Eksekusi

**Native (rekomendasi):** saya kerjakan semua task di sesi ini, berurutan, lalu satu reviewer independen di akhir. Alasannya: tiap task bergantung pada interface task sebelumnya (`computeSnapshot` dipakai API, dashboard, dan AI), dan kesalahan tertangkap oleh test per task. Alternatifnya, *subagent-driven* (agent baru + reviewer per task) lebih ketat tapi jauh lebih mahal — bilang saja kalau mau itu.
