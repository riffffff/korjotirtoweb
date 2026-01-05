# API Endpoints Documentation

## 📋 Daftar Endpoint

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/bills` | GET | List semua tagihan |
| `/api/bills/period/:period` | GET | List tagihan per periode |
| `/api/customers/:id/bills/:year/:month` | GET | Detail tagihan customer |
| `/api/bills/:id/pay` | PATCH | Bayar tagihan |

---

## Response Structure (Full Nested)

Semua endpoint menggunakan struktur nested untuk relasi:

```json
{
  "success": true,
  "data": {
    "id": 103,
    "customer": {
      "id": 28,
      "name": "Budi Santoso",
      "customerNumber": 1001
    },
    "meterReading": {
      "period": "2026-01",
      "meterStart": 150,
      "meterEnd": 178,
      "usage": 28
    },
    "totalAmount": 36600,
    "paymentStatus": "pending",
    "penalty": 0,
    "amountPaid": 0,
    "remaining": 36600,
    "paidAt": null,
    "items": [
      { "type": "ADMIN_FEE", "usage": 0, "rate": 5000, "amount": 5000 },
      { "type": "K1", "usage": 28, "rate": 1200, "amount": 33600 }
    ]
  }
}
```

---

## 1. GET /api/bills

List semua tagihan (sorted by newest)

---

## 2. GET /api/bills/period/:period

List tagihan untuk periode tertentu. Contoh: `/api/bills/period/2026-01`

---

## 3. GET /api/customers/:id/bills/:year/:month

Detail tagihan customer. Contoh: `/api/customers/28/bills/2026/01`

**Error 404:** `{ "success": false, "error": "Bill not found" }`

---

## 4. PATCH /api/bills/:id/pay

Bayar tagihan.

**Request Body:**
```json
{ "amountPaid": 40000, "penalty": 5000 }
```

**Response Messages:**
- Lunas: `"Payment complete! Change: Rp 3,400"`
- Sebagian: `"Partial payment recorded. Remaining: Rp 21,600"`

---

## Status & Item Types

| Payment Status | Deskripsi |
|----------------|-----------|
| `pending` | Belum bayar |
| `partial` | Sebagian |
| `paid` | Lunas |

| Item Type | Deskripsi |
|-----------|-----------|
| `ADMIN_FEE` | Biaya admin |
| `K1` | Tarif 0-40m³ (Rp1.200) |
| `K2` | Tarif >40m³ (Rp3.000) |
