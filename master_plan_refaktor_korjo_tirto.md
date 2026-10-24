# MASTER PLAN REFAKTOR KORJO TIRTO (7 FASE EKSEKUSI)

Dokumen ini menjadi panduan eksekusi bertahap untuk refaktor arsitektur aplikasi
Korjo Tirto. Setiap fase harus divalidasi sebelum melanjutkan ke fase berikutnya.

## Aturan Eksekusi

- Kerjakan pada branch khusus: `refactor/v2-architecture`.
- Jangan menghapus atau mereset database production.
- Setiap fase wajib melewati `npm run lint` dan `npm run build`.
- Perubahan data/database harus diuji pada database development terlebih dahulu.
- Semua query data aktif wajib menggunakan `deletedAt: null`.
- Semua mutasi admin wajib memverifikasi sesi server-side.
- Jangan menghapus kode lama sebelum seluruh pemanggilnya sudah dipindahkan.

---

## FASE 0: PERSIAPAN, BASELINE & BACKUP

**Fokus:** memastikan lingkungan kerja dan titik awal tercatat sebelum perubahan.

### Langkah kerja

1. Buat branch:

   ```bash
   git checkout -b refactor/v2-architecture
   ```

2. Pastikan dependency terpasang:

   ```bash
   npm install
   ```

3. Siapkan `.env.local` dan isi `DATABASE_URL` serta `AUTH_SECRET`.
4. Catat baseline:

   ```bash
   npm run lint
   npm run build
   ```

5. Jika database berisi data penting, buat backup sebelum migrasi:

   ```bash
   pg_dump "$DATABASE_URL" > backup-before-refactor.sql
   ```

6. Pastikan database development terpisah dari production. Perintah reset database
   hanya boleh digunakan pada database development yang datanya boleh dihapus.

---

## FASE 1: FONDASI UTILITY, DOMAIN LOGIC & TIPE

**Fokus:** membuat kontrak data dan fungsi murni tanpa mengubah alur lama secara
massal.

### Langkah kerja

1. Buat `lib/api-response.ts`:
   - `successResponse(data, message, status)`.
   - `errorResponse(error, status)`.
2. Buat `lib/billing.ts`:
   - `DEFAULT_BILLING_CONFIG`.
   - `calculateWaterBill`.
   - `calculateBillPenalty`.
   - `allocatePaymentFifo`.
   - JSDoc pada fungsi domain utama.
3. Perbarui `types/index.ts` dengan DTO tunggal:
   - `CustomerSummaryDTO`.
   - `CustomerDetailDTO`.
   - `BillDTO`.
   - `PaymentHistoryDTO`.
   - `DashboardStatsDTO`.
   - `PaymentStatus` dengan nilai `UNPAID | PARTIAL | PAID`.
4. Pertahankan tipe legacy sementara jika masih digunakan. Hapus setelah seluruh
   pemanggilnya sudah dimigrasikan.
5. Tambahkan pengujian untuk:
   - Tarif K1/K2 dan biaya admin.
   - Pemakaian nol atau meter akhir lebih kecil dari meter awal.
   - Batas tepat 40 m³ dan pemakaian di atas 40 m³.
   - Denda sebelum dan sesudah jatuh tempo.
   - Pembayaran FIFO, pembayaran sebagian, dan uang kembalian.

### Validasi

```bash
npm run lint
npm run build
```

---

## FASE 2: KEAMANAN & AUTENTIKASI SERVER-SIDE

**Fokus:** mengganti token Base64 dan validasi client-side dengan sesi yang
diverifikasi server.

### Langkah kerja

1. Buat `lib/auth.ts`:
   - `createSessionToken`.
   - `verifySessionToken`.
   - `requireAdmin`.
2. Gunakan cookie HTTP-only bernama `korjo_session`.
3. Dukung header `Authorization` bila diperlukan oleh client.
4. Atur masa berlaku token dan tolak token invalid/expired.
5. Perbarui login agar menetapkan cookie setelah kredensial valid.
6. Tambahkan endpoint logout untuk menghapus cookie.
7. Tambahkan endpoint verifikasi password admin untuk aksi sensitif.
8. Perbarui `PasswordConfirm.tsx` agar tidak menyimpan password hardcoded di
   browser.
9. Uji akses tanpa sesi, token invalid, token expired, user non-admin, dan
   password konfirmasi salah/benar.

### Validasi

```bash
npm run lint
npm run build
```

---

## FASE 3: MIGRASI SCHEMA KE UUID

**Fokus:** menyamakan kontrak ID database sebelum membangun service dan client baru.

### Langkah kerja

1. Ubah seluruh primary key dan foreign key menjadi:

   ```prisma
   String @id @default(uuid()) @db.Uuid
   ```

2. Terapkan `deletedAt` pada entitas transaksional.
3. Pertahankan nama tabel lama dengan `@@map()` bila diperlukan.
4. Sesuaikan model `User`/`AuditLog` dan field camelCase dengan mapping database.
5. Perbarui `prisma/seed.ts` untuk schema UUID dan status pembayaran uppercase.
6. Untuk database development kosong, gunakan:

   ```bash
   npx prisma db push --force-reset
   npx prisma generate
   ```

   Jangan jalankan `--force-reset` pada production atau database yang datanya
   masih diperlukan.
7. Untuk database berisi data penting, gunakan migrasi data bertahap dan backup,
   bukan reset.

### Validasi

```bash
npm run lint
npm run build
npm run db:generate
```

---

## FASE 4: SERVER SERVICES, SOFT DELETE & TRANSAKSI

**Fokus:** memindahkan seluruh logika database dan bisnis ke server service.

### Struktur service

Buat `services/server/` dengan:

- `auth.service.ts`
- `setting.service.ts`
- `customer.service.ts`
- `bill.service.ts`
- `payment.service.ts`
- `dashboard.service.ts`
- `import.service.ts`

### Langkah kerja

1. Pindahkan query Prisma dari route ke service.
2. Buat `lib/excel-parser.ts` untuk parsing buffer Excel.
3. Pastikan semua query pembacaan memfilter `deletedAt: null`.
4. Terapkan soft delete berantai untuk customer, meter reading, bill, bill item,
   dan payment.
5. Jika meter reading periode yang sama pernah di-soft-delete, restore/update
   record tersebut, bukan membuat record baru.
6. Bungkus proses pembayaran FIFO sepenuhnya dalam satu `prisma.$transaction`.
7. Hitung dan simpan denda secara konsisten tanpa akumulasi ganda.
8. Recalculate total pelanggan setelah penghapusan tagihan.
9. Catat operasi penting ke `AuditLog`.

### Validasi

```bash
npm run lint
npm run build
```

Uji pembuatan tagihan, import Excel, soft delete/restore, pembayaran penuh,
pembayaran sebagian, FIFO, deposit, dan uang kembalian.

---

## FASE 5: THIN API CONTROLLERS

**Fokus:** membuat API route hanya menangani autentikasi, validasi, delegasi, dan
response.

### Langkah kerja

1. Untuk endpoint mutasi, panggil `requireAdmin(request)` sebelum proses utama.
2. Validasi parameter URL dan body request.
3. Panggil fungsi dari `services/server/`.
4. Gunakan `successResponse` dan `errorResponse` secara konsisten.
5. Jangan menaruh query Prisma atau rumus billing di route.
6. Cari semua pemanggil `/api/import/stream`, pindahkan ke
   `/api/import/upload`, uji import, lalu hapus route stream.
7. Hapus `lib/customerIdentifier.ts` setelah seluruh pemanggil dipindahkan ke
   resolusi identifier di `customer.service.ts`.

### Validasi

```bash
npm run lint
npm run build
```

Uji seluruh endpoint baca, mutasi tanpa login, mutasi dengan sesi valid, dan
error response untuk input invalid.

---

## FASE 6: CLIENT SERVICES & PENYESUAIAN UI

**Fokus:** menyamakan frontend dengan API dan DTO final.

### Langkah kerja

1. Buat `services/client/`:
   - `api.ts`
   - `auth.client.ts`
   - `customer.client.ts`
2. Pindahkan service client lama setelah seluruh import diperbarui.
3. Hapus parameter `role` dari body request.
4. Ubah ID dan `billId` dari `number` menjadi `string`.
5. Sesuaikan hooks, halaman, dan komponen dengan:
   - `depositBalance`.
   - `unpaidTotal`.
   - `UNPAID | PARTIAL | PAID`.
6. Pastikan request client mengirim cookie sesi secara otomatis.
7. Hapus tipe legacy dan file lama setelah tidak ada referensi.

### Validasi

```bash
npm run lint
npm run build
```

Uji login, daftar pelanggan, detail pelanggan dengan nomor pelanggan dan UUID,
pembuatan tagihan, pembayaran, dashboard, dan import.

---

## FASE 7: CLEANUP, REGRESI & VALIDASI AKHIR

**Fokus:** memastikan tidak ada kode lama, regresi, atau celah alur utama.

### Langkah kerja

1. Jalankan pencarian untuk memastikan tidak ada:
   - Password hardcoded.
   - Token Base64 lama.
   - `role` dari body request.
   - Query Prisma di route.
   - Referensi `/api/import/stream`.
   - Status pembayaran lowercase.
2. Jalankan seluruh test domain dan test API yang tersedia.
3. Jalankan validasi akhir:

   ```bash
   npm run lint
   npm run build
   ```

4. Uji manual alur:
   - Login/logout.
   - Customer baru dan edit customer.
   - Tagihan satu pelanggan dan bulk.
   - Import Excel.
   - Pembayaran penuh/sebagian dan FIFO.
   - Deposit dan uang kembalian.
   - Soft delete dan restore.
   - Akses endpoint tanpa otorisasi.
5. Dokumentasikan hasil migrasi, backup, dan perubahan environment.
