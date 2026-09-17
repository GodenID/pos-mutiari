/* =========================================================================
   Data contoh (demo) — toko kelontong / minimarket Indonesia
   Dipakai saat aplikasi pertama kali dibuka atau setelah "Muat ulang demo".
   ========================================================================= */

import { kunciTanggal, tambahHari } from '../lib/format.js'

export const KATEGORI_AWAL = [
  { id: 'kat_minuman', nama: 'Minuman' },
  { id: 'kat_makanan', nama: 'Makanan Instan' },
  { id: 'kat_sembako', nama: 'Sembako' },
  { id: 'kat_snack', nama: 'Snack & Biskuit' },
  { id: 'kat_perawatan', nama: 'Perawatan Diri' },
  { id: 'kat_rumah', nama: 'Rumah Tangga' },
  { id: 'kat_atk', nama: 'Alat Tulis' },
]

export const SATUAN = ['pcs', 'pack', 'botol', 'kaleng', 'sachet', 'kg', 'liter', 'renteng', 'dus']

export const METODE_BAYAR = [
  { id: 'tunai', nama: 'Tunai', ikon: 'uang' },
  { id: 'qris', nama: 'QRIS', ikon: 'qr' },
  { id: 'debit', nama: 'Kartu Debit', ikon: 'kartu' },
  { id: 'transfer', nama: 'Transfer', ikon: 'transfer' },
]

export const labelMetode = (id) =>
  METODE_BAYAR.find((m) => m.id === id)?.nama ?? id

/* ------------------------------- Supplier -------------------------------- */

export const SUPPLIER_AWAL = [
  {
    id: 'sup_grosir_amanah',
    nama: 'Toko Grosir Amanah',
    telepon: '022-7318890',
    alamat: 'Jl. Pasar Baru No. 12, Bandung',
    catatan: 'Sembako & minuman',
  },
  {
    id: 'sup_sumber_rejeki',
    nama: 'Distributor Sumber Rejeki',
    telepon: '022-7304455',
    alamat: 'Jl. Industri No. 88, Cimahi',
    catatan: 'Makanan instan & snack',
  },
  {
    id: 'sup_segar_jaya',
    nama: 'Agen Segar Jaya',
    telepon: '0812-2233-4455',
    alamat: 'Pasar Induk Caringin Blok C-21',
    catatan: 'Telur & kebutuhan segar',
  },
]

/** Nomor pembelian: "PO-20260916-0001" */
export function nomorPO(tgl, urut) {
  const d = tgl instanceof Date ? tgl : new Date(tgl)
  const p = (n) => String(n).padStart(2, '0')
  const tanggalStr = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  return `PO-${tanggalStr}-${String(urut).padStart(4, '0')}`
}

/* ------------------------------- Pelanggan ------------------------------- */
/* Dibentuk dari nama-nama yang muncul di riwayat demo + beberapa umum */

const PELANGGAN_DEMO_TAMBAHAN = [
  { nama: 'Bu Ningsih', telepon: '0812-1001-2001', alamat: 'Jl. Mawar No. 5' },
  { nama: 'Pak Hadi', telepon: '0813-3002-4002', alamat: 'Jl. Melati No. 18' },
  { nama: 'Warung Bu Tuti', telepon: '0815-5003-6003', alamat: 'Jl. Kebon Jeruk No. 2' },
  { nama: 'Kantin SDN 3', telepon: '022-7441122', alamat: 'Jl. Sekolah No. 3' },
  { nama: 'Ibu Sari', telepon: '0817-7004-8004', alamat: 'Komplek Permata Blok B-9' },
]

export function pelangganDemoAwal() {
  const sekarang = new Date().toISOString()
  return PELANGGAN_DEMO_TAMBAHAN.map((p, i) => ({
    id: `plg_demo_${i + 1}`,
    nama: p.nama,
    telepon: p.telepon,
    alamat: p.alamat,
    catatan: '',
    dibuatPada: sekarang,
  }))
}

/* --------------------------------- Produk -------------------------------- */

const P = (sku, nama, kategori, satuan, beli, jual, stok, stokMin) => ({
  id: `prd_${sku}`,
  sku,
  nama,
  kategori,
  satuan,
  hargaBeli: beli,
  hargaJual: jual,
  stok,
  stokMin,
  aktif: true,
})

export const PRODUK_AWAL = [
  // Minuman
  P('8991002101010', 'Aqua Botol 600ml', 'Minuman', 'botol', 2600, 4000, 96, 24),
  P('8991002101027', 'Aqua Galon 19L', 'Minuman', 'pcs', 17000, 21000, 14, 6),
  P('8992761111017', 'Teh Botol Sosro 350ml', 'Minuman', 'botol', 3800, 5000, 62, 18),
  P('8998009011016', 'Coca-Cola Kaleng 330ml', 'Minuman', 'kaleng', 5200, 7000, 40, 12),
  P('8998866200011', 'Le Minerale 600ml', 'Minuman', 'botol', 2800, 4000, 78, 24),
  P('8993175537018', 'Kopi Kapal Api Special 165gr', 'Minuman', 'pack', 12500, 16000, 26, 8),
  P('8992775211014', 'Susu Ultra Milk Cokelat 250ml', 'Minuman', 'pcs', 5300, 7000, 48, 12),
  P('8996001600146', 'Energen Cokelat (isi 10)', 'Minuman', 'pack', 11000, 14500, 22, 6),
  P('8993189251012', 'Good Day Cappuccino Sachet', 'Minuman', 'sachet', 1400, 2000, 120, 30),

  // Makanan instan
  P('8998866101011', 'Indomie Goreng', 'Makanan Instan', 'pcs', 2700, 3500, 180, 48),
  P('8998866101028', 'Indomie Kuah Ayam Bawang', 'Makanan Instan', 'pcs', 2600, 3500, 144, 48),
  P('8998866101035', 'Mie Sedaap Soto', 'Makanan Instan', 'pcs', 2500, 3300, 96, 36),
  P('8992388101015', 'Sarden ABC Saus Tomat 155gr', 'Makanan Instan', 'kaleng', 8200, 11000, 30, 10),
  P('8991102000019', 'Kornet Pronas 340gr', 'Makanan Instan', 'kaleng', 21000, 27000, 12, 4),
  P('8993110001015', 'Bubur Instan Ayam 40gr', 'Makanan Instan', 'pcs', 4200, 5500, 24, 8),

  // Sembako
  P('8996006200015', 'Beras Pandan Wangi 5kg', 'Sembako', 'pack', 62000, 72000, 18, 5),
  P('8992696400012', 'Gula Pasir Gulaku 1kg', 'Sembako', 'kg', 14500, 17500, 34, 10),
  P('8992222100013', 'Minyak Goreng Bimoli 2L', 'Sembako', 'pcs', 34000, 39000, 22, 8),
  P('8998103200018', 'Tepung Terigu Segitiga Biru 1kg', 'Sembako', 'kg', 11500, 14000, 26, 8),
  P('8991389100014', 'Telur Ayam Negeri', 'Sembako', 'kg', 26000, 30000, 20, 6),
  P('8992770100011', 'Kecap Manis Bango 520ml', 'Sembako', 'botol', 21500, 26000, 16, 5),
  P('8993240300017', 'Garam Dapur Beryodium 250gr', 'Sembako', 'pack', 2200, 3500, 40, 12),

  // Snack & biskuit
  P('8992753100016', 'Chitato Sapi Panggang 68gr', 'Snack & Biskuit', 'pcs', 9500, 12500, 36, 12),
  P('8992745100013', 'Oreo Cokelat 133gr', 'Snack & Biskuit', 'pack', 8800, 11500, 30, 10),
  P('8996241100019', 'Roma Malkist Abon 115gr', 'Snack & Biskuit', 'pack', 7200, 9500, 34, 12),
  P('8991001100015', 'SilverQueen Cashew 58gr', 'Snack & Biskuit', 'pcs', 12000, 15500, 20, 6),
  P('8993058100011', 'Beng-Beng (renteng isi 10)', 'Snack & Biskuit', 'renteng', 15500, 20000, 14, 5),

  // Perawatan diri
  P('8999999100012', 'Pepsodent Pasta Gigi 190gr', 'Perawatan Diri', 'pcs', 15500, 19500, 24, 8),
  P('8999999200019', 'Lifebuoy Sabun Cair 400ml', 'Perawatan Diri', 'botol', 24000, 29500, 18, 6),
  P('8999999300016', 'Sunsilk Sampo Sachet 12ml', 'Perawatan Diri', 'sachet', 900, 1500, 150, 40),
  P('8992727100014', 'Rexona Roll On 45ml', 'Perawatan Diri', 'pcs', 18500, 23500, 14, 5),

  // Rumah tangga
  P('8999999400013', 'Rinso Deterjen Bubuk 770gr', 'Rumah Tangga', 'pack', 19500, 24000, 20, 6),
  P('8999999500010', 'Sunlight Pencuci Piring 755ml', 'Rumah Tangga', 'botol', 17000, 21500, 22, 8),
  P('8993456100018', 'Tisu Paseo Facial 250 sheet', 'Rumah Tangga', 'pack', 14000, 18000, 16, 6),
  P('8992345100015', 'Baygon Aerosol 600ml', 'Rumah Tangga', 'pcs', 32000, 38500, 8, 4),

  // Alat tulis
  P('8991234100016', 'Pulpen Standard AE7 Hitam', 'Alat Tulis', 'pcs', 2000, 3000, 60, 20),
  P('8991234200013', 'Buku Tulis Sidu 38 Lembar', 'Alat Tulis', 'pcs', 3400, 4500, 45, 15),
  P('8991234300010', 'Pensil 2B Faber-Castell', 'Alat Tulis', 'pcs', 3200, 4500, 38, 12),
]

/* ------------------------------ Pengaturan ------------------------------- */

export const PENGATURAN_AWAL = {
  namaToko: 'Mutiari Garden',
  alamat: 'Jl. Damai 1 No.51-52 lt2, RT.004/RW.003, Jatisari, Kec. Jatiasih, Kota Bks, Jawa Barat 17426',
  telepon: '0857-7009-4079',
  npwp: '',
  kasir: 'Admin',
  pajakAktif: false,
  pajakPersen: 11,
  footerStruk: 'Terima kasih telah berbelanja. Barang yang sudah dibeli tidak dapat ditukar.',
  tampilkanTerbilang: true,
  lebarStruk: '58mm',
  bunyiPindai: true,
  cetakOtomatis: false,
  /* Kredensial integrasi akuntansi — rahasia idealnya pindah ke backend */
  integrasi: {
    accurate: { clientId: '', clientSecret: '', redirectUri: '', dbId: '' },
    jurnal: { clientId: '', clientSecret: '', perusahaan: '' },
  },
}

/* --------------------------- Pengguna bawaan ---------------------------- */
/* Hash = SHA-256("salt:password"). Kata sandi bawaan:
   admin / admin123  (peran admin)  •  kasir / kasir123  (peran kasir) */

export const PENGGUNA_AWAL = [
  {
    id: 'usr_admin',
    nama: 'Admin',
    username: 'admin',
    peran: 'admin',
    salt: 'mg-admin-7f3a',
    hash: '34c3b48a145d8a5cec4eef631ca1d81a5b5cb21824ed1338949c32ac9756a0d2',
    aktif: true,
    dibuatPada: new Date().toISOString(),
  },
  {
    id: 'usr_kasir',
    nama: 'Kasir',
    username: 'kasir',
    peran: 'kasir',
    salt: 'mg-kasir-9c1e',
    hash: '4d5344aa2bd9f9d1899451955f98042262d0f630eb7d5602e06a19553d0293df',
    aktif: true,
    dibuatPada: new Date().toISOString(),
  },
]

/* --------------------------- Pembangkit riwayat -------------------------- */

/** LCG sederhana agar data demo konsisten tiap kali dibuat */
function acakan(benih = 20260916) {
  let s = benih % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const HARI_RIWAYAT = 70

const KASIR_DEMO = ['Rina Marlina', 'Dewi Anggraeni', 'Bagas Prakoso']

const PELANGGAN_DEMO = [
  '',
  '',
  '',
  '',
  'Bu Ningsih',
  'Pak Hadi',
  'Warung Bu Tuti',
  'Kantin SDN 3',
  'Ibu Sari',
]

export function nomorInvoice(tgl, urut) {
  const d = tgl instanceof Date ? tgl : new Date(tgl)
  const p = (n) => String(n).padStart(2, '0')
  const tanggalStr = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  return `INV-${tanggalStr}-${String(urut).padStart(4, '0')}`
}

/**
 * Membuat transaksi & mutasi stok contoh.
 * Bobot produk dibuat tidak rata supaya laporan "produk terlaris" bermakna.
 */
export function buatRiwayatDemo(produk = PRODUK_AWAL) {
  const rnd = acakan()
  const transaksi = []
  const mutasi = []

  // Bobot popularitas: makanan instan & minuman jauh lebih sering terjual
  const bobot = produk.map((p) => {
    if (p.kategori === 'Makanan Instan') return 9
    if (p.kategori === 'Minuman') return 8
    if (p.kategori === 'Snack & Biskuit') return 6
    if (p.kategori === 'Sembako') return 4
    if (p.kategori === 'Perawatan Diri') return 3
    if (p.kategori === 'Rumah Tangga') return 2
    return 1
  })
  const totalBobot = bobot.reduce((a, b) => a + b, 0)

  const pilihProduk = () => {
    let n = rnd() * totalBobot
    for (let i = 0; i < produk.length; i += 1) {
      n -= bobot[i]
      if (n <= 0) return produk[i]
    }
    return produk[0]
  }

  const hariIni = new Date()

  for (let mundur = HARI_RIWAYAT; mundur >= 0; mundur -= 1) {
    const tglDasar = tambahHari(hariIni, -mundur)
    const hari = tglDasar.getDay() // 0 Minggu
    const akhirPekan = hari === 0 || hari === 6

    // Tren naik tipis mendekati hari ini + ramai di akhir pekan
    const dasar = 7 + Math.round((HARI_RIWAYAT - mundur) / 14)
    let jumlahTransaksi = dasar + Math.floor(rnd() * 9) + (akhirPekan ? 6 : 0)
    if (rnd() < 0.06) jumlahTransaksi = Math.max(2, Math.round(jumlahTransaksi * 0.4))
    if (mundur === 0) jumlahTransaksi = Math.max(3, Math.round(jumlahTransaksi * 0.65))

    for (let i = 0; i < jumlahTransaksi; i += 1) {
      // Jam operasional 07:00 – 21:00, puncak pagi & sore
      const puncak = rnd()
      let hh
      if (puncak < 0.3) hh = 7 + Math.floor(rnd() * 3)
      else if (puncak < 0.62) hh = 16 + Math.floor(rnd() * 4)
      else hh = 10 + Math.floor(rnd() * 6)
      const waktu = new Date(
        tglDasar.getFullYear(),
        tglDasar.getMonth(),
        tglDasar.getDate(),
        hh,
        Math.floor(rnd() * 60),
        Math.floor(rnd() * 60),
      )

      const jumlahBaris = 1 + Math.floor(rnd() * (rnd() < 0.25 ? 6 : 3))
      const dipakai = new Set()
      const item = []

      for (let j = 0; j < jumlahBaris; j += 1) {
        const p = pilihProduk()
        if (dipakai.has(p.id)) continue
        dipakai.add(p.id)
        const qty =
          p.hargaJual <= 4000
            ? 1 + Math.floor(rnd() * 6)
            : p.hargaJual <= 20000
              ? 1 + Math.floor(rnd() * 3)
              : 1
        item.push({
          produkId: p.id,
          sku: p.sku,
          nama: p.nama,
          satuan: p.satuan,
          harga: p.hargaJual,
          hargaBeli: p.hargaBeli,
          qty,
          subtotal: p.hargaJual * qty,
        })
      }
      if (!item.length) continue

      const subtotal = item.reduce((a, b) => a + b.subtotal, 0)
      const diskon = rnd() < 0.12 ? Math.round((subtotal * (rnd() < 0.5 ? 5 : 10)) / 100 / 500) * 500 : 0
      const total = Math.max(0, subtotal - diskon)

      const undianMetode = rnd()
      const metode =
        undianMetode < 0.62
          ? 'tunai'
          : undianMetode < 0.85
            ? 'qris'
            : undianMetode < 0.95
              ? 'debit'
              : 'transfer'

      const bayar =
        metode === 'tunai' ? Math.ceil(total / 5000) * 5000 + (rnd() < 0.3 ? 5000 : 0) : total

      const urut = transaksi.filter(
        (t) => kunciTanggal(t.tanggal) === kunciTanggal(waktu),
      ).length + 1

      const status = rnd() < 0.008 ? 'void' : 'selesai'

      transaksi.push({
        id: `trx_${waktu.getTime()}_${i}`,
        nomor: nomorInvoice(waktu, urut),
        tanggal: waktu.toISOString(),
        kasir: KASIR_DEMO[Math.floor(rnd() * KASIR_DEMO.length)],
        pelanggan: PELANGGAN_DEMO[Math.floor(rnd() * PELANGGAN_DEMO.length)],
        item,
        subtotal,
        diskon,
        pajak: 0,
        pajakPersen: 0,
        total,
        metode,
        bayar,
        kembalian: Math.max(0, bayar - total),
        status,
        catatan: '',
      })

      // Mutasi penjualan hanya untuk 14 hari terakhir agar data tetap ringkas
      if (mundur <= 14 && status === 'selesai') {
        item.forEach((it, idx) => {
          mutasi.push({
            id: `mut_${waktu.getTime()}_${i}_${idx}`,
            tanggal: waktu.toISOString(),
            produkId: it.produkId,
            nama: it.nama,
            tipe: 'penjualan',
            qty: -it.qty,
            keterangan: 'Penjualan kasir',
            ref: nomorInvoice(waktu, urut),
            petugas: 'Sistem',
          })
        })
      }
    }

    // Pembelian dari supplier tiap beberapa hari
    if (mundur % 7 === 3) {
      const jumlahMasuk = 3 + Math.floor(rnd() * 4)
      for (let k = 0; k < jumlahMasuk; k += 1) {
        const p = produk[Math.floor(rnd() * produk.length)]
        const qty = 12 + Math.floor(rnd() * 5) * 12
        const waktu = new Date(
          tglDasar.getFullYear(),
          tglDasar.getMonth(),
          tglDasar.getDate(),
          8,
          10 + k * 4,
        )
        mutasi.push({
          id: `mut_in_${waktu.getTime()}_${k}`,
          tanggal: waktu.toISOString(),
          produkId: p.id,
          nama: p.nama,
          tipe: 'masuk',
          qty,
          keterangan: 'Pembelian dari supplier',
          ref: `PO-${kunciTanggal(waktu).replace(/-/g, '')}`,
          petugas: 'Bagas Prakoso',
        })
      }
    }

    // Penyesuaian / stok rusak sesekali
    if (mundur % 19 === 5) {
      const p = produk[Math.floor(rnd() * produk.length)]
      const waktu = new Date(
        tglDasar.getFullYear(),
        tglDasar.getMonth(),
        tglDasar.getDate(),
        17,
        30,
      )
      mutasi.push({
        id: `mut_adj_${waktu.getTime()}`,
        tanggal: waktu.toISOString(),
        produkId: p.id,
        nama: p.nama,
        tipe: 'keluar',
        qty: -(1 + Math.floor(rnd() * 3)),
        keterangan: 'Barang rusak / kedaluwarsa',
        ref: 'ADJ',
        petugas: 'Rina Marlina',
      })
    }
  }

  mutasi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
  transaksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

  return { transaksi, mutasi }
}

export function dataDemoLengkap() {
  const produk = PRODUK_AWAL.map((p) => ({ ...p, updatedAt: new Date().toISOString() }))
  const { transaksi, mutasi } = buatRiwayatDemo(produk)
  return {
    produk,
    kategori: KATEGORI_AWAL.map((k) => ({ ...k })),
    transaksi,
    mutasi,
    pelanggan: pelangganDemoAwal(),
    supplier: SUPPLIER_AWAL.map((s) => ({ ...s })),
    pembelian: [],
    pengguna: PENGGUNA_AWAL.map((u) => ({ ...u })),
    pengaturan: { ...PENGATURAN_AWAL },
  }
}

export function dataKosong() {
  return {
    produk: [],
    kategori: KATEGORI_AWAL.map((k) => ({ ...k })),
    transaksi: [],
    mutasi: [],
    pelanggan: [],
    supplier: SUPPLIER_AWAL.map((s) => ({ ...s })),
    pembelian: [],
    pengguna: PENGGUNA_AWAL.map((u) => ({ ...u })),
    pengaturan: { ...PENGATURAN_AWAL },
  }
}
