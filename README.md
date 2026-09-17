# Kasirku — Sistem Point of Sale (Frontend)

Aplikasi kasir berbahasa Indonesia untuk toko kelontong / minimarket / retail kecil.
Dibangun dengan **React + Vite**, berjalan sepenuhnya di peramban (tanpa backend),
dan responsif dari layar desktop kasir sampai ponsel.

## Menjalankan

```bash
npm install
npm run dev      # buka http://localhost:5173
```

```bash
npm run build    # hasil produksi di folder dist/
npm run preview  # pratinjau hasil build
npm run lint     # pemeriksaan kode (oxlint)
```

## Modul

| Halaman | Isi |
| --- | --- |
| **Dasbor** | Penjualan & laba hari ini (dibanding kemarin), grafik 7 hari, produk terlaris, daftar stok kritis, transaksi terakhir |
| **Kasir** | Pindai/ketik barcode + bunyi pindai, katalog produk per kategori, keranjang, diskon Rp/%, PPN opsional, 4 metode bayar, hitung kembalian, cetak struk (bisa otomatis) |
| **Produk** | CRUD produk, barcode/SKU, harga beli & jual, margin otomatis, stok minimum, aktif/nonaktif, kelola kategori, impor CSV/Excel (ada template + pratinjau validasi), ekspor CSV |
| **Stok & Mutasi** | Nilai persediaan, barang masuk/keluar, stok opname massal, riwayat mutasi lengkap dengan penyebab & petugas |
| **Penjualan** | Riwayat nota per periode, saring metode/status, rincian nota, cetak ulang struk, pembatalan nota (stok otomatis kembali) |
| **Laporan** | Ringkasan periode + perbandingan periode sebelumnya, laba kotor harian, produk terlaris, rekap persediaan, jam tersibuk, kinerja kasir — bisa dicetak & diekspor |
| **Pengaturan** | Identitas toko, PPN, format & lebar struk (58/80 mm), terbilang, operasional kasir (bunyi, cetak otomatis), pintasan papan tuts, muat ulang / kosongkan data |

## Pintasan papan tuts (halaman Kasir)

| Tombol | Fungsi |
| --- | --- |
| `F2` | Fokus ke kolom pindai barcode |
| `F4` | Fokus ke kolom cari produk |
| `F9` | Buka pembayaran / selesaikan transaksi |
| `Esc` | Tutup dialog |

## Format Indonesia

- Mata uang `Rp 1.250.000`, pemisah ribuan titik, desimal koma
- Tanggal `16 Sep 2026`, `Rabu, 16 September 2026`, jam `14:30`
- Total pada struk dicetak dalam huruf (*terbilang*): "dua puluh lima ribu rupiah"
- Ekspor CSV memakai pemisah `;` + BOM UTF-8 agar langsung rapi di Excel Indonesia

## Penyimpanan data

Semua data (produk, transaksi, mutasi, pengaturan) disimpan di **localStorage**
peramban dengan awalan `kasirku.v1.*`. Tidak ada data yang dikirim ke server.

Saat pertama dibuka, aplikasi memuat **data contoh**: 38 produk, 7 kategori, dan
riwayat penjualan 70 hari — supaya dasbor dan laporan langsung berisi. Data ini
bisa diganti kapan saja di **Pengaturan → Data aplikasi**:

- *Muat Ulang Data Demo* — kembalikan ke data contoh
- *Kosongkan Semua Data* — mulai dari toko kosong

> Untuk dipakai di lebih dari satu perangkat/kasir, lapisan penyimpanan
> (`src/lib/storage.js` dan aksi di `src/store/AppStore.jsx`) perlu diganti dengan
> pemanggilan API backend. Struktur data sudah dipisah agar penggantian ini terbatas
> pada dua berkas tersebut.

## Struktur

```
src/
  components/       Komponen UI (Icon, Modal, UI, Bagan, Struk, Layout, kasir/)
  pages/            Dasbor, Kasir, Produk, Stok, Penjualan, Laporan, Pengaturan
  store/            AppStore.jsx (provider + reducer), konteks.js (hook akses)
  lib/              format.js (Rupiah/tanggal/terbilang), analitik.js (agregasi),
                    storage.js, csv.js, cetak.js
  hooks/            useRentang.js (periode laporan)
  data/             seed.js (produk & riwayat contoh)
  styles/           base.css (token), layout.css, components.css, print.css
```

## Desain

Latar putih, hijau `#0F7A4F` sebagai satu-satunya warna aksi, pembatas garis tipis
(bukan bayangan tebal), dan seluruh angka memakai huruf *tabular/monospace* supaya
kolom rupiah rata dan mudah dibaca cepat — mengikuti kebiasaan tampilan buku kas.
Sudut membulat ditahan di 4–9 px; bentuk pil hanya untuk lencana status.

## Cetak

Struk dan lembar laporan dicetak lewat `window.print()`. Hanya bagian yang relevan
yang ikut tercetak (lihat `src/styles/print.css` dan `src/lib/cetak.js`), sehingga
sidebar dan tombol tidak muncul di kertas. Lebar struk mengikuti pengaturan
58 mm atau 80 mm.
