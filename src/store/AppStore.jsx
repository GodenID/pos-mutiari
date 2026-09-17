/* =========================================================================
   Penyimpan status aplikasi — produk, kategori, transaksi, mutasi stok,
   dan pengaturan toko. Semua tersimpan di peramban.

   Catatan: seluruh ID dan cap waktu dibuat di dalam "pembuat aksi",
   sehingga reducer tetap murni (aman terhadap StrictMode).
   ========================================================================= */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import { AksiKonteks, SesiKonteks, StatusKonteks, ToastKonteks } from './konteks.js'
import { buatId, hapus, muat, simpan, kosongkanSemua } from '../lib/storage.js'
import { buatSalt, cocokSandi, hashSandi } from '../lib/auth.js'
import { kunciTanggal } from '../lib/format.js'
import {
  PENGATURAN_AWAL,
  PENGGUNA_AWAL,
  SUPPLIER_AWAL,
  dataDemoLengkap,
  dataKosong,
  nomorInvoice,
  nomorPO,
  pelangganDemoAwal,
} from '../data/seed.js'

const KUNCI = [
  'produk',
  'kategori',
  'transaksi',
  'mutasi',
  'pelanggan',
  'supplier',
  'pembelian',
  'pengguna',
  'pengaturan',
]

const KUNCI_SESI = 'kasirku.v1.sesi'

function muatSesi() {
  try {
    return sessionStorage.getItem(KUNCI_SESI) || ''
  } catch {
    return ''
  }
}

/** Migrasi: bentuk master pelanggan dari nama yang sudah ada di transaksi lama */
function pelangganDariTransaksi(transaksi) {
  const peta = new Map()
  transaksi.forEach((t) => {
    const nama = (t.pelanggan || '').trim()
    if (!nama) return
    const kunci = nama.toLowerCase()
    if (!peta.has(kunci)) {
      peta.set(kunci, {
        id: t.pelangganId || buatId('plg'),
        nama,
        telepon: '',
        alamat: '',
        catatan: 'Dibentuk otomatis dari riwayat transaksi',
        dibuatPada: t.tanggal,
      })
    }
  })
  return [...peta.values()]
}

function statusAwal() {
  // Bersihkan sisa data fitur parkir yang sudah dihapus
  hapus('parkir')
  const sudahPernah = muat('terpasang', false)
  if (!sudahPernah) {
    const demo = dataDemoLengkap()
    KUNCI.forEach((k) => simpan(k, demo[k]))
    simpan('terpasang', true)
    return demo
  }
  const kosong = dataKosong()
  const transaksi = muat('transaksi', kosong.transaksi)
  let pelanggan = muat('pelanggan', null)
  if (!Array.isArray(pelanggan)) {
    // Data lama (sebelum ada master pelanggan): bentuk dari riwayat,
    // gabung dengan contoh bila riwayat kosong agar bisa langsung dipakai.
    const dariRiwayat = pelangganDariTransaksi(transaksi)
    pelanggan =
      dariRiwayat.length > 0 ? dariRiwayat : pelangganDemoAwal()
    simpan('pelanggan', pelanggan)
  }
  let supplier = muat('supplier', null)
  if (!Array.isArray(supplier)) {
    supplier = SUPPLIER_AWAL.map((s) => ({ ...s }))
    simpan('supplier', supplier)
  }
  // Pengguna: tanam ulang akun bawaan bila belum ada (anti terkunci)
  let pengguna = muat('pengguna', null)
  if (!Array.isArray(pengguna) || pengguna.length === 0) {
    pengguna = PENGGUNA_AWAL.map((u) => ({ ...u }))
    simpan('pengguna', pengguna)
  }
  return {
    produk: muat('produk', kosong.produk),
    kategori: muat('kategori', kosong.kategori),
    transaksi,
    mutasi: muat('mutasi', kosong.mutasi),
    pelanggan,
    supplier,
    pembelian: muat('pembelian', kosong.pembelian),
    pengguna,
    pengaturan: { ...PENGATURAN_AWAL, ...muat('pengaturan', {}) },
  }
}

/* ------------------------------- Reducer -------------------------------- */

function reducer(status, aksi) {
  switch (aksi.tipe) {
    /* ---------------------------- Produk ---------------------------- */
    case 'produk/tambah':
      return {
        ...status,
        produk: [aksi.produk, ...status.produk],
        mutasi: aksi.mutasi ? [aksi.mutasi, ...status.mutasi] : status.mutasi,
      }

    case 'produk/ubah':
      return {
        ...status,
        produk: status.produk.map((p) =>
          p.id === aksi.produk.id ? { ...p, ...aksi.produk } : p,
        ),
        mutasi: aksi.mutasi ? [aksi.mutasi, ...status.mutasi] : status.mutasi,
      }

    case 'produk/hapus':
      return {
        ...status,
        produk: status.produk.filter((p) => p.id !== aksi.id),
      }

    case 'produk/aktif':
      return {
        ...status,
        produk: status.produk.map((p) =>
          p.id === aksi.id ? { ...p, aktif: aksi.aktif, updatedAt: aksi.waktu } : p,
        ),
      }

    /* --------------------------- Kategori --------------------------- */
    case 'kategori/tambah':
      return { ...status, kategori: [...status.kategori, aksi.kategori] }

    case 'kategori/ubah':
      return {
        ...status,
        kategori: status.kategori.map((k) =>
          k.id === aksi.id ? { ...k, nama: aksi.nama } : k,
        ),
        produk: status.produk.map((p) =>
          p.kategori === aksi.namaLama ? { ...p, kategori: aksi.nama } : p,
        ),
      }

    case 'kategori/hapus':
      return {
        ...status,
        kategori: status.kategori.filter((k) => k.id !== aksi.id),
        produk: status.produk.map((p) =>
          p.kategori === aksi.nama ? { ...p, kategori: 'Lain-lain' } : p,
        ),
      }

    /* ----------------------------- Stok ----------------------------- */
    case 'stok/mutasi': {
      const { produkId, stokBaru, mutasi, waktu } = aksi
      return {
        ...status,
        produk: status.produk.map((p) =>
          p.id === produkId ? { ...p, stok: stokBaru, updatedAt: waktu } : p,
        ),
        mutasi: [mutasi, ...status.mutasi],
      }
    }

    case 'stok/opname': {
      const petaBaru = new Map(aksi.perubahan.map((x) => [x.produkId, x.stokBaru]))
      return {
        ...status,
        produk: status.produk.map((p) =>
          petaBaru.has(p.id)
            ? { ...p, stok: petaBaru.get(p.id), updatedAt: aksi.waktu }
            : p,
        ),
        mutasi: [...aksi.mutasi, ...status.mutasi],
      }
    }

    /* --------------------------- Transaksi -------------------------- */
    case 'transaksi/simpan': {
      const pengurang = new Map()
      aksi.transaksi.item.forEach((it) =>
        pengurang.set(it.produkId, (pengurang.get(it.produkId) || 0) + it.qty),
      )
      return {
        ...status,
        transaksi: [aksi.transaksi, ...status.transaksi],
        mutasi: [...aksi.mutasi, ...status.mutasi],
        produk: status.produk.map((p) =>
          pengurang.has(p.id)
            ? {
                ...p,
                stok: p.stok - pengurang.get(p.id),
                updatedAt: aksi.transaksi.tanggal,
              }
            : p,
        ),
      }
    }

    case 'transaksi/void': {
      const trx = status.transaksi.find((t) => t.id === aksi.id)
      if (!trx || trx.status === 'void') return status
      const penambah = new Map()
      trx.item.forEach((it) =>
        penambah.set(it.produkId, (penambah.get(it.produkId) || 0) + it.qty),
      )
      return {
        ...status,
        transaksi: status.transaksi.map((t) =>
          t.id === aksi.id
            ? {
                ...t,
                status: 'void',
                alasanVoid: aksi.alasan,
                waktuVoid: aksi.waktu,
              }
            : t,
        ),
        mutasi: [...aksi.mutasi, ...status.mutasi],
        produk: status.produk.map((p) =>
          penambah.has(p.id)
            ? { ...p, stok: p.stok + penambah.get(p.id), updatedAt: aksi.waktu }
            : p,
        ),
      }
    }

    /* --------------------------- Pelanggan ------------------------ */
    case 'pelanggan/tambah':
      return { ...status, pelanggan: [aksi.pelanggan, ...status.pelanggan] }

    case 'pelanggan/ubah':
      return {
        ...status,
        pelanggan: status.pelanggan.map((p) =>
          p.id === aksi.pelanggan.id ? { ...p, ...aksi.pelanggan } : p,
        ),
      }

    case 'pelanggan/hapus':
      return {
        ...status,
        pelanggan: status.pelanggan.filter((p) => p.id !== aksi.id),
      }

    /* --------------------------- Supplier ------------------------- */
    case 'supplier/tambah':
      return { ...status, supplier: [aksi.supplier, ...status.supplier] }

    case 'supplier/ubah':
      return {
        ...status,
        supplier: status.supplier.map((s) =>
          s.id === aksi.supplier.id ? { ...s, ...aksi.supplier } : s,
        ),
      }

    case 'supplier/hapus':
      return {
        ...status,
        supplier: status.supplier.filter((s) => s.id !== aksi.id),
      }

    /* --------------------------- Pembelian ------------------------ */
    case 'pembelian/simpan': {
      const tambahStok = new Map()
      const nilaiMasuk = new Map()
      aksi.pembelian.item.forEach((it) => {
        tambahStok.set(it.produkId, (tambahStok.get(it.produkId) || 0) + it.qty)
        nilaiMasuk.set(
          it.produkId,
          (nilaiMasuk.get(it.produkId) || 0) + it.qty * it.hargaBeli,
        )
      })
      return {
        ...status,
        pembelian: [aksi.pembelian, ...status.pembelian],
        mutasi: [...aksi.mutasi, ...status.mutasi],
        produk: status.produk.map((p) => {
          if (!tambahStok.has(p.id)) return p
          const stokLama = Math.max(0, p.stok || 0)
          const qtyMasuk = tambahStok.get(p.id)
          const stokBaru = stokLama + qtyMasuk
          // Rata-rata tertimbang; stok lama kosong = murni harga masuk
          const rata = stokBaru > 0
            ? Math.round(((p.hargaBeli || 0) * stokLama + nilaiMasuk.get(p.id)) / stokBaru)
            : p.hargaBeli
          return {
            ...p,
            stok: p.stok + qtyMasuk,
            hargaBeli: rata,
            updatedAt: aksi.pembelian.tanggal,
          }
        }),
      }
    }

    /* --------------------------- Pengaturan ------------------------- */
    case 'pengaturan/simpan':
      return { ...status, pengaturan: { ...status.pengaturan, ...aksi.nilai } }

    /* ---------------------------- Pengguna -------------------------- */
    case 'pengguna/tambah':
      return { ...status, pengguna: [aksi.pengguna, ...status.pengguna] }

    case 'pengguna/ubah':
      return {
        ...status,
        pengguna: status.pengguna.map((u) =>
          u.id === aksi.pengguna.id ? { ...u, ...aksi.pengguna } : u,
        ),
      }

    case 'pengguna/hapus':
      return {
        ...status,
        pengguna: status.pengguna.filter((u) => u.id !== aksi.id),
      }

    /* ------------------------------ Data ---------------------------- */
    case 'data/ganti':
      return aksi.status

    default:
      return status
  }
}

/* ------------------------------- Provider ------------------------------- */

export function AppStoreProvider({ children }) {
  const [status, dispatch] = useReducer(reducer, undefined, statusAwal)
  const [sesiId, setSesiId] = useState(muatSesi)

  /* Simpan otomatis, ditunda sedikit agar tidak menulis tiap ketikan */
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      KUNCI.forEach((k) => simpan(k, status[k]))
    }, 220)
    return () => clearTimeout(timer.current)
  }, [status])

  /* ------------------------------ Toast ------------------------------ */
  const [toasts, setToasts] = useState([])

  const tutupToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useMemo(() => {
    const dorong = (jenis) => (pesan, durasi = 3200) => {
      const id = buatId('tst')
      setToasts((t) => [...t.slice(-3), { id, jenis, pesan }])
      if (durasi) setTimeout(() => tutupToast(id), durasi)
      return id
    }
    return {
      sukses: dorong('sukses'),
      galat: dorong('galat'),
      info: dorong('info'),
      tutup: tutupToast,
    }
  }, [tutupToast])

  /* Cermin status terakhir untuk dibaca di dalam pembuat aksi.
     Diperbarui lewat efek (bukan saat render) dan selalu sudah mutakhir
     ketika pengguna memicu aksi berikutnya. */
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  /* Sesi masuk — id pengguna aktif, tersimpan per tab peramban */
  const aturSesi = useCallback((id) => {
    setSesiId(id || '')
    try {
      if (id) sessionStorage.setItem(KUNCI_SESI, id)
      else sessionStorage.removeItem(KUNCI_SESI)
    } catch {
      /* diabaikan */
    }
  }, [])

  const sesiPengguna = useMemo(() => {
    if (!sesiId) return null
    return (
      status.pengguna.find((u) => u.id === sesiId && u.aktif !== false) || null
    )
  }, [status.pengguna, sesiId])

  /* ---------------------------- Aksi ------------------------------- */
  const aksi = useMemo(() => {
    const sekarang = () => new Date().toISOString()

    const buatMutasi = ({ produkId, nama, tipe, qty, keterangan, ref, petugas }) => ({
      id: buatId('mut'),
      tanggal: sekarang(),
      produkId,
      nama,
      tipe,
      qty,
      keterangan: keterangan || '',
      ref: ref || '',
      petugas: petugas || statusRef.current.pengaturan.kasir || 'Kasir',
    })

    return {
      /* ------------------------- Produk ------------------------- */
      tambahProduk(data) {
        const waktu = sekarang()
        const produk = {
          id: buatId('prd'),
          sku: String(data.sku || '').trim() || `LOK${Date.now().toString().slice(-9)}`,
          nama: data.nama.trim(),
          kategori: data.kategori,
          satuan: data.satuan || 'pcs',
          hargaBeli: Number(data.hargaBeli) || 0,
          hargaJual: Number(data.hargaJual) || 0,
          stok: Number(data.stok) || 0,
          stokMin: Number(data.stokMin) || 0,
          aktif: data.aktif !== false,
          updatedAt: waktu,
        }
        const mutasi =
          produk.stok > 0
            ? buatMutasi({
                produkId: produk.id,
                nama: produk.nama,
                tipe: 'masuk',
                qty: produk.stok,
                keterangan: 'Stok awal produk baru',
                ref: 'AWAL',
              })
            : null
        dispatch({ tipe: 'produk/tambah', produk, mutasi })
        return produk
      },

      ubahProduk(id, data) {
        const lama = statusRef.current.produk.find((p) => p.id === id)
        if (!lama) return null
        const waktu = sekarang()
        const stokBaru = Number(data.stok)
        const stokBerubah = Number.isFinite(stokBaru) && stokBaru !== lama.stok
        const produk = {
          id,
          sku: String(data.sku || '').trim() || lama.sku,
          nama: data.nama.trim(),
          kategori: data.kategori,
          satuan: data.satuan || 'pcs',
          hargaBeli: Number(data.hargaBeli) || 0,
          hargaJual: Number(data.hargaJual) || 0,
          stok: stokBerubah ? stokBaru : lama.stok,
          stokMin: Number(data.stokMin) || 0,
          aktif: data.aktif !== false,
          updatedAt: waktu,
        }
        const mutasi = stokBerubah
          ? buatMutasi({
              produkId: id,
              nama: produk.nama,
              tipe: 'penyesuaian',
              qty: stokBaru - lama.stok,
              keterangan: `Koreksi dari form produk (${lama.stok} → ${stokBaru})`,
              ref: 'EDIT',
            })
          : null
        dispatch({ tipe: 'produk/ubah', produk, mutasi })
        return produk
      },

      hapusProduk(id) {
        dispatch({ tipe: 'produk/hapus', id })
      },

      setAktifProduk(id, aktif) {
        dispatch({ tipe: 'produk/aktif', id, aktif, waktu: sekarang() })
      },

      /* ------------------------ Kategori ----------------------- */
      tambahKategori(nama) {
        const bersih = nama.trim()
        if (!bersih) return null
        const kategori = { id: buatId('kat'), nama: bersih }
        dispatch({ tipe: 'kategori/tambah', kategori })
        return kategori
      },

      ubahKategori(id, nama, namaLama) {
        dispatch({ tipe: 'kategori/ubah', id, nama: nama.trim(), namaLama })
      },

      hapusKategori(id, nama) {
        dispatch({ tipe: 'kategori/hapus', id, nama })
      },

      /* -------------------------- Stok ------------------------- */
      /** tipe: 'masuk' | 'keluar' | 'setel' (stock opname per produk) */
      mutasiStok({ produkId, tipe, qty, keterangan, ref }) {
        const p = statusRef.current.produk.find((x) => x.id === produkId)
        if (!p) return null
        const waktu = sekarang()
        const jumlah = Math.abs(Number(qty) || 0)
        let stokBaru = p.stok
        let delta = 0
        let tipeMutasi = tipe

        if (tipe === 'masuk') {
          stokBaru = p.stok + jumlah
          delta = jumlah
        } else if (tipe === 'keluar') {
          stokBaru = Math.max(0, p.stok - jumlah)
          delta = stokBaru - p.stok
        } else {
          stokBaru = jumlah
          delta = jumlah - p.stok
          tipeMutasi = 'penyesuaian'
        }

        if (delta === 0 && tipe !== 'setel') return null

        const mutasi = buatMutasi({
          produkId,
          nama: p.nama,
          tipe: tipeMutasi,
          qty: delta,
          keterangan,
          ref,
        })
        dispatch({ tipe: 'stok/mutasi', produkId, stokBaru, mutasi, waktu })
        return { stokLama: p.stok, stokBaru }
      },

      /** perubahan: [{ produkId, stokBaru }] */
      opnameStok(perubahan, keterangan = 'Stok opname') {
        const waktu = sekarang()
        const valid = []
        const mutasi = []
        perubahan.forEach(({ produkId, stokBaru }) => {
          const p = statusRef.current.produk.find((x) => x.id === produkId)
          if (!p) return
          const delta = Number(stokBaru) - p.stok
          if (delta === 0) return
          valid.push({ produkId, stokBaru: Number(stokBaru) })
          mutasi.push(
            buatMutasi({
              produkId,
              nama: p.nama,
              tipe: 'penyesuaian',
              qty: delta,
              keterangan: `${keterangan} (${p.stok} → ${stokBaru})`,
              ref: 'OPNAME',
            }),
          )
        })
        if (!valid.length) return 0
        dispatch({ tipe: 'stok/opname', perubahan: valid, mutasi, waktu })
        return valid.length
      },

      /* ------------------------ Transaksi ---------------------- */
      /**
       * @param {{item:Array, diskon:number, diskonNota:number, pajakPersen:number,
       *          metode:string, bayar:number, pembayaran:Array,
       *          pelanggan?:string, pelangganId?:string, catatan?:string}} data
       * item: [{produkId, sku, nama, satuan, harga, hargaBeli, qty, diskon?}]
       *   diskon = potongan Rp khusus baris itu (sudah termasuk di subtotal).
       * pembayaran: [{metode, jumlah}] — bila kosong, dipakai metode/bayar lama.
       */
      simpanTransaksi(data) {
        const waktu = new Date()
        const iso = waktu.toISOString()
        const kunci = kunciTanggal(waktu)
        const urut =
          statusRef.current.transaksi.filter((t) => kunciTanggal(t.tanggal) === kunci).length + 1

        const item = data.item.map((it) => {
          const diskonBaris = Math.max(
            0,
            Math.min(Number(it.diskon) || 0, it.harga * it.qty),
          )
          return {
            produkId: it.produkId,
            sku: it.sku,
            nama: it.nama,
            satuan: it.satuan,
            harga: it.harga,
            hargaBeli: it.hargaBeli,
            qty: it.qty,
            diskon: diskonBaris,
            subtotal: it.harga * it.qty - diskonBaris,
          }
        })

        const subtotal = item.reduce((a, b) => a + b.subtotal, 0)
        const diskonItem = item.reduce((a, b) => a + (b.diskon || 0), 0)
        const diskonNota = Math.min(
          Math.max(0, Number(data.diskonNota ?? data.diskon) || 0),
          subtotal,
        )
        const dasarPajak = subtotal - diskonNota
        const pajakPersen = Number(data.pajakPersen) || 0
        const pajak = Math.round((dasarPajak * pajakPersen) / 100)
        const total = dasarPajak + pajak

        let pembayaran = Array.isArray(data.pembayaran)
          ? data.pembayaran
              .map((p) => ({ metode: p.metode, jumlah: Math.max(0, Number(p.jumlah) || 0) }))
              .filter((p) => p.jumlah > 0)
          : []
        if (!pembayaran.length) {
          pembayaran = [
            { metode: data.metode || 'tunai', jumlah: Number(data.bayar) || total },
          ]
        }
        const bayar = pembayaran.reduce((a, p) => a + p.jumlah, 0)
        const utama = [...pembayaran].sort((a, b) => b.jumlah - a.jumlah)[0]

        // Pelanggan: pakai yang dipilih, atau cari/bentuk dari nama
        let pelangganId = data.pelangganId || ''
        let namaPelanggan = (data.pelanggan || '').trim()
        if (pelangganId) {
          const ada = statusRef.current.pelanggan.find((p) => p.id === pelangganId)
          if (ada) namaPelanggan = ada.nama
          else pelangganId = ''
        }
        if (!pelangganId && namaPelanggan) {
          const cocok = statusRef.current.pelanggan.find(
            (p) => p.nama.toLowerCase() === namaPelanggan.toLowerCase(),
          )
          if (cocok) {
            pelangganId = cocok.id
            namaPelanggan = cocok.nama
          } else {
            const baru = {
              id: buatId('plg'),
              nama: namaPelanggan,
              telepon: '',
              alamat: '',
              catatan: 'Dibentuk otomatis dari kasir',
              dibuatPada: iso,
            }
            pelangganId = baru.id
            dispatch({ tipe: 'pelanggan/tambah', pelanggan: baru })
          }
        }

        const transaksi = {
          id: buatId('trx'),
          nomor: nomorInvoice(waktu, urut),
          tanggal: iso,
          kasir: statusRef.current.pengaturan.kasir || 'Kasir',
          pelanggan: namaPelanggan,
          pelangganId,
          item,
          subtotal,
          diskonItem,
          diskon: diskonNota,
          pajakPersen,
          pajak,
          total,
          metode: utama.metode,
          pembayaran,
          bayar,
          kembalian: Math.max(0, bayar - total),
          status: 'selesai',
          catatan: (data.catatan || '').trim(),
        }

        const mutasi = item.map((it) => ({
          id: buatId('mut'),
          tanggal: iso,
          produkId: it.produkId,
          nama: it.nama,
          tipe: 'penjualan',
          qty: -it.qty,
          keterangan: 'Penjualan kasir',
          ref: transaksi.nomor,
          petugas: transaksi.kasir,
        }))

        dispatch({
          tipe: 'transaksi/simpan',
          transaksi,
          mutasi,
        })
        return transaksi
      },

      voidTransaksi(id, alasan = '') {
        const trx = statusRef.current.transaksi.find((t) => t.id === id)
        if (!trx || trx.status === 'void') return false
        const waktu = sekarang()
        const mutasi = trx.item.map((it) => ({
          id: buatId('mut'),
          tanggal: waktu,
          produkId: it.produkId,
          nama: it.nama,
          tipe: 'retur',
          qty: it.qty,
          keterangan: `Pembatalan transaksi ${trx.nomor}${alasan ? ` — ${alasan}` : ''}`,
          ref: trx.nomor,
          petugas: statusRef.current.pengaturan.kasir || 'Kasir',
        }))
        dispatch({ tipe: 'transaksi/void', id, alasan, waktu, mutasi })
        return true
      },

      /* ------------------------ Pelanggan ---------------------- */
      tambahPelanggan(data) {
        const pelanggan = {
          id: buatId('plg'),
          nama: String(data.nama || '').trim(),
          telepon: String(data.telepon || '').trim(),
          alamat: String(data.alamat || '').trim(),
          catatan: String(data.catatan || '').trim(),
          dibuatPada: sekarang(),
        }
        if (!pelanggan.nama) return null
        dispatch({ tipe: 'pelanggan/tambah', pelanggan })
        return pelanggan
      },

      ubahPelanggan(id, data) {
        const lama = statusRef.current.pelanggan.find((p) => p.id === id)
        if (!lama) return null
        const pelanggan = {
          id,
          nama: String(data.nama || '').trim() || lama.nama,
          telepon: String(data.telepon || '').trim(),
          alamat: String(data.alamat || '').trim(),
          catatan: String(data.catatan || '').trim(),
          dibuatPada: lama.dibuatPada,
        }
        dispatch({ tipe: 'pelanggan/ubah', pelanggan })
        return pelanggan
      },

      hapusPelanggan(id) {
        dispatch({ tipe: 'pelanggan/hapus', id })
      },

      /* ------------------------ Supplier ----------------------- */
      tambahSupplier(data) {
        const supplier = {
          id: buatId('sup'),
          nama: String(data.nama || '').trim(),
          telepon: String(data.telepon || '').trim(),
          alamat: String(data.alamat || '').trim(),
          catatan: String(data.catatan || '').trim(),
        }
        if (!supplier.nama) return null
        dispatch({ tipe: 'supplier/tambah', supplier })
        return supplier
      },

      ubahSupplier(id, data) {
        const lama = statusRef.current.supplier.find((s) => s.id === id)
        if (!lama) return null
        const supplier = {
          id,
          nama: String(data.nama || '').trim() || lama.nama,
          telepon: String(data.telepon || '').trim(),
          alamat: String(data.alamat || '').trim(),
          catatan: String(data.catatan || '').trim(),
        }
        dispatch({ tipe: 'supplier/ubah', supplier })
        return supplier
      },

      hapusSupplier(id) {
        dispatch({ tipe: 'supplier/hapus', id })
      },

      /* ------------------------ Pembelian ---------------------- */
      /**
       * @param {{supplierId:string, item:Array<{produkId,qty,hargaBeli}>,
       *          keterangan?:string}} data
       * Menambah stok, mencatat mutasi masuk per baris, dan memperbarui
       * harga beli produk ke rata-rata tertimbang
       * (stok lama × harga lama + masuk × harga masuk) / stok baru.
       */
       simpanPembelian(data) {
        const iso = sekarang()
        const kunci = kunciTanggal(new Date())
        const urut =
          statusRef.current.pembelian.filter(
            (p) => kunciTanggal(p.tanggal) === kunci,
          ).length + 1
        const sup = statusRef.current.supplier.find((s) => s.id === data.supplierId)

        const item = (data.item || [])
          .map((it) => {
            const p = statusRef.current.produk.find((x) => x.id === it.produkId)
            if (!p) return null
            const qty = Math.max(0, Number(it.qty) || 0)
            const hargaBeli = Math.max(0, Number(it.hargaBeli) || 0)
            if (qty <= 0) return null
            return {
              produkId: p.id,
              sku: p.sku,
              nama: p.nama,
              satuan: p.satuan,
              qty,
              hargaBeli,
              subtotal: qty * hargaBeli,
            }
          })
          .filter(Boolean)
        if (!item.length) return null

        const pembelian = {
          id: buatId('po'),
          nomor: nomorPO(new Date(), urut),
          tanggal: iso,
          supplierId: sup?.id || '',
          supplierNama: sup?.nama || 'Supplier umum',
          item,
          total: item.reduce((a, b) => a + b.subtotal, 0),
          keterangan: (data.keterangan || '').trim(),
          petugas: statusRef.current.pengaturan.kasir || 'Kasir',
        }

        const mutasi = item.map((it) => ({
          id: buatId('mut'),
          tanggal: iso,
          produkId: it.produkId,
          nama: it.nama,
          tipe: 'masuk',
          qty: it.qty,
          keterangan: `Pembelian ${pembelian.nomor} — ${pembelian.supplierNama} @${it.hargaBeli}`,
          ref: pembelian.nomor,
          petugas: pembelian.petugas,
        }))

        dispatch({ tipe: 'pembelian/simpan', pembelian, mutasi })
        return pembelian
      },

      /* ----------------------- Pengaturan ---------------------- */
      simpanPengaturan(nilai) {
        dispatch({ tipe: 'pengaturan/simpan', nilai })
      },

      /* -------------------------- Sesi ------------------------- */
      async masuk(username, sandi) {
        const nama = String(username || '').trim().toLowerCase()
        const akun = statusRef.current.pengguna.find(
          (u) => u.username.toLowerCase() === nama && u.aktif !== false,
        )
        if (!akun) return { ok: false, galat: 'Username tidak ditemukan' }
        if (!(await cocokSandi(akun, sandi || ''))) {
          return { ok: false, galat: 'Kata sandi salah' }
        }
        aturSesi(akun.id)
        // Nama kasir aktif mengikuti siapa yang masuk
        dispatch({ tipe: 'pengaturan/simpan', nilai: { kasir: akun.nama } })
        return { ok: true, pengguna: akun }
      },

      keluar() {
        aturSesi('')
      },

      /* ------------------------ Pengguna ----------------------- */
      async tambahPengguna({ nama, username, peran, sandi }) {
        const namaBersih = String(nama || '').trim()
        const uname = String(username || '').trim().toLowerCase().replace(/\s+/g, '')
        if (!namaBersih) return { ok: false, galat: 'Nama wajib diisi' }
        if (!uname) return { ok: false, galat: 'Username wajib diisi' }
        if (String(sandi || '').length < 6) {
          return { ok: false, galat: 'Kata sandi minimal 6 karakter' }
        }
        const bentrok = statusRef.current.pengguna.some(
          (u) => u.username.toLowerCase() === uname,
        )
        if (bentrok) return { ok: false, galat: 'Username sudah dipakai' }
        const salt = buatSalt()
        const pengguna = {
          id: buatId('usr'),
          nama: namaBersih,
          username: uname,
          peran: peran === 'admin' ? 'admin' : 'kasir',
          salt,
          hash: await hashSandi(sandi, salt),
          aktif: true,
          dibuatPada: sekarang(),
        }
        dispatch({ tipe: 'pengguna/tambah', pengguna })
        return { ok: true, pengguna }
      },

      ubahPengguna(id, { nama, peran }) {
        const lama = statusRef.current.pengguna.find((u) => u.id === id)
        if (!lama) return { ok: false, galat: 'Pengguna tidak ditemukan' }
        const namaBersih = String(nama || '').trim()
        if (!namaBersih) return { ok: false, galat: 'Nama wajib diisi' }
        const peranBaru = peran === 'admin' ? 'admin' : 'kasir'
        if (lama.peran === 'admin' && peranBaru !== 'admin') {
          const adminLain = statusRef.current.pengguna.some(
            (u) => u.id !== id && u.peran === 'admin' && u.aktif !== false,
          )
          if (!adminLain) {
            return { ok: false, galat: 'Minimal harus ada 1 admin aktif' }
          }
        }
        dispatch({ tipe: 'pengguna/ubah', pengguna: { id, nama: namaBersih, peran: peranBaru } })
        return { ok: true }
      },

      async aturSandi(id, sandiBaru) {
        const lama = statusRef.current.pengguna.find((u) => u.id === id)
        if (!lama) return { ok: false, galat: 'Pengguna tidak ditemukan' }
        if (String(sandiBaru || '').length < 6) {
          return { ok: false, galat: 'Kata sandi minimal 6 karakter' }
        }
        const salt = buatSalt()
        dispatch({
          tipe: 'pengguna/ubah',
          pengguna: { id, salt, hash: await hashSandi(sandiBaru, salt) },
        })
        return { ok: true }
      },

      setAktifPengguna(id, aktif) {
        if (!aktif) {
          const target = statusRef.current.pengguna.find((u) => u.id === id)
          if (target?.peran === 'admin') {
            const adminLain = statusRef.current.pengguna.some(
              (u) => u.id !== id && u.peran === 'admin' && u.aktif !== false,
            )
            if (!adminLain) return { ok: false, galat: 'Minimal harus ada 1 admin aktif' }
          }
        }
        dispatch({ tipe: 'pengguna/ubah', pengguna: { id, aktif } })
        return { ok: true }
      },

      hapusPengguna(id, sesiIdAktif) {
        if (id === sesiIdAktif) return { ok: false, galat: 'Tidak bisa menghapus akun sendiri' }
        const target = statusRef.current.pengguna.find((u) => u.id === id)
        if (!target) return { ok: false, galat: 'Pengguna tidak ditemukan' }
        if (target.peran === 'admin') {
          const adminLain = statusRef.current.pengguna.some(
            (u) => u.id !== id && u.peran === 'admin' && u.aktif !== false,
          )
          if (!adminLain) return { ok: false, galat: 'Minimal harus ada 1 admin aktif' }
        }
        dispatch({ tipe: 'pengguna/hapus', id })
        return { ok: true }
      },

      /* -------------------------- Data ------------------------- */
      muatDemo() {
        // Akun login dipertahankan agar tidak terkunci keluar
        const penggunaAktif = statusRef.current.pengguna
        kosongkanSemua()
        const demo = dataDemoLengkap()
        if (penggunaAktif?.length) demo.pengguna = penggunaAktif
        KUNCI.forEach((k) => simpan(k, demo[k]))
        simpan('terpasang', true)
        dispatch({ tipe: 'data/ganti', status: demo })
      },

      kosongkanData() {
        const penggunaAktif = statusRef.current.pengguna
        kosongkanSemua()
        const kosong = dataKosong()
        if (penggunaAktif?.length) kosong.pengguna = penggunaAktif
        KUNCI.forEach((k) => simpan(k, kosong[k]))
        simpan('terpasang', true)
        dispatch({ tipe: 'data/ganti', status: kosong })
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <StatusKonteks.Provider value={status}>
      <AksiKonteks.Provider value={aksi}>
        <ToastKonteks.Provider value={toast}>
          <SesiKonteks.Provider value={{ pengguna: sesiPengguna }}>
            {children}
            <TumpukToast daftar={toasts} tutup={tutupToast} />
          </SesiKonteks.Provider>
        </ToastKonteks.Provider>
      </AksiKonteks.Provider>
    </StatusKonteks.Provider>
  )
}

/* --------------------------- Tumpukan toast ----------------------------- */

function TumpukToast({ daftar, tutup }) {
  if (!daftar.length) return null
  const ikon = { sukses: 'centang-bulat', galat: 'peringatan', info: 'info' }
  return (
    <div className="toast-tumpuk tanpa-cetak" role="status" aria-live="polite">
      {daftar.map((t) => (
        <div key={t.id} className={`toast toast-${t.jenis}`}>
          <Icon nama={ikon[t.jenis] || 'info'} ukuran={16} />
          <span className="isi">{t.pesan}</span>
          <button
            type="button"
            className="toast-tutup"
            onClick={() => tutup(t.id)}
            aria-label="Tutup pemberitahuan"
          >
            <Icon nama="tutup" ukuran={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
