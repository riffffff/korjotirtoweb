# DOKUMEN SPESIFIKASI REFAKTOR ARSITEKTUR: KORJO TIRTO V2

Dokumen ini adalah panduan teknis menyeluruh untuk melakukan refaktor arsitektur aplikasi **Korjo Tirto** (Sistem Pembayaran dan Pencatatan Meter Air HIPPAM Sukorejo) menggunakan pendekatan *In-Place Surgical Refactor*.

---

## 1. TUJUAN UTAMA REFAKTOR

1. **Migrasi Primary Key ke UUID**: Mengubah seluruh Primary Key (`id`) dan Foreign Key dari `Int` (auto-increment) menjadi `UUID` (`@db.Uuid`) untuk menghilangkan ambiguitas antara `id` database dengan `customerNumber` (nomor urut pelanggan).
2. **Penamaan Domain & Interface yang Tegas**: Menghapus istilah yang rancu antara saldo tabungan warga dan sisa utang tagihan.
   - `depositBalance`: Saldo simpanan/deposit milik warga dari uang kembalian yang dititipkan.
   - `unpaidTotal`: Total sisa tagihan (utang) warga yang belum dibayar beserta denda.
3. **Implementasi Soft Delete Konsisten**: Menggunakan kolom `deletedAt` pada seluruh entitas transaksional (`Customer`, `MeterReading`, `Bill`, `BillItem`, `Payment`). Tidak ada lagi operasi *hard delete* kecuali pada fitur reset database/maintenance.
4. **Arsitektur Berlapis (Layered Architecture)**:
   - Memisahkan kode Client (`services/client/`) dan kode Server (`services/server/`).
   - Mengeluarkan seluruh logika bisnis dan perhitungan matematika dari `app/api/.../route.ts` ke dalam `lib/billing.ts` dan `services/server/`.
5. **Keamanan & Autentikasi Server-Side**: Mengganti validasi `role` dari body request JSON dengan token sesi terverifikasi (HTTP-Only Cookie / JWT Header) dan menghapus password statis di sisi client.
6. **Dokumentasi Kode Standar**: Menambahkan JSDoc ringkas pada seluruh fungsi domain, service, dan helper utama.

---

## 2. STRUKTUR DIREKTORI TARGET

Pertahankan seluruh konfigurasi UI (`app/globals.css`, `components/ui/`, `components/layout/`, `public/`) dan rombak lapisan data serta logika mengikuti struktur berikut:

```text
├── prisma/
│   ├── schema.prisma                # Skema baru berbasis UUID & Soft Delete
│   └── seed.ts                      # Seeder yang disesuaikan dengan skema baru
├── types/
│   └── index.ts                     # Single Source of Truth untuk seluruh Type & Interface
├── lib/
│   ├── prisma.ts                    # Singleton Prisma Client + Soft Delete filter helper
│   ├── api-response.ts              # Standar HTTP JSON response (successResponse / errorResponse)
│   ├── auth.ts                      # Utilitas pembuatan dan verifikasi token/sesi admin
│   ├── billing.ts                   # Pure functions: hitung tarif K1/K2, denda, dan alokasi FIFO
│   ├── excel-parser.ts              # Utilitas parsing file Excel tagihan bulanan
│   ├── whatsapp.ts                  # Generator pesan dan URL WhatsApp
│   ├── formatCurrency.ts            # Formatter Rupiah
│   └── formatDate.ts                # Formatter Tanggal Indonesia
├── services/
│   ├── client/                      # HTTP Client Fetcher (dipanggil oleh komponen/hooks React)
│   │   ├── api.ts
│   │   ├── auth.client.ts
│   │   └── customer.client.ts
│   └── server/                      # Business Logic & Database Transaction (dipanggil oleh API Routes)
│       ├── auth.service.ts
│       ├── bill.service.ts
│       ├── customer.service.ts
│       ├── dashboard.service.ts
│       ├── import.service.ts
│       ├── payment.service.ts
│       └── setting.service.ts
└── app/
    └── api/                         # Thin Controllers (hanya validasi input, panggil service, return response)
```

---

## 3. TAHAP 1: PEMBARUAN SKEMA DATABASE (`prisma/schema.prisma`)

Ganti isi `prisma/schema.prisma` menjadi struktur berikut:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Customer {
  id             String         @id @default(uuid()) @db.Uuid
  customerNumber Int            @unique @map("customer_number")
  name           String         @db.VarChar(255)
  phone          String?        @db.VarChar(20)
  totalBill      Decimal        @default(0) @map("total_bill") @db.Decimal(12, 2)
  totalPaid      Decimal        @default(0) @map("total_paid") @db.Decimal(12, 2)
  depositBalance Decimal        @default(0) @map("balance") @db.Decimal(12, 2)
  lastNotifiedAt DateTime?      @map("last_notified_at") @db.Timestamp(6)
  createdAt      DateTime       @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime       @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime?      @map("deleted_at") @db.Timestamp(6)

  meterReadings  MeterReading[]
  payments       Payment[]

  @@index([deletedAt])
  @@map("customers")
}

model MeterReading {
  id         String    @id @default(uuid()) @db.Uuid
  customerId String    @map("customer_id") @db.Uuid
  period     String    @db.VarChar(7) // Format: YYYY-MM
  meterStart Int       @default(0) @map("meter_start")
  meterEnd   Int       @map("meter_end")
  usage      Int       @default(0)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt  DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamp(6)

  customer   Customer  @relation(fields: [customerId], references: [id])
  bill       Bill?

  @@unique([customerId, period])
  @@index([deletedAt])
  @@map("meter_readings")
}

model Bill {
  id             String       @id @default(uuid()) @db.Uuid
  meterReadingId String       @unique @map("meter_reading_id") @db.Uuid
  totalAmount    Decimal      @default(0) @map("total_amount") @db.Decimal(12, 2)
  paymentStatus  String       @default("UNPAID") @map("payment_status") @db.VarChar(20) // UNPAID | PARTIAL | PAID
  penalty        Decimal      @default(0) @db.Decimal(12, 2)
  amountPaid     Decimal      @default(0) @map("amount_paid") @db.Decimal(12, 2)
  remaining      Decimal      @default(0) @db.Decimal(12, 2)
  change         Decimal      @default(0) @db.Decimal(12, 2)
  paidAt         DateTime?    @map("paid_at") @db.Timestamp(6)
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime     @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime?    @map("deleted_at") @db.Timestamp(6)

  meterReading   MeterReading @relation(fields: [meterReadingId], references: [id])
  items          BillItem[]

  @@index([deletedAt])
  @@map("bills")
}

model BillItem {
  id        String    @id @default(uuid()) @db.Uuid
  billId    String    @map("bill_id") @db.Uuid
  type      String    @db.VarChar(20) // BEBAN | K1 | K2
  usage     Int       @default(0)
  rate      Int       @default(0)
  amount    Decimal   @default(0) @db.Decimal(12, 2)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamp(6)

  bill      Bill      @relation(fields: [billId], references: [id])

  @@index([deletedAt])
  @@map("bill_items")
}

model Payment {
  id          String    @id @default(uuid()) @db.Uuid
  customerId  String    @map("customer_id") @db.Uuid
  amount      Decimal   @db.Decimal(12, 2)
  description String?   @db.VarChar
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamp(6)

  customer    Customer  @relation(fields: [customerId], references: [id])

  @@index([deletedAt])
  @@map("payments")
}

model Setting {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique @db.VarChar
  value       String   @db.VarChar
  description String?  @db.VarChar
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)

  @@map("settings")
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  username  String   @unique @db.VarChar
  password  String   @db.VarChar
  name      String   @db.VarChar
  role      String   @default("admin") @db.VarChar
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)

  @@map("users")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  action      String   @db.VarChar(50)
  entityType  String   @map("entity_type") @db.VarChar(100)
  entityId    String?  @map("entity_id") @db.VarChar(50)
  performedBy String   @default("System") @map("performed_by") @db.VarChar(255)
  ipAddress   String?  @map("ip_address") @db.VarChar(50)
  details     Json?
  description String?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  @@map("audit_logs")
}
```

### Aturan Soft Delete Unik (`MeterReading`)
Karena `MeterReading` memiliki constraint `@@unique([customerId, period])`, ketika tagihan suatu periode di-*soft delete*, dan kemudian admin membuat ulang tagihan pada periode yang sama untuk pelanggan tersebut:
- Service harus mengecek apakah sudah ada record `MeterReading` dengan `customerId` dan `period` yang sama (termasuk yang `deletedAt != null`).
- Jika ditemukan record yang sudah di-*soft delete*, lakukan **Update/Restore** (`deletedAt: null`) beserta pembaruan nilai meteran dan tagihan, bukan `create` baru, agar tidak melanggar unique constraint PostgreSQL.

---

## 4. TAHAP 2: STANDARDISASI TIPE DATA (`types/index.ts`)

Hapus seluruh tipe lama yang duplikat (`CustomerSimple`, `CustomerListItem`, `Customer`) dan gantikan dengan kontrak tipe tunggal berikut di `types/index.ts`:

```typescript
export type UserRole = 'admin';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type BillItemType = 'BEBAN' | 'K1' | 'K2';

export interface BillItemDTO {
  id?: string;
  type: BillItemType;
  usage: number;
  rate: number;
  amount: number;
}

export interface BillDTO {
  id: string;
  period: string; // Format: "YYYY-MM"
  meterStart: number;
  meterEnd: number;
  usage: number;
  baseAmount: number; // Tagihan pokok sebelum denda
  penalty: number; // Denda keterlambatan
  totalWithPenalty: number; // baseAmount + penalty
  amountPaid: number;
  remainingDebt: number; // Sisa yang belum dibayar (termasuk denda)
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  items: BillItemDTO[];
}

export interface PaymentHistoryDTO {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
}

/**
 * Representasi ringkas pelanggan untuk daftar di halaman utama
 */
export interface CustomerSummaryDTO {
  id: string;
  customerNumber: number;
  name: string;
  phone: string | null;
  totalBill: number;
  totalPaid: number;
  unpaidTotal: number; // Sisa tagihan/utang yang harus dibayar (dahulu: outstanding)
  depositBalance: number; // Saldo tabungan warga (dahulu: balance)
  lastNotifiedAt: string | null;
}

/**
 * Representasi lengkap pelanggan untuk halaman detail
 */
export interface CustomerDetailDTO {
  customer: CustomerSummaryDTO;
  bills: BillDTO[];
  payments: PaymentHistoryDTO[];
}

export interface PeriodStatDTO {
  period: string;
  periodLabel: string;
  totalBills: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: number;
  paidAmount: number;
}

export interface DashboardStatsDTO {
  totalCustomers: number;
  totalRevenue: number;
  totalDepositBalance: number;
  totalUnpaidDebt: number;
  periods: PeriodStatDTO[];
}
```

---

## 5. TAHAP 3: MODUL DOMAIN & HELPER INTI (`lib/`)

### 5.1. `lib/api-response.ts`
Buat fungsi standar untuk seluruh API Route:
- `successResponse<T>(data?: T, message?: string, status = 200)`
- `errorResponse(error: string, status = 400)`

### 5.2. `lib/billing.ts`
Pusatkan seluruh rumus perhitungan di file ini. Wajib dilengkapi JSDoc pada setiap fungsi:
1. `DEFAULT_BILLING_CONFIG`:
   - `RATE_K1: 1800`
   - `RATE_K2: 3000`
   - `K1_LIMIT: 40`
   - `ADMIN_FEE: 3000`
   - `PENALTY_FEE: 5000`
2. `calculateWaterBill(meterStart: number, meterEnd: number, config?: Partial<BillingConfig>)`:
   - Menghitung `usage = Math.max(0, meterEnd - meterStart)`.
   - Menghitung `usageK1`, `usageK2`, `amountK1`, `amountK2`, `totalAmount`.
   - Menghasilkan array `items` dengan tipe standar `'BEBAN' | 'K1' | 'K2'`.
3. `calculateBillPenalty(period: string, paymentStatus: PaymentStatus, paidAt: Date | string | null, penaltyFee?: number)`:
   - Jatuh tempo adalah hari terakhir dari bulan `period` pukul `23:59:59.999`.
   - Jika `paymentStatus === 'PAID'`, cek apakah `paidAt > dueDate`. Jika ya, kenakan denda. Jika `paidAt <= dueDate` atau `null` (hasil import), denda `0`.
   - Jika belum lunas (`UNPAID` / `PARTIAL`) dan tanggal hari ini `> dueDate`, kenakan denda.
4. `allocatePaymentFifo(unpaidBills, effectivePaymentAmount)`:
   - Mengalokasikan nominal pembayaran ke daftar tagihan dari periode paling lama (`period ASC`).
   - Tagihan yang dihitung wajib menyertakan `penalty` jika tagihan tersebut terkena denda keterlambatan.
   - Mengembalikan daftar tagihan yang terupdate (`newAmountPaid`, `newRemaining`, `newStatus`), total yang dialokasikan (`allocatedAmount`), dan uang kembalian (`change`).

### 5.3. `lib/auth.ts`
1. Hapus penggunaan token base64 mentah dan hapus pengecekan `role === 'admin'` dari body JSON.
2. Buat fungsi `createSessionToken(payload)` dan `verifySessionToken(request: NextRequest)`.
3. Simpan token di HTTP-Only Cookie bernama `korjo_session` saat login berhasil, serta dukung pembacaan dari header `Authorization: Bearer <token>`.
4. Buat helper `requireAdmin(request: NextRequest)` yang melempar error 401/403 jika request tidak memiliki sesi admin yang valid.

### 5.4. `lib/excel-parser.ts`
Pindahkan logika pembacaan worksheet `xlsx` dari `app/api/import/upload/route.ts` ke dalam fungsi murni `parseCustomerExcelBuffer(buffer: Buffer): ParsedExcelRow[]` agar route/service import tetap bersih.

---

## 6. TAHAP 4: PEMBUATAN SERVER SERVICES (`services/server/`)

Seluruh interaksi Prisma wajib berada di dalam `services/server/`. Semua query pembacaan data wajib menyertakan filter `deletedAt: null`.

### 6.1. `setting.service.ts`
- `getBillingConfig()`: Mengambil nilai `RATE_K1`, `RATE_K2`, `ADMIN_FEE`, `PENALTY_RATE` dari tabel `Setting` dan mengembalikannya sebagai objek `BillingConfig` (dengan fallback ke `DEFAULT_BILLING_CONFIG`).
- `getAllSettings()` & `updateSettings(settingsMap)`.

### 6.2. `customer.service.ts`
- `getAllCustomers(isAdmin: boolean)`:
  - Mengambil seluruh pelanggan aktif (`deletedAt: null`) beserta `meterReadings` (`deletedAt: null`) yang memiliki tagihan belum lunas.
  - Menghitung `unpaidTotal` setiap pelanggan menggunakan `calculateBillPenalty`.
  - Menyembunyikan nomor telepon (`phone: null`) jika `isAdmin === false`.
- `getCustomerDetailByIdentifier(identifier: string)`:
  - Mendeteksi apakah `identifier` adalah UUID valid atau angka `customerNumber`.
  - Jika angka, cari berdasarkan `customerNumber`. Jika UUID, cari berdasarkan `id`.
  - Mengambil pelanggan, daftar `bills` (`deletedAt: null`, urut `period DESC`), dan `payments` (`deletedAt: null`, urut `createdAt DESC`).
- `createCustomer(data)`: Auto-generate `customerNumber` (`max + 1`) dan simpan pelanggan baru.
- `updateCustomer(id: string, data)`: Update nama dan nomor telepon.
- `softDeleteCustomer(id: string)`:
  - Dalam satu `prisma.$transaction`, isi `deletedAt = new Date()` pada `Customer`, `MeterReading`, `Bill`, `BillItem`, dan `Payment` terkait.

### 6.3. `bill.service.ts`
- `createSingleCustomerBill(customerId: string, period: string, meterEnd: number, meterStartInput?: number)`:
  - Mengambil tarif aktif dari `setting.service.ts`.
  - Mengambil `MeterReading` periode sebelumnya (`deletedAt: null`) untuk menentukan `meterStart`.
  - Menghitung rincian tagihan dengan `calculateWaterBill`.
  - Menyimpan `MeterReading`, `Bill`, dan `BillItem` serta meng-increment `customer.totalBill` di dalam satu `prisma.$transaction`.
- `createBulkBillsForPeriod(period: string)`:
  - Membuat tagihan untuk seluruh pelanggan aktif berdasarkan estimasi/meteran bulan lalu dalam transaksi terukur dan mencatat ke `AuditLog`.
- `getBillsByPeriod(period: string)`:
  - Mengembalikan daftar tagihan lunas dan belum lunas pada periode tertentu untuk halaman Dashboard.
- `softDeleteBill(billId: string)` & `softDeleteBillsByPeriod(period: string)`:
  - Mengubah `deletedAt = new Date()` pada `Bill`, `BillItem`, dan `MeterReading` terkait.
  - Menghitung ulang (`recalculate`) `totalBill` dan `totalPaid` pelanggan dari tagihan aktif yang tersisa (`deletedAt: null`) di dalam transaksi yang sama.

### 6.4. `payment.service.ts`
- `processCustomerPayment(params: { customerId: string; cashAmount: number; saveToDeposit: number; useDeposit: boolean })`:
  - **Wajib dibungkus penuh di dalam satu `prisma.$transaction`**.
  - Validasi kecukupan `depositBalance` jika `useDeposit === true`.
  - Ambil seluruh tagihan pelanggan yang `paymentStatus != 'PAID'` dan `deletedAt: null`, diurutkan berdasarkan `period ASC` (FIFO).
  - Jalankan `allocatePaymentFifo` (pastikan denda keterlambatan diperhitungkan dalam kewajiban tagihan dan disimpan ke kolom `bill.penalty` saat terbayar).
  - Update setiap `Bill` yang teralokasi.
  - Update `customer.totalPaid` dan `customer.depositBalance` (`depositBalance - depositUsed + saveToDeposit`).
  - Buat record `Payment` dengan nominal kas bersih yang masuk dan deskripsi rincian pelunasan.

### 6.5. `import.service.ts`
- Menyatukan logika import Excel dan menghapus duplikasi `/api/import/stream`.
- Menggunakan `parseCustomerExcelBuffer` dari `lib/excel-parser.ts`.
- Mendukung pembuatan pelanggan baru, penambahan tagihan baru, atau *overwrite* tagihan periode yang sama secara atomik.

---

## 7. TAHAP 5: REFAKTOR API ROUTES (`app/api/`)

1. Hapus rute `/api/import/stream/route.ts` (gunakan satu pintu di `/api/import/upload/route.ts`).
2. Hapus `lib/customerIdentifier.ts` karena logika resolusi UUID vs `customerNumber` sudah ditangani secara eksplisit di `customer.service.ts`.
3. Ubah seluruh route handler menjadi *Thin Controller*:
   - Untuk endpoint mutasi (`POST`, `PUT`, `PATCH`, `DELETE`), panggil `await requireAdmin(request)` di baris pertama.
   - Validasi parameter URL dan body.
   - Panggil fungsi dari `services/server/`.
   - Kembalikan hasil menggunakan `successResponse` atau `errorResponse`.

---

## 8. TAHAP 6: PENYESUAIAN FRONTEND & CLIENT SERVICES

1. **Pindahkan Service Client**:
   - Pindahkan `lib/api.ts`, `services/authService.ts`, dan `services/customerService.ts` ke dalam `services/client/`.
   - Hapus pengiriman parameter `role: localStorage.getItem('role')` pada setiap body request di `customer.client.ts`, karena autentikasi sudah menggunakan cookie/token header otomatis.
   - Ubah tipe parameter `id` dan `billId` pada seluruh fungsi client service dari `number` menjadi `string`.
2. **Sederhanakan Routing Detail Pelanggan**:
   - Pertahankan `/customerNumber/[customerNumber]/page.tsx` atau `/customers/[id]/page.tsx` dengan memanggil endpoint yang sama tanpa ketergantungan pada konversi `Number(routeIdentifier)`.
3. **Perbarui Komponen & Halaman**:
   - Sesuaikan properti data pada halaman `app/page.tsx`, `app/customers/[id]/page.tsx`, `app/admin/dashboard/page.tsx`, dan komponen `PaymentSection.tsx` agar membaca nama field baru (`unpaidTotal` menggantikan `outstanding`, `depositBalance` menggantikan `balance`, serta status `'PAID' | 'PARTIAL' | 'UNPAID'`).
   - Pada komponen `components/ui/PasswordConfirm.tsx`, ganti pengecekan konstanta hardcoded `ADMIN_PASSWORD = '9090'` dengan memanggil verifikasi password admin ke endpoint `/api/auth/verify` (atau menggunakan password akun admin yang sedang login).

---

## 9. URUTAN EKSEKUSI UNTUK AGENT

Agar proses refaktor berjalan mulus tanpa memutus kompilasi secara masif, kerjakan dengan urutan langkah berikut:

1. **Langkah 1**: Perbarui `prisma/schema.prisma`, jalankan `npx prisma db push --force-reset` (atau migrasi bersih) dan `npx prisma generate`, lalu perbarui `prisma/seed.ts`.
2. **Langkah 2**: Perbarui `types/index.ts` sesuai kontrak DTO baru.
3. **Langkah 3**: Buat modul-modul di `lib/` (`api-response.ts`, `billing.ts`, `auth.ts`, `excel-parser.ts`) lengkap dengan JSDoc.
4. **Langkah 4**: Buat seluruh service backend di `services/server/`.
5. **Langkah 5**: Refaktor seluruh file `route.ts` di dalam `app/api/` agar menggunakan `services/server/` dan `lib/auth.ts`.
6. **Langkah 6**: Pindahkan dan perbarui `services/client/` serta `hooks/` (`useCustomer.ts`, `useDashboard.ts`, `useAuth.ts`, `useSettings.ts`).
7. **Langkah 7**: Sesuaikan komponen UI dan halaman di `app/` dengan tipe DTO baru dan tipe ID `string` (UUID).
8. **Langkah 8**: Jalankan `npm run lint` dan `npm run build` untuk memastikan tidak ada error TypeScript (`tsc`) maupun ESLint yang tersisa.