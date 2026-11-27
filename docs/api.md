# API untuk aplikasi trading

Semua endpoint ada di `/api/v1` dan butuh header:

```
Authorization: Bearer <TRADING_API_TOKEN>
```

Token diambil dari `.env` (`TRADING_API_TOKEN`, minimal 32 karakter). Kalau token kosong, semua endpoint menjawab `401`.

Semua nominal adalah **integer rupiah**. Tanggal memakai format `YYYY-MM-DD` (zona waktu Asia/Jakarta).

## `GET /api/v1/safe-to-trade`

Berapa dana yang aman dipakai trading sekarang.

```bash
curl -H "Authorization: Bearer $TOKEN" https://finance.domainmu.com/api/v1/safe-to-trade
```

```json
{
  "currency": "IDR",
  "amount": 1850000,
  "breakdown": {
    "freeCash": 6100000,
    "remainingBudget": 2000000,
    "emergencyTarget": 24000000,
    "emergencyCurrent": 21750000,
    "emergencyGap": 2250000
  },
  "reason": null,
  "asOf": "2026-11-27T08:00:00.000Z"
}
```

`amount = max(0, freeCash − remainingBudget − emergencyGap)`. `remainingBudget` = yang lebih besar antara sisa budget bulan ini dan sisa rata-rata pengeluaran bulanan (rata-rata − pengeluaran bulan ini), jadi uang hidup tetap ditahan walau budget belum diisi. Kalau data pengeluaran belum cukup, `amount` = 0 dan `reason` = `"belum cukup data"`.

## `GET /api/v1/accounts`

Akun aktif beserta saldonya: `[{ "id": 3, "name": "Broker", "kind": "trading", "balance": 5000000 }]`.
`kind` salah satu dari `spending`, `savings`, `emergency`, `trading`.

## `GET /api/v1/categories`

Kategori aktif: `[{ "id": 4, "name": "Profit Trading", "kind": "income", "group": null }]`.

## `POST /api/v1/transactions`

Mencatat transaksi dari aplikasi trading.

```bash
curl -X POST https://finance.domainmu.com/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"externalId":"trade-2026-11-27-001","occurredOn":"2026-11-27","type":"income","amount":150000,"accountId":3,"categoryId":4,"note":"BBCA"}'
```

| Field | Wajib | Keterangan |
|---|---|---|
| `externalId` | ya | ID unik dari aplikasi trading (≤ 100 karakter). Kirim ulang dengan ID yang sama = aman, tidak dobel. |
| `occurredOn` | ya | `YYYY-MM-DD` |
| `type` | ya | `income`, `expense`, atau `transfer` |
| `amount` | ya | integer 1 … 1.000.000.000.000 |
| `accountId` | ya | akun sumber |
| `toAccountId` | transfer | akun tujuan, harus beda dari `accountId` |
| `categoryId` | income/expense | `kind` kategori harus sama dengan `type`; transfer tidak memakai kategori |
| `note` | tidak | ≤ 500 karakter |

Jawaban:
- `201 {"id": 12}` — tercatat.
- `200 {"id": 12, "duplicate": true}` — `externalId` ini sudah pernah dicatat; tidak ada yang berubah.
- `400 {"error": "invalid_json"}` — body bukan JSON.
- `400 {"error": "invalid", "issues": {...}}` — field tidak valid.
- `400 {"error": "Kategori tidak cocok dengan tipe transaksi"}` — aturan dilanggar (pesan bisa langsung ditampilkan).
- `401 {"error": "unauthorized"}` — token salah atau API dimatikan.

## Pola pemakaian

| Kejadian | Transaksi |
|---|---|
| Setor dana ke broker | `transfer` dari akun `spending` ke akun `trading` |
| Tarik dana dari broker | `transfer` dari akun `trading` ke akun `spending` |
| Profit terealisasi | `income` kategori "Profit Trading" di akun `trading` |
| Rugi atau fee | `expense` kategori "Rugi & Biaya Trading" di akun `trading` |

Transaksi di akun `trading` tidak ikut dihitung sebagai pengeluaran harian atau pembagian 50/30/20; hasilnya tampil terpisah sebagai "hasil trading".
