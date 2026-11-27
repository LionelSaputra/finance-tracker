---
version: 1
slug: "app-app-page-tsx"
primary_target: "app/(app)/page.tsx"
related_targets: ["app/(app)/layout.tsx"]
---

## Scope

Whole app redesign (Beranda first; Transaksi, form catat, Budget, Akun, Pengaturan, login/register, shell). Mode: Operate. Phone-first web app, two columns at ≥1024px.

## Job

Owner opens the app to answer "masih aman bulan ini?" and "boleh setor berapa hari ini?"; records by evening recap (phone) and weekly recap (laptop). Beranda actions: Catat setor (transfer to trading), budget row → its transactions, recap marker → Lanjut rekap. Mepet = spending ahead of the month's pace (allowance = max(total budget, average monthly spend)).

## Direction contract

THESIS: The month is an Indonesian wall calendar: tanggal muda to tanggal tua, today ringed in marker, days that ran ahead of pace printed red. Refuses the fintech card stack with a balance hero.

OWN-WORLD: Warm calendar paper (#fbfaf6) with black ink rules, no cards or shadows; red (#d7261e) only for kebablasan/Lewat, green (#1f7a4d) for Aman, amber for Mepet, marker blue (#1f5fd1) reserved for today. Archivo Narrow numerals at calendar scale (date 84px, status 46px) over system-ui body; 2px ink rules frame header and nav.

STORY: Owner sees today's leaf (date, dana aman with state and time, Catat setor), the month verdict with sisa per hari, the calendar of daily spending, then budget lines; taps a line or a day to see its transactions; continues the recap.

FIRST VIEWPORT: Header "Finance" + settings; today leaf (84px date left; Boleh disetor / Tahan / Belum bisa dihitung, amount, Catat setor right); status word + sisa per hari; month nav; 7-column calendar with spend dots, red ahead-of-pace days, ringed today, per-day allowance on future days; bottom nav with black + button.

FORM: Kalender dinding Indonesia, position 1 of my ordered list (pick); seed: e816e30e7d9932e2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

Dark mode out of scope this round. Product name stays "Finance" (undecided in PRODUCT.md).
