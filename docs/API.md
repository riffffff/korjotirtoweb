# API Endpoints Documentation

## 📋 Daftar Endpoint

### Bills

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/bills/period/:period` | GET | List tagihan per periode |
| `/api/customers/:id/bills/:year/:month` | GET | Detail tagihan customer |

### Customers

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/customers` | GET | List semua customer |
| `/api/customers/:id` | GET | Detail customer + riwayat tagihan |
| `/api/customers/:id/pay` | PATCH | Bayar tagihan (FIFO) |

---

## Bills Endpoints

### 1. GET /api/bills/period/:period

List tagihan untuk periode tertentu.

**Contoh:** `/api/bills/period/2026-01`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 103,
      "customer": {
        "id": 28,
        "name": "Budi Santoso",
        "customerNumber": 1001,
        "outstandingBalance": 25000
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
  ]
}
```

---

### 2. GET /api/customers/:id/bills/:year/:month

Detail tagihan customer untuk bulan tertentu.

**Contoh:** `/api/customers/28/bills/2026/01`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 103,
    "customer": {
      "id": 28,
      "name": "Budi Santoso",
      "customerNumber": 1001,
      "phone": "08123456789",
      "totalBill": 150000,
      "totalPaid": 125000,
      "outstandingBalance": 25000
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
    "change": 0,
    "paidAt": null,
    "items": [
      { "type": "ADMIN_FEE", "usage": 0, "rate": 5000, "amount": 5000 },
      { "type": "K1", "usage": 28, "rate": 1200, "amount": 33600 }
    ]
  }
}
```

**Error 404:** `{ "success": false, "error": "Bill not found" }`

---

## Customers Endpoints

### 3. GET /api/customers

List semua customer dengan outstanding balance.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 28,
      "name": "Budi Santoso",
      "customerNumber": 1001,
      "phone": "08123456789",
      "totalBill": 150000,
      "totalPaid": 125000,
      "outstandingBalance": 25000
    }
  ]
}
```

---

### 4. GET /api/customers/:id

Detail customer dengan riwayat tagihan.

**Contoh:** `/api/customers/28`

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 28,
      "name": "Budi Santoso",
      "customerNumber": 1001,
      "phone": "08123456789",
      "totalBill": 150000,
      "totalPaid": 125000,
      "outstandingBalance": 25000
    },
    "bills": [
      {
        "id": 103,
        "period": "2026-01",
        "meterStart": 150,
        "meterEnd": 178,
        "usage": 28,
        "totalAmount": 36600,
        "amountPaid": 0,
        "remaining": 36600,
        "paymentStatus": "pending",
        "paidAt": null,
        "items": [
          { "type": "ADMIN_FEE", "usage": 0, "rate": 5000, "amount": 5000 },
          { "type": "K1", "usage": 28, "rate": 1200, "amount": 33600 }
        ]
      }
    ]
  }
}
```

**Error 404:** `{ "success": false, "error": "Customer not found" }`

---

### 5. PATCH /api/customers/:id/pay

Proses pembayaran untuk customer menggunakan alokasi FIFO (tagihan terlama dibayar duluan).

**Request Body:**
```json
{
  "amount": 50000,
  "role": "admin"
}
```

| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `amount` | number | ✅ | Jumlah pembayaran |
| `role` | string | ✅ | Harus `"admin"` |

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 28,
      "name": "Budi Santoso",
      "totalBill": 150000,
      "totalPaid": 175000,
      "outstandingBalance": 0
    },
    "payment": {
      "amount": 50000,
      "allocated": 25000,
      "change": 25000
    },
    "billsUpdated": [
      {
        "id": 103,
        "period": "2026-01",
        "totalAmount": 36600,
        "amountPaid": 36600,
        "remaining": 0,
        "status": "paid"
      }
    ]
  },
  "message": "Payment complete! Change: Rp 25,000"
}
```

**Response Messages:**
- Lunas dengan kembalian: `"Payment complete! Change: Rp X"`
- Beberapa tagihan lunas: `"Payment processed. X bill(s) paid."`
- Pembayaran sebagian: `"Partial payment recorded."`

**Error Responses:**
- 400: `{ "success": false, "error": "Invalid payment amount" }`
- 403: `{ "success": false, "error": "Unauthorized: Only admin can process payments" }`
- 404: `{ "success": false, "error": "Customer not found" }`

---

## Status & Item Types

### Payment Status

| Status | Deskripsi |
|--------|-----------|
| `pending` | Belum bayar |
| `partial` | Sebagian terbayar |
| `paid` | Lunas |

### Item Types

| Type | Deskripsi |
|------|-----------|
| `ADMIN_FEE` | Biaya admin (Rp5.000/bulan) |
| `K1` | Tarif 0-40m³ (Rp1.200/m³) |
| `K2` | Tarif >40m³ (Rp3.000/m³) |

---

## FIFO Payment System

Sistem pembayaran menggunakan metode **FIFO (First In, First Out)**:

1. Customer melakukan pembayaran dengan jumlah tertentu
2. Sistem mengambil tagihan yang belum lunas, diurutkan dari periode terlama
3. Pembayaran dialokasikan ke tagihan terlama terlebih dahulu
4. Jika tagihan pertama lunas dan masih ada sisa, lanjut ke tagihan berikutnya
5. Jika pembayaran melebihi total tagihan, kembalian (change) dihitung
6. Total customer (`totalPaid`, `outstandingBalance`) diupdate

**Contoh:**
- Customer punya 2 tagihan: Jan (Rp30.000) dan Feb (Rp40.000)
- Bayar Rp50.000
- Alokasi: Jan = Rp30.000 (lunas), Feb = Rp20.000 (partial)
- Sisa di Feb: Rp20.000
