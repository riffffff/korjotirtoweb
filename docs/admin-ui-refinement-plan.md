# Rencana Penyempurnaan UI Admin

## Tujuan

Menyamakan pengalaman visual dan interaksi pada seluruh halaman admin Korjo Tirto,
dengan fokus pada navigasi yang konsisten, tampilan mobile, state interaksi, dan
hierarki informasi yang lebih jelas.

## Standar visual

- Container halaman: `max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6`.
- Judul halaman: `text-lg` pada mobile dan `text-xl` pada desktop.
- Card: `rounded-xl`, border netral, dan padding konsisten.
- Tombol utama memakai komponen reusable bila tersedia.
- Metadata memakai ukuran kecil tetapi tetap terbaca pada mobile.
- Semua halaman admin menyediakan akses Dashboard dan kembali.

## Ruang lingkup eksekusi

1. Menstandarkan header dan navigasi halaman admin.
2. Menjadikan navbar mobile dashboard berisi lima menu:
   Dashboard, Pelanggan, Pembayaran, Import, dan Pengaturan.
   Navbar mobile menampilkan ikon saja dengan label tetap tersedia melalui
   `aria-label` dan tooltip browser.
3. Memperbaiki state aktif sidebar untuk route turunan.
4. Menambahkan modal konfirmasi approve dan modal alasan reject.
5. Menyempurnakan empty state, loading state, dan feedback aksi.
6. Merapikan kartu pengajuan pembayaran dan preview bukti.
7. Mengurangi nesting card pada Pengaturan.
8. Memisahkan area import dan manajemen data.
9. Menyamakan detail responsive pada Dashboard dan daftar pelanggan.
10. Menjalankan lint, type-check, dan build setelah perubahan.

## Status

Seluruh ruang lingkup utama di bawah ini sudah diterapkan. Polishing lanjutan
terakhir mencakup modal pembuatan tagihan, empty state daftar pelanggan, badge
jumlah status pembayaran, indikator loading WhatsApp, dan validasi dialog.
Native `alert`, `confirm`, dan `prompt` pada alur admin/customer utama juga
sudah diganti dengan modal atau feedback inline.
Perubahan divalidasi dengan lint, type-check, serta production build.

## Catatan validasi

- ESLint berhasil tanpa error.
- TypeScript check berhasil.
- Production build berhasil.
- Warning middleware Next.js masih ada sebagai warning framework, bukan error aplikasi.

## Batasan

- Tidak mengubah aturan pembayaran FIFO.
- Tidak mengubah kontrak API yang tidak diperlukan untuk UI.
- Tidak menghapus data atau melakukan reset database.
- Perubahan difokuskan pada UI, UX, dan komponen reusable.
