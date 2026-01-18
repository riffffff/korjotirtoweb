# Panduan Penggunaan Aplikasi Korjo Tirto v1.0

Selamat datang di Buku Panduan Penggunaan Aplikasi **Korjo Tirto**, sistem informasi pembayaran dan pencatatan meter air untuk HIPPAM Sukorejo.

## Daftar Isi

1. [Akses & Login](#1-akses--login)
2. [Dashboard Utama](#2-dashboard-utama)
3. [Manajemen Pelanggan](#3-manajemen-pelanggan)
4. [Pencatatan Meter (Bulanan)](#4-pencatatan-meter-bulanan)
5. [Pembayaran Tagihan](#5-pembayaran-tagihan)
6. [Fitur WhatsApp Broadcast](#6-fitur-whatsapp-broadcast)
7. [Pengaturan Sistem](#7-pengaturan-sistem)
8. [Maintenance (Reset Data)](#8-maintenance-reset-data)

---

## 1. Akses & Login

Untuk mengakses aplikasi, buka alamat website di browser Anda (contoh: `https://korjotirto.my.id`).

1.  **Halaman Login**: Anda akan disambut halaman login.
2.  **Kredensial Admin**:
    - **Username**: `admin`
    - **Password**: `admin123` (Default)
3.  Klik tombol **Login**.

> **Catatan**: Jika salah password, pastikan Capslock tidak menyala.

---

## 2. Dashboard Utama

Setelah berhasil login, Anda akan masuk ke halaman Dashboard. Di sini Anda bisa melihat ringkasan performa HIPPAM:

- **Total Pelanggan**: Jumlah pelanggan aktif.
- **Pembayaran Bulan Ini**: Total uang yang masuk bulan ini.
- **Tagihan Belum Lunas**: Total piutang atau tagihan yang belum dibayar warga.
- **Penggunaan Air**: Grafik konsumsi air bulan ini vs bulan lalu.

---

## 3. Manajemen Pelanggan

Menu ini digunakan untuk mengelola data warga/pelanggan.
Akses menu: **Pelanggan** (Sidebar Kiri).

### A. Tambah Pelanggan Manual

1.  Klik tombol **+ Tambah Pelanggan**.
2.  Isi formulir:
    - **Nama**: Nama lengkap pelanggan.
    - **Nomor Pelanggan**: Nomor unik (misal: 001).
    - **No. HP/WA**: Nomor WhatsApp aktif (format: 08xx...).
    - **Alamat**: Alamat rumah.
3.  Klik **Simpan**.

### B. Import Data dari Excel

Jika data banyak, gunakan fitur Import.

1.  Klik menu **Import Data** di sidebar.
2.  Download **Template Excel** yang disediakan.
3.  Isi data pelanggan di file Excel tersebut (jangan ubah header kolom).
4.  Upload kembali file Excel ke aplikasi.
5.  Tunggu proses selesai.
    - _Sistem akan otomatis meng-update jika nomor pelanggan sudah ada._

---

## 4. Pencatatan Meter (Bulanan)

Ini adalah aktivitas rutin setiap bulan untuk mencatat meteran air dan membuat tagihan.

1.  Masuk ke menu **Pencatatan Meter** atau klik nama pelanggan di daftar Pelanggan.
2.  Pilih **Periode** (Bulan & Tahun, misal: Februari 2026).
3.  **Input Meteran Akhir**:
    - Masukkan angka meteran terbaru yang tertera di meteran warga.
    - Sistem otomatis menghitung **Pemakaian (m³)** = Meter Akhir - Meter Awal.
4.  **Rincian Biaya**:
    - Sistem otomatis menghitung biaya berdasarkan aturan tarif (0-10m³, 11-20m³, dst) dan Beban Admin.
5.  Simpan pencatatan. Tagihan otomatis terbentuk dengan status **Belum Lunas**.

---

## 5. Pembayaran Tagihan

Ketika warga datang membayar:

1.  Cari nama pelanggan di menu **Pelanggan**.
2.  Klik tombol **Detail** / icon mata.
3.  Di halaman detail, lihat daftar **Tagihan Belum Lunas**.
4.  Klik tombol **Bayar** pada bulan yang dimaksud.
5.  Konfirmasi pembayaran.
6.  Status berubah menjadi **Lunas** dan tercatat tanggal bayarnya.

---

## 6. Fitur WhatsApp Broadcast

Anda bisa mengirim tagihan ke nomor WhatsApp warga secara otomatis.

1.  Pastikan nomor HP pelanggan sudah benar.
2.  Di halaman detail tagihan atau rekap bulanan, klik tombol **Kirim WA**.
3.  Akan terbuka aplikasi WhatsApp/WA Web dengan pesan otomatis berisi detail tagihan dan link pembayaran (jika ada).
4.  Tekan kirim.

> **Penting**: Pastikan Anda sudah login WhatsApp Web di browser yang sama.

---

## 7. Pengaturan Sistem

Menu **Pengaturan** digunakan untuk mengubah variabel tarif:

- **Tarif Air**: Harga per m³ untuk tiap blok konsumsi (misal: 0-10m³ = Rp 2.000).
- **Biaya Admin**: Biaya beban tetap bulanan (misal: Rp 3.000).
- **Denda**: Nominal denda keterlambatan (jika fitur denda aktif).

Simpan perubahan untuk menerapkan tarif baru ke tagihan bulan _selanjutnya_.

---

## 8. Maintenance (Reset Data)

**Fitur Berbahaya (Hati-hati!)**
Fitur ini digunakan jika Anda ingin menghapus **SEMUA DATA** dan memulai dari nol (misalnya setelah masa uji coba selesai dan siap untuk produksi).

1.  Buka link khusus: `https://korjotirto.my.id/api/maintenance/reset?key=korjo-reset-2026`
2.  Sistem akan:
    - Menghapus semua data pelanggan & transaksi.
    - Mereset nomor urut ID database.
    - Membuat ulang user `admin` (password: `admin123`).
3.  Login kembali dengan akun default tersebut.

---

**Korjo Tirto v1.0** - _Sistem Pembayaran Air HIPPAM Sukorejo_
