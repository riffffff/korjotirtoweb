# Rencana Eksekusi & Persiapan Go-Live — Korjo Tirto

Dokumen ini berisi catatan kesiapan produksi dan agenda pekerjaan untuk sesi berikutnya.

---

## 📌 Agenda Utama Sesi Berikutnya: Impor Data dari Aplikasi Berjalan
- [ ] **Persiapan Data Sumber**: Ambil ekspor data pelanggan, meteran, dan riwayat pembayaran dari aplikasi lama yang sedang berjalan.
- [ ] **Sinkronisasi Skema ke DB Production**: Terapkan skema tabel baru (`payment_proofs` beserta kolom `notified_at`) ke Supabase Production secara aman.
- [ ] **Eksekusi Impor Data**: Jalankan proses impor data ke sistem baru via menu `/admin/import` atau skrip migrasi.
- [ ] **Validasi Konsistensi Data**: Pastikan nomor pelanggan, nama, sisa tagihan (unpaidTotal), dan saldo simpanan (deposit/balance) cocok 100% dengan aplikasi lama.
- [ ] **Pengujian End-to-End**: Verifikasi penuh alur pembayaran online pelanggan hingga approved oleh admin.

---

## Bagian 1: Checklist Kesiapan Produksi (Go-Live)

### 1. Integrasi Supabase Storage untuk Upload Bukti Bayar *(Prioritas Utama)*
Karena server Vercel bersifat *read-only* (tidak dapat menyimpan file permanen di folder `public/uploads`), penyimpanan gambar bukti transfer dialihkan ke **Supabase Storage**.

- [x] **Setup Bucket Supabase**: Buat bucket bernama `payment-proofs` di Supabase Dashboard (set *Public* untuk akses baca URL gambar).
- [x] **Environment Variables**: Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` ke file `.env` lokal serta pengaturan proyek di Vercel.
- [x] **Update API Upload (`app/api/payment-proofs/route.ts`)**: Ganti penyimpanan lokal (`fs.writeFile`) menjadi upload ke Supabase Storage (dengan fallback lokal jika di mode dev tanpa env Supabase).
- [x] **Konfigurasi Next Image (`next.config.ts`)**: Tambahkan `*.supabase.co` pada `images.remotePatterns`.
- [x] **Kompresi Gambar Otomatis di Client (`components/customer/OnlinePaymentSection.tsx`)**: Kompres foto dari kamera HP pelanggan (3–5 MB menjadi ~150 KB) menggunakan HTML5 Canvas sebelum dikirim ke server agar proses upload cepat dan hemat kuota storage (batas gratis Supabase 1 GB).

### 2. Keamanan & Rate Limiter *(Anti Brute-Force & Anti Spam)*
- [x] **Rate Limiter Login Admin (`app/api/auth/login/route.ts`)**: Batasi maksimal percobaan gagal (maks. 5 kali gagal per 15 menit per IP) untuk mencegah serangan tebak password (*brute-force*).
- [x] **Rate Limiter Upload Bukti Bayar (`app/api/payment-proofs/route.ts`)**:
  - Batasi frekuensi upload per IP (maks. 5 upload per 10 menit).
  - Tolak pengiriman baru apabila pelanggan tersebut masih memiliki bukti pembayaran berstatus `PENDING`.
- [x] **Validasi File Ketat**: Pastikan hanya tipe file gambar valid (`JPG`, `PNG`, `WebP`) dengan ukuran wajar yang diproses server.

### 3. Halaman Error & 404 Kustom *(Standar Produksi)*
- [x] **Halaman 404 (`app/not-found.tsx`)**: Tampilan formal bertema Korjo Tirto dengan tombol kembali ke Beranda jika pengguna membuka tautan yang tidak ditemukan.
- [x] **Halaman Error (`app/error.tsx`)**: Penanganan gangguan tak terduga dengan tombol *"Muat Ulang"* yang bersih.

### 4. Sinkronisasi Database Production & Pengujian End-to-End
- [ ] **Sinkronisasi Skema ke DB Production**: Terapkan tabel baru (`payment_proofs`) ke database Supabase Production secara aman tanpa menghapus data pelanggan yang sudah berjalan.
- [ ] **Verifikasi Variabel Vercel**: Pastikan `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, dan `SUPABASE_SERVICE_ROLE_KEY` sudah lengkap.
- [ ] **Uji Coba Alur Penuh**:
  1. Pelanggan cari nama/nomor -> unggah bukti transfer -> status berubah menjadi *Menunggu Verifikasi*.
  2. Admin buka menu *Pembayaran* -> *Approve* / *Reject* -> tagihan otomatis terpotong (FIFO) dan statistik Dashboard langsung ter-update.

---

## Bagian 2: Konsep Fitur Baru — Dashboard Operational Insights

Semua fitur di bawah ini menggunakan data yang sudah ada di tabel `Bill`, `MeterReading`, `PaymentProof`, dan `Customer` (tidak memerlukan perubahan skema database).

### 1. Alert Bukti Bayar Menunggu Verifikasi *(Posisi: Banner Atas Dashboard)*
- **Perilaku**:
  - Berupa *Banner Bar* formal dan ringkas tepat di bawah header Dashboard.
  - **Hanya tampil jika ada bukti bayar berstatus `PENDING`** (jika 0, banner otomatis disembunyikan agar halaman tetap bersih).
- **Isi Informasi**:
  - Ikon notifikasi + teks: *"Terdapat **X bukti pembayaran** (Total **Rp XXX.XXX**) menunggu verifikasi."*
  - Tombol aksi di kanan: **`Periksa Sekarang ->`** (mengarah langsung ke `/admin/payment-proofs`).

### 2. Panel "Insight Operasional" *(2 Kolom di Desktop / 2 Tab di Mobile)*

#### A. Prioritas Penagihan (Top Penunggak)
Menampilkan maksimal **5 pelanggan** yang paling perlu ditindaklanjuti berdasarkan jumlah bulan menunggak dan nominal tunggakan:
- **Informasi per Baris**:
  - Nomor & Nama Pelanggan (contoh: `012 - Pak Budi`)
  - Badge status formal: **`Menunggak 3 Bulan`**
  - Total Tunggakan: **`Rp 95.000`**
  - **Aksi Cepat**: Tombol **WhatsApp** (langsung kirim pesan tagihan) & tautan ke detail pelanggan.
- **State Kosong**: Jika tidak ada penunggak beruntun, tampilkan pesan bersih: *"Tidak ada pelanggan dengan tunggakan beruntun."*

#### B. Pemakaian Air ($\text{m}^3$) & Deteksi Anomali Meteran
Mengolah data `usage` ($\text{m}^3$) dari periode terbaru dibandingkan periode sebelumnya:
- **3 Kotak Ringkasan Kubikasi Bulan Ini**:
  1. **Total Distribusi Air**: total $\text{m}^3$ seluruh pelanggan bulan ini (beserta persentase naik/turun dibanding bulan lalu).
  2. **Rata-rata Pemakaian**: rata-rata $\text{m}^3$ per pelanggan.
  3. **Pemakaian Tertinggi**: pelanggan dengan kubikasi tertinggi bulan ini.
- **Daftar Deteksi Anomali Otomatis**:
  - **Lonjakan Drastis ($\ge 2\times$ lipat bulan lalu & $> 20\text{ m}^3$)**: Indikasi pipa bocor atau salah input stand meter (contoh: `008 - Bu Siti: 8 m³ -> 32 m³ (+300%)`).
  - **Pemakaian $0\text{ m}^3$**: Daftar rumah yang tercatat $0\text{ m}^3$ pada periode aktif (indikasi rumah kosong atau meteran macet).

### 3. Rencana Implementasi Teknis Insight
- [x] **Backend (`services/server/dashboard.service.ts` & `types/index.ts`)**:
  - Tambahkan perhitungan `pendingProofs` (count & total amount), `topDelinquents`, dan `waterUsageInsight` di dalam `getDashboardStats()`.
- [x] **Frontend (`components/dashboard/DashboardInsights.tsx`)**:
  - Buat komponen reusable bergaya formal (tanpa animasi memantul/berlebihan) dan pasang di `app/admin/dashboard/page.tsx`.

