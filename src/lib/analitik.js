/* =========================================================================
   Perhitungan turunan (analitik) — fungsi murni, tanpa efek samping.
   Semua omzet mengabaikan transaksi berstatus "void".
   ========================================================================= */

import { awalHari, akhirHari, kunciTanggal, tambahHari } from './format.js'

export const hanyaSelesai = (transaksi) =>
  transaksi.filter((t) => t.status !== 'void')

export function dalamRentang(transaksi, dari, sampai) {
  const a = awalHari(dari).getTime()
  const b = akhirHari(sampai).getTime()
  return transaksi.filter((t) => {
    const w = new Date(t.tanggal).getTime()
    return w >= a && w <= b
  })
}

/** Ringkasan agregat sekumpulan transaksi */
export function ringkas(daftar) {
  const selesai = hanyaSelesai(daftar)
  let omzet = 0
  let hpp = 0
  let item = 0
  let diskon = 0
  let pajak = 0
  let baris = 0

  selesai.forEach((t) => {
    omzet += t.total
    diskon += (t.diskon || 0) + (t.diskonItem || 0)
    pajak += t.pajak || 0
    baris += t.item.length
    t.item.forEach((it) => {
      item += it.qty
      hpp += (it.hargaBeli || 0) * it.qty
    })
  })

  const jumlah = selesai.length
  return {
    omzet,
    hpp,
    labaKotor: omzet - pajak - hpp,
    marginPersen: omzet ? ((omzet - pajak - hpp) / omzet) * 100 : 0,
    jumlahTransaksi: jumlah,
    itemTerjual: item,
    barisItem: baris,
    diskon,
    pajak,
    rataPerTransaksi: jumlah ? omzet / jumlah : 0,
    rataItemPerTransaksi: jumlah ? item / jumlah : 0,
    dibatalkan: daftar.length - jumlah,
  }
}

/** Deret harian lengkap (hari tanpa transaksi tetap muncul sebagai 0) */
export function deretHarian(transaksi, dari, sampai) {
  const selesai = hanyaSelesai(dalamRentang(transaksi, dari, sampai))
  const peta = new Map()
  selesai.forEach((t) => {
    const k = kunciTanggal(t.tanggal)
    const s = peta.get(k) || { omzet: 0, transaksi: 0, item: 0, laba: 0 }
    s.omzet += t.total
    s.transaksi += 1
    t.item.forEach((it) => {
      s.item += it.qty
      s.laba += (it.harga - (it.hargaBeli || 0)) * it.qty
    })
    peta.set(k, s)
  })

  const hasil = []
  let kursor = awalHari(dari)
  const batas = awalHari(sampai)
  let pengaman = 0
  while (kursor <= batas && pengaman < 400) {
    const k = kunciTanggal(kursor)
    const s = peta.get(k) || { omzet: 0, transaksi: 0, item: 0, laba: 0 }
    hasil.push({ kunci: k, tanggal: new Date(kursor), ...s })
    kursor = tambahHari(kursor, 1)
    pengaman += 1
  }
  return hasil
}

/** Distribusi 24 jam — untuk mengetahui jam tersibuk */
export function deretJam(daftar) {
  const ember = Array.from({ length: 24 }, (_, j) => ({
    jam: j,
    omzet: 0,
    transaksi: 0,
  }))
  hanyaSelesai(daftar).forEach((t) => {
    const j = new Date(t.tanggal).getHours()
    ember[j].omzet += t.total
    ember[j].transaksi += 1
  })
  return ember
}

/** Peringkat produk berdasarkan qty terjual */
export function produkTerlaris(daftar, batas = 10) {
  const peta = new Map()
  hanyaSelesai(daftar).forEach((t) => {
    t.item.forEach((it) => {
      const s = peta.get(it.produkId) || {
        produkId: it.produkId,
        nama: it.nama,
        sku: it.sku,
        satuan: it.satuan,
        qty: 0,
        omzet: 0,
        laba: 0,
      }
      s.qty += it.qty
      s.omzet += it.subtotal
      s.laba += (it.harga - (it.hargaBeli || 0)) * it.qty
      peta.set(it.produkId, s)
    })
  })
  const semua = [...peta.values()].sort((a, b) => b.qty - a.qty)
  return batas ? semua.slice(0, batas) : semua
}

/** Rekap per metode pembayaran (mendukung split payment: omzet dibagi
    proporsional per metode, jumlah transaksi dihitung di metode utama) */
export function perMetode(daftar) {
  const peta = new Map()
  const selesai = hanyaSelesai(daftar)
  const sentuh = (metode, omzet, hitungTrx) => {
    const s = peta.get(metode) || { metode, omzet: 0, transaksi: 0 }
    s.omzet += omzet
    if (hitungTrx) s.transaksi += 1
    peta.set(metode, s)
  }
  selesai.forEach((t) => {
    const bayar = Array.isArray(t.pembayaran)
      ? t.pembayaran.filter((p) => p.jumlah > 0)
      : []
    if (bayar.length > 1) {
      // Bagi total bersih (tanpa kembalian) proporsional per metode
      const jumlahBayar = bayar.reduce((a, p) => a + p.jumlah, 0) || 1
      bayar.forEach((p) => {
        sentuh(
          p.metode,
          Math.round((t.total * p.jumlah) / jumlahBayar),
          p.metode === t.metode,
        )
      })
    } else {
      sentuh(t.metode, t.total, true)
    }
  })
  const total = selesai.reduce((a, t) => a + t.total, 0)
  return [...peta.values()]
    .map((s) => ({ ...s, porsi: total ? (s.omzet / total) * 100 : 0 }))
    .sort((a, b) => b.omzet - a.omzet)
}

/** Rekap per kategori produk */
export function perKategori(daftar, produk) {
  const kategoriProduk = new Map(produk.map((p) => [p.id, p.kategori]))
  const peta = new Map()
  hanyaSelesai(daftar).forEach((t) => {
    t.item.forEach((it) => {
      const kat = kategoriProduk.get(it.produkId) || 'Lain-lain'
      const s = peta.get(kat) || { kategori: kat, qty: 0, omzet: 0, laba: 0 }
      s.qty += it.qty
      s.omzet += it.subtotal
      s.laba += (it.harga - (it.hargaBeli || 0)) * it.qty
      peta.set(kat, s)
    })
  })
  const total = [...peta.values()].reduce((a, s) => a + s.omzet, 0)
  return [...peta.values()]
    .map((s) => ({ ...s, porsi: total ? (s.omzet / total) * 100 : 0 }))
    .sort((a, b) => b.omzet - a.omzet)
}

/** Rekap per kasir */
export function perKasir(daftar) {
  const peta = new Map()
  hanyaSelesai(daftar).forEach((t) => {
    const s = peta.get(t.kasir) || { kasir: t.kasir, omzet: 0, transaksi: 0 }
    s.omzet += t.total
    s.transaksi += 1
    peta.set(t.kasir, s)
  })
  return [...peta.values()].sort((a, b) => b.omzet - a.omzet)
}

/** Rekap belanja per pelanggan dari riwayat transaksi.
    Kunci: pelangganId bila ada, sonst nama (huruf kecil). */
export function perPelanggan(daftar) {
  const peta = new Map()
  hanyaSelesai(daftar).forEach((t) => {
    const nama = (t.pelanggan || '').trim()
    if (!nama) return
    const kunci = t.pelangganId || `nama:${nama.toLowerCase()}`
    const s = peta.get(kunci) || {
      id: t.pelangganId || '',
      nama,
      transaksi: 0,
      omzet: 0,
      item: 0,
      terakhir: t.tanggal,
    }
    s.transaksi += 1
    s.omzet += t.total
    s.terakhir =
      new Date(t.tanggal) > new Date(s.terakhir) ? t.tanggal : s.terakhir
    if (!s.id && t.pelangganId) s.id = t.pelangganId
    if (s.nama !== nama && t.pelangganId) s.nama = nama
    t.item.forEach((it) => {
      s.item += it.qty
    })
    peta.set(kunci, s)
  })
  return [...peta.values()].sort((a, b) => b.omzet - a.omzet)
}

/** Rincian produk yang pernah dibeli satu pelanggan */
export function produkPelanggan(daftar, pelangganId, nama) {
  const kunciNama = String(nama || '').trim().toLowerCase()
  const peta = new Map()
  hanyaSelesai(daftar).forEach((t) => {
    const cocok = pelangganId
      ? t.pelangganId === pelangganId ||
        (!t.pelangganId && (t.pelanggan || '').trim().toLowerCase() === kunciNama)
      : (t.pelanggan || '').trim().toLowerCase() === kunciNama
    if (!cocok) return
    t.item.forEach((it) => {
      const s = peta.get(it.produkId) || {
        produkId: it.produkId,
        nama: it.nama,
        sku: it.sku,
        satuan: it.satuan,
        qty: 0,
        omzet: 0,
        terakhir: t.tanggal,
      }
      s.qty += it.qty
      s.omzet += it.subtotal
      if (new Date(t.tanggal) > new Date(s.terakhir)) s.terakhir = t.tanggal
      peta.set(it.produkId, s)
    })
  })
  return [...peta.values()].sort((a, b) => b.qty - a.qty)
}

/** Riwayat harga beli satu produk dari catatan pembelian (terbaru dulu) */
export function riwayatHargaBeli(pembelian, produkId) {
  const hasil = []
  ;(pembelian || []).forEach((po) => {
    ;(po.item || []).forEach((it) => {
      if (it.produkId === produkId) {
        hasil.push({
          nomor: po.nomor,
          tanggal: po.tanggal,
          supplier: po.supplierNama,
          qty: it.qty,
          hargaBeli: it.hargaBeli,
        })
      }
    })
  })
  return hasil.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
}

/* --------------------------------- Stok ---------------------------------- */

export const statusStok = (p) => {
  if (p.stok <= 0) return 'habis'
  if (p.stokMin > 0 && p.stok <= p.stokMin) return 'menipis'
  return 'aman'
}

export function stokKritis(produk) {
  const aktif = produk.filter((p) => p.aktif !== false)
  return {
    habis: aktif.filter((p) => statusStok(p) === 'habis'),
    menipis: aktif.filter((p) => statusStok(p) === 'menipis'),
  }
}

export function nilaiPersediaan(produk) {
  let modal = 0
  let jual = 0
  let unit = 0
  produk.forEach((p) => {
    modal += p.hargaBeli * p.stok
    jual += p.hargaJual * p.stok
    unit += p.stok
  })
  return {
    modal,
    jual,
    potensiLaba: jual - modal,
    unit,
    sku: produk.length,
  }
}

/** Margin per produk dalam persen */
export const marginProduk = (p) =>
  p.hargaJual > 0 ? ((p.hargaJual - p.hargaBeli) / p.hargaJual) * 100 : 0

/* ------------------------------- Bantuan --------------------------------- */

/** Perubahan relatif dalam persen; null bila pembanding nol */
export function delta(sekarang, sebelum) {
  if (!sebelum) return sekarang > 0 ? null : 0
  return ((sekarang - sebelum) / sebelum) * 100
}

/** Rentang periode sebelumnya dengan panjang yang sama */
export function periodeSebelumnya(dari, sampai) {
  const a = awalHari(dari)
  const b = awalHari(sampai)
  const panjang = Math.round((b - a) / 86400000) + 1
  return {
    dari: tambahHari(a, -panjang),
    sampai: tambahHari(a, -1),
  }
}
