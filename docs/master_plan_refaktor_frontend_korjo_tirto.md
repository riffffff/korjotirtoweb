# MASTER PLAN & SPESIFIKASI REFAKTOR FRONTEND: KORJO TIRTO V2

Dokumen ini adalah panduan teknis menyeluruh untuk melakukan refaktor sisi Frontend aplikasi **Korjo Tirto** secara bertahap. Seluruh perubahan wajib mempertahankan fungsionalitas bisnis yang sudah ada, mengikuti kontrak DTO V2 dari Backend, menerapkan komponen *reusable*, mengganti seluruh *inline SVG* dengan `lucide-react`, serta mengganti seluruh *page loading spinner* dengan **Contextual Skeleton**.

---

## ATURAN EKSEKUSI UNTUK AGENT

1. Setiap fase wajib diselesaikan secara berurutan dan divalidasi dengan `npm run lint` serta `npm run build` sebelum masuk ke fase berikutnya.
2. Dilarang menulis *inline SVG* mentah (`<svg>...</svg>`) di dalam file halaman (`app/**/page.tsx`) atau komponen fitur. Gunakan ikon dari `lucide-react` (kecuali grafik SVG khusus seperti `RingChart` dan ikon merek `WhatsAppIcon`).
3. Dilarang menggunakan *loading spinner* untuk pemuatan data halaman atau seksi. Gunakan komponen `Skeleton` yang sesuai dengan konteks tata letak halaman (`list`, `detail`, `dashboard`, `form`). Spinner hanya diizinkan berada di dalam komponen `Button` saat proses submit berjalan.
4. Dilarang memanggil `fetch('/api/...')` secara langsung di dalam komponen atau *hooks* (kecuali untuk streaming SSE pada fitur upload import Excel jika diperlukan). Seluruh pemanggilan REST API standar wajib melalui modul di dalam `services/client/`.
5. Dilarang menduplikasi fungsi pemformatan tanggal atau periode (`formatPeriod`, `formatDateTime`) di dalam file halaman atau komponen. Semua wajib diimpor dari `lib/formatDate.ts`.
6. Hapus seluruh *legacy types* di `types/index.ts` setelah seluruh komponen dan *hooks* selesai dimigrasikan ke DTO V2.

---

## STRUKTUR DIREKTORI FRONTEND TARGET

```text
├── types/
│   └── index.ts                          # Kontrak DTO V2 bersih (tanpa legacy types)
├── lib/
│   ├── formatCurrency.ts                 # Formatter Rupiah tunggal
│   ├── formatDate.ts                     # Formatter tanggal & periode tunggal (formatPeriod, formatDateTime, formatDateShort)
│   └── whatsapp.ts                       # Generator pesan WA menggunakan formatter terpusat
├── services/
│   └── client/                           # Satu pintu komunikasi HTTP dari Client ke API
│       ├── api.ts                        # Konfigurasi Axios (baseURL: '/api', withCredentials: true)
│       ├── auth.client.ts                # Login, logout, session, verifyPassword
│       ├── bill.client.ts                # Create single bill, create bulk bills, get by period, delete bill/period
│       ├── customer.client.ts            # CRUD customer, pay FIFO, notify, clearAll
│       ├── dashboard.client.ts           # Get dashboard stats
│       └── setting.client.ts             # Get settings, update settings
├── hooks/
│   ├── useAuth.ts                        # Manajemen sesi admin
│   ├── useCustomer.ts                    # Fetch & cache daftar pelanggan serta detail pelanggan
│   ├── useDashboard.ts                   # Fetch & cache data dashboard + detail periode
│   ├── useLogin.ts                       # State & handler form login
│   └── useSettings.ts                    # Fetch, cache, & update pengaturan sistem
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx                 # Wrapper layout & SidebarProvider
│   │   ├── PageHeader.tsx                # Header sticky reusable untuk semua halaman
│   │   └── Sidebar.tsx                   # Navigasi sidebar menggunakan lucide-react
│   ├── ui/
│   │   ├── Badge.tsx                     # Badge reusable untuk status UNPAID, PARTIAL, PAID
│   │   ├── Button.tsx                    # Tombol standar dengan state loading
│   │   ├── Icons.tsx                     # Komponen WhatsAppIcon & ikon custom non-Lucide
│   │   ├── Input.tsx                     # Input field standar dengan label & pesan error
│   │   ├── Modal.tsx                     # Dialog modal reusable
│   │   ├── PasswordConfirm.tsx           # Modal konfirmasi password admin via API
│   │   └── Skeleton.tsx                  # Kumpulan contextual skeleton (List, Detail, Dashboard, Form)
│   ├── state/
│   │   ├── EmptyState.tsx                # Tampilan data kosong menggunakan lucide-react
│   │   ├── ErrorState.tsx                # Tampilan pesan error
│   │   └── LoadingState.tsx              # Dispatcher skeleton berdasarkan varian halaman
│   ├── customer/
│   │   ├── AddBillModal.tsx              # Modal tambah tagihan pelanggan
│   │   ├── BillAccordionItem.tsx         # Item akordion riwayat tagihan per periode
│   │   ├── CustomerBalanceCards.tsx      # Kartu ringkasan Sisa Tagihan & Saldo Simpanan
│   │   ├── CustomerCard.tsx              # Kartu item pelanggan untuk daftar di halaman utama
│   │   ├── CustomerForm.tsx              # Form tambah/edit pelanggan
│   │   ├── CustomerProfileHeader.tsx     # Header informasi profil pelanggan & tombol aksi WA/Edit/Hapus
│   │   ├── PaymentHistoryCard.tsx        # Kartu daftar riwayat pembayaran
│   │   └── PaymentSection.tsx            # Kalkulator & form pembayaran kasir (FIFO + Deposit)
│   └── dashboard/
│       ├── AnimatedNumber.tsx            # Animasi angka statistik
│       ├── PeriodHistorySection.tsx      # Daftar riwayat bulanan & toggle detail lunas/belum lunas
│       └── RingChart.tsx                 # Grafik lingkaran persentase pelunasan
└── app/
    ├── page.tsx                          # Halaman daftar pelanggan
    ├── login/page.tsx                    # Halaman login admin
    ├── customers/[id]/page.tsx           # Halaman detail pelanggan
    ├── customerNumber/[customerNumber]/page.tsx
    └── admin/
        ├── dashboard/page.tsx            # Halaman dashboard admin
        ├── bills/create/page.tsx         # Halaman buat tagihan massal per periode
        ├── import/page.tsx               # Halaman import Excel & pembersihan data
        └── settings/page.tsx             # Halaman pengaturan template WA
```

---

## FASE 1: INSTALASI IKON, PEMBERSIHAN UTILITAS (`lib/`), & TIPE DATA (`types/`)

**Fokus Pengerjaan:** Memasang `lucide-react`, menyatukan fungsi pemformatan yang tersebar di berbagai file, dan membersihkan `types/index.ts`.

### Langkah Kerja:

1. **Instalasi Paket Ikon**:
   - Jalankan `npm install lucide-react`.
2. **Standarisasi `lib/formatDate.ts`**:
   - Tambahkan dan ekspor fungsi-fungsi berikut (lengkap dengan JSDoc):
     - `formatDateShort(dateString: string): string` (contoh: `"07 Jan 2026, 14:30"`).
     - `formatDateTime(dateString: string): string` (contoh: `"7 Januari 2026, 14:30"`).
     - `formatPeriod(period: string): string` (mengubah `"2026-01"` menjadi `"Januari 2026"`).
     - `getCurrentPeriod(): string` (mengembalikan bulan berjalan dalam format `"YYYY-MM"`).
3. **Bersihkan `lib/whatsapp.ts`**:
   - Hapus fungsi lokal `formatCurrency` dan `formatPeriod` di dalam `lib/whatsapp.ts`, ganti dengan mengimpor dari `@/lib/formatCurrency` dan `@/lib/formatDate`.
   - Gunakan tipe `CustomerSummaryDTO` dan `BillDTO` dari `@/types`.
4. **Bersihkan `types/index.ts`**:
   - Hapus tipe legacy yang sudah tidak dipakai (`CustomerSimple`, `BillItem`, `MeterReadingSimple`, `Customer`, `LoginResponse`).
   - Pastikan `DashboardPeriodDTO` menyertakan `totalAmount: number` dan `paidAmount: number`.
   - Tambahkan interface `PeriodBillDetailDTO` untuk detail tagihan per periode di Dashboard:
     ```typescript
     export interface PeriodBillDetailDTO {
       id: string;
       customerId: string;
       customerName: string;
       customerNumber: number;
       paymentStatus: PaymentStatusCode;
       totalAmount: number;
       amountPaid: number;
       remaining: number;
     }
     ```

**Validasi Fase 1:** Jalankan `npm run lint` dan `npm run build`.

---

## FASE 2: PENYELARASAN LAPISAN CLIENT SERVICES (`services/client/`) & HOOKS (`hooks/`)

**Fokus Pengerjaan:** Memastikan seluruh komunikasi API melalui `services/client/` dan memperbarui *custom hooks* agar bebas dari pemanggilan `fetch` mentah.

### Langkah Kerja:

1. **Buat `services/client/bill.client.ts`**:
   - `createForCustomer(customerId: string, data: { period: string; meterStart?: number; meterEnd: number })` -> `POST /customers/${customerId}/bills`
   - `createBulkByPeriod(period: string)` -> `POST /bills/create`
   - `getByPeriod(period: string)` -> `GET /bills/period/${period}`
   - `deleteById(billId: string)` -> `DELETE /bills/${billId}`
   - `deleteByPeriod(period: string)` -> `DELETE /bills/period/${period}`
2. **Buat `services/client/dashboard.client.ts`**:
   - `getStats(): Promise<DashboardStatsDTO>` -> `GET /dashboard`
3. **Buat `services/client/setting.client.ts`**:
   - `getAll(): Promise<Record<string, string>>` -> `GET /settings`
   - `update(settings: Record<string, string>)` -> `PUT /settings`
4. **Rapikan `services/client/auth.client.ts` & `services/client/customer.client.ts`**:
   - Tambahkan `getSession()` di `auth.client.ts` (`GET /auth/session`).
   - Pastikan semua fungsi di `customer.client.ts` memiliki *return type* yang jelas sesuai DTO V2.
5. **Perbarui Seluruh Hooks di `hooks/`**:
   - `hooks/useAuth.ts`: Gunakan `authClient.getSession()` dan `authClient.logout()`.
   - `hooks/useDashboard.ts`: Gunakan `dashboardClient.getStats()` dan tipe `DashboardStatsDTO`.
   - `hooks/useSettings.ts`: Gunakan `settingClient.getAll()` dan tambahkan fungsi `saveSettings(newSettings)` yang memanggil `settingClient.update()`.
   - `hooks/useCustomer.ts`: Pastikan memakai `customerClient` dan mengekspos fungsi mutasi atau invalidasi cache dengan bersih.

**Validasi Fase 2:** Jalankan `npm run lint` dan `npm run build`.

---

## FASE 3: SISTEM SKELETON, IKON, & KOMPONEN UI DASAR (`components/ui/`, `state/`, `layout/`)

**Fokus Pengerjaan:** Mengganti seluruh *spinner* halaman dengan **Skeleton**, mengganti *inline SVG* di komponen dasar dengan `lucide-react`, dan membuat komponen tata letak yang *reusable*.

### Langkah Kerja:

1. **Buat `components/ui/Icons.tsx`**:
   - Buat komponen `WhatsAppIcon({ className }: { className?: string })` untuk menampung SVG logo WhatsApp di satu tempat terpusat.
2. **Buat `components/ui/Badge.tsx`**:
   - Buat komponen `PaymentStatusBadge({ status }: { status: PaymentStatusCode })` yang menampilkan label dan warna sesuai status:
     - `PAID`: Lunas (Hijau / Emerald)
     - `PARTIAL`: Sebagian (Kuning / Amber)
     - `UNPAID`: Belum Bayar (Merah / Rose)
3. **Perluas `components/ui/Skeleton.tsx`**:
   - Pertahankan `Skeleton`, `SkeletonCard`, `SkeletonList`, `SkeletonDetailCard`, dan `SkeletonBillCard`.
   - Tambahkan `SkeletonDashboard`: Kerangka yang terdiri dari 4 kartu grid statistik di atas dan daftar baris periode di bawah.
   - Tambahkan `SkeletonFormCard`: Kerangka untuk halaman form pengaturan/import/buat tagihan.
4. **Ubah `components/state/LoadingState.tsx`**:
   - **Hapus seluruh kode *spinner* berputar**.
   - Dukung prop `variant?: 'skeleton-list' | 'skeleton-detail' | 'skeleton-dashboard' | 'skeleton-form'` dengan nilai default `'skeleton-list'`.
   - Render varian komponen dari `components/ui/Skeleton.tsx` sesuai prop `variant`.
5. **Perbarui Komponen UI & Layout dengan `lucide-react`**:
   - `components/BackButton.tsx`: Ganti `<svg>` dengan `<ChevronLeft className="w-4 h-4" />` dari `lucide-react`.
   - `components/ui/Modal.tsx`: Ganti `<svg>` tombol tutup dengan `<X className="w-5 h-5 text-neutral-500" />`.
   - `components/ui/Button.tsx`: Ganti `<svg>` loading dengan `<Loader2 className="w-4 h-4 animate-spin" />`.
   - `components/state/EmptyState.tsx`: Ganti `<svg>` default dengan `<FileText className="w-8 h-8 text-neutral-400" />`.
   - `components/layout/Sidebar.tsx`: Ganti seluruh `<svg>` navigasi dan tombol *collapse* dengan ikon `lucide-react` (`BarChart3`, `Users`, `Upload`, `Settings`, `ChevronsLeft`, `ChevronsRight`).
6. **Buat `components/layout/PageHeader.tsx`**:
   - Komponen *header sticky* yang *reusable* untuk seluruh halaman:
     ```tsx
     interface PageHeaderProps {
       title: string;
       subtitle?: string;
       mobileTitle?: string;
       mobileSubtitle?: string;
       actions?: React.ReactNode;
     }
     ```

**Validasi Fase 3:** Jalankan `npm run lint` dan `npm run build`.

---

## FASE 4: EKSTRAKSI KOMPONEN FITUR (`components/customer/` & `components/dashboard/`)

**Fokus Pengerjaan:** Memecah logika UI yang menumpuk di dalam halaman menjadi komponen fitur yang modular, bersih, dan menggunakan tipe DTO V2.

### Langkah Kerja:

1. **Hapus Komponen Usang**:
   - Hapus `components/StandMeter.tsx` dan `components/DetailStandMeter.tsx` jika tidak lagi digunakan, atau lebur ke dalam `components/customer/BillAccordionItem.tsx`.
2. **Buat Komponen Fitur Pelanggan (`components/customer/`)**:
   - `CustomerCard.tsx`:
     - Pindahkan dan perbarui `components/CustomerCard.tsx` ke `components/customer/CustomerCard.tsx`.
     - Gunakan prop `customer: CustomerSummaryDTO`, `isAdmin: boolean`, `onSelect: () => void`, dan `onSendWA: (e: React.MouseEvent) => void`.
     - Gunakan `WhatsAppIcon` dan `formatDateTime` dari `lib/formatDate.ts`.
   - `CustomerProfileHeader.tsx`:
     - Menampilkan nomor pelanggan, nama, nomor telepon, tombol Edit (`Pencil`) & Hapus (`Trash2`) untuk admin, serta tombol kirim tagihan WhatsApp beserta status pengiriman terakhir.
   - `CustomerBalanceCards.tsx`:
     - Menampilkan kartu *Sisa Tagihan* (`unpaidTotal`) beserta rincian periode yang belum lunas, kartu *Saldo Simpanan* (`depositBalance`), atau banner *LUNAS SEMUA* (`CheckCircle2`) jika `unpaidTotal <= 0`.
   - `PaymentSection.tsx`:
     - Pindahkan ke `components/customer/PaymentSection.tsx`.
     - Ganti `<svg>` dengan ikon `Wallet` dari `lucide-react`.
     - Perbaiki bug alokasi saldo simpanan:
       ```typescript
       const usableDeposit = useBalance ? Math.min(customerBalance, totalAmount) : 0;
       const effectivePaid = paidValue + usableDeposit;
       ```
     - Saat `handlePayConfirmed` dipanggil, kirimkan `(paidValue, saveValue, usableDeposit)` agar nominal `cashAmount` dan `useDeposit` yang diterima Backend presisi dan tidak menggandakan saldo.
   - `PaymentHistoryCard.tsx`:
     - Menampilkan daftar `PaymentHistoryDTO[]` atau pesan kosong jika belum ada transaksi.
   - `BillAccordionItem.tsx`:
     - Menampilkan satu item `BillDTO` yang dapat dibuka/ditutup (*expand/collapse*) menggunakan ikon `ChevronDown`.
     - Menampilkan rincian meter awal, meter akhir, pemakaian, daftar `BillItemDTO` (`BEBAN`, `K1`, `K2`), denda keterlambatan, dan tombol hapus tagihan (`Trash2`) untuk admin.
   - `AddBillModal.tsx`:
     - Mengelola state input `period`, `meterStart`, dan `meterEnd` secara internal di dalam modal, serta memanggil `billClient.createForCustomer()`.
   - `CustomerForm.tsx`:
     - Pindahkan ke `components/customer/CustomerForm.tsx`.
3. **Buat Komponen Fitur Dashboard (`components/dashboard/`)**:
   - `AnimatedNumber.tsx`: Ekstrak dari halaman dashboard.
   - `RingChart.tsx`: Ekstrak dari halaman dashboard.
   - `PeriodHistorySection.tsx`: Ekstrak kartu riwayat per bulan beserta tampilan *in-place detail* daftar pelanggan Lunas vs Belum Lunas (gunakan `billClient.getByPeriod(selectedPeriod)` dan `SkeletonList` saat memuat detail periode).

**Validasi Fase 4:** Jalankan `npm run lint` dan `npm run build`.

---

## FASE 5: REFAKTOR SELURUH HALAMAN (`app/**/page.tsx`)

**Fokus Pengerjaan:** Menulis ulang seluruh file `page.tsx` agar merangkai komponen dari Fase 3 & Fase 4, memakai `LoadingState` berbasis Skeleton, dan bebas dari kode duplikat.

### Langkah Kerja:

1. **Refaktor `app/page.tsx` (Daftar Pelanggan)**:
   - Gunakan `<PageHeader />`.
   - Gunakan ikon `Search`, `Plus`, `UserPlus`, `Upload`, `BarChart3`, dan `X` dari `lucide-react`.
   - Saat `loading === true`, render `<LoadingState variant="skeleton-list" count={6} />`.
   - Render daftar pelanggan menggunakan `<CustomerCard />`.
2. **Refaktor `app/customers/[id]/page.tsx` (Detail Pelanggan)**:
   - Saat `loading === true`, render `AppLayout` dengan `<LoadingState variant="skeleton-detail" />`.
   - Susun halaman menggunakan `<CustomerProfileHeader />`, `<CustomerBalanceCards />`, `<PaymentHistoryCard />`, `<PaymentSection />`, daftar `<BillAccordionItem />`, dan `<AddBillModal />`.
   - Pastikan fungsi `handlePayment` meneruskan parameter `cashAmount`, `saveToBalance`, dan `balanceUsed` dengan benar ke `customerClient.pay()`.
3. **Refaktor `app/admin/dashboard/page.tsx` (Dashboard Admin)**:
   - Bungkus halaman dengan `<AppLayout>` agar tata letak konsisten.
   - Saat `authLoading` atau `loading`, render `<LoadingState variant="skeleton-dashboard" />`.
   - Gunakan `<PageHeader title="Dashboard" subtitle="Ringkasan statistik pembayaran" />`.
   - Gunakan ikon `Users`, `Wallet`, `Upload`, `Settings`, `ChevronRight` dari `lucide-react`.
   - Gunakan `<RingChart />` dan `<PeriodHistorySection />`.
4. **Refaktor `app/admin/import/page.tsx` (Import Excel)**:
   - Saat `authLoading`, render `<LoadingState variant="skeleton-form" />`.
   - Gunakan `<PageHeader />`, `formatPeriod` serta `getCurrentPeriod` dari `lib/formatDate.ts`, dan ikon `FileSpreadsheet`, `Upload` dari `lucide-react`.
5. **Refaktor `app/admin/bills/create/page.tsx` (Buat Tagihan Massal)**:
   - Saat `authLoading`, render `<LoadingState variant="skeleton-form" />`.
   - Gunakan `billClient.createBulkByPeriod(period)` dan `formatPeriod` dari `lib/formatDate.ts`.
   - Ganti `window.confirm` dengan komponen `<Modal>` konfirmasi agar UI konsisten.
6. **Refaktor `app/admin/settings/page.tsx` (Pengaturan)**:
   - Bungkus halaman dengan `<AppLayout>` dan gunakan `<PageHeader />`.
   - Saat `authLoading` atau `(loading && !isInitialized)`, render `<LoadingState variant="skeleton-form" />`.
   - Gunakan `settingClient.update()` atau fungsi dari `useSettings()`.
7. **Refaktor `app/login/page.tsx` (Halaman Login)**:
   - Ganti emoji dan `<svg>` *spinner* dengan ikon `Droplets`, `Loader2`, dan `ArrowLeft` dari `lucide-react`.

---

## FASE 6: PEMBERSIHAN AKHIR & VALIDASI BUILD

**Fokus Pengerjaan:** Memastikan tidak ada file yatim (*orphan files*), impor yang rusak, atau aturan arsitektur yang terlanggar.

### Langkah Kerja:

1. Pindahkan dokumen perencanaan (`blueprint_refaktor_korjo_tirto.md` dan `master_plan_refaktor_korjo_tirto.md`) dari *root* direktori ke dalam folder `docs/` agar *root* proyek tetap bersih.
2. Lakukan pencarian global pada folder `app/`, `components/`, dan `hooks/` untuk memastikan:
   - Tidak ada lagi pemanggilan `variant="spinner"` pada `LoadingState`.
   - Tidak ada lagi fungsi lokal `function formatPeriod` atau `function formatDateTime` di luar `lib/formatDate.ts`.
   - Tidak ada lagi `<svg` mentah di luar `components/ui/Icons.tsx` dan `components/dashboard/RingChart.tsx`.
   - Tidak ada lagi impor yang mengarah ke lokasi komponen lama yang sudah dipindahkan.
3. Jalankan validasi akhir:
   ```bash
   npm run lint
   npm run build
   ```
   Pastikan *build* produksi berhasil 100% tanpa error TypeScript maupun peringatan ESLint.

---

## FASE 7: FINAL STRUCTURAL CLEANUP

- Hapus komponen legacy yang tidak lagi direferensikan.
- Pusatkan header halaman admin pada `components/layout/PageHeader.tsx`.
- Pastikan komponen customer dan dashboard berada di folder fitur masing-masing.
- Batasi inline SVG hanya untuk ikon terpusat dan grafik khusus.
- Jalankan audit import orphan, lint, dan production build.