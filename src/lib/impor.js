/* =========================================================================
   Impor produk dari CSV / Excel + unduh template.
   CSV mengikuti format ekspor aplikasi (pemisah ; atau ,, BOM, baris sep=).
   ========================================================================= */

import { keAngka } from './format.js'
import { unduhXls } from './xls.js'

/* ------------------------------ Template ------------------------------- */

export const KOLOM_TEMPLATE = [
  'SKU/Barcode',
  'Nama Produk',
  'Kategori',
  'Satuan',
  'Harga Beli',
  'Harga Jual',
  'Stok',
  'Stok Min',
  'Status',
]

const CONTOH_BARIS = [
  ['8998866101011', 'Indomie Goreng', 'Makanan Instan', 'pcs', 2500, 3500, 48, 12, 'Dijual'],
  ['', 'Teh Botol Sosro 450ml', 'Minuman', 'botol', 3000, 4000, 0, 12, 'Dijual'],
]

export async function unduhTemplateExcel() {
  await unduhXls(`template_impor_produk`, KOLOM_TEMPLATE, CONTOH_BARIS, [
    'Template impor produk — baris contoh boleh dihapus. Kolom "Nama Produk", "Kategori", dan "Harga Jual" wajib diisi.',
    'SKU kosong = dibuat otomatis. Status: Dijual / Nonaktif.',
  ])
}

/* ---------------------------- Parser CSV ------------------------------- */

/** Pecah satu baris CSV dengan pemisah tertentu, hormati tanda kutip */
function pecahBaris(baris, pemisah) {
  const sel = []
  let kini = ''
  let dalamKutip = false
  for (let i = 0; i < baris.length; i += 1) {
    const c = baris[i]
    if (dalamKutip) {
      if (c === '"') {
        if (baris[i + 1] === '"') {
          kini += '"'
          i += 1
        } else {
          dalamKutip = false
        }
      } else {
        kini += c
      }
    } else if (c === '"') {
      dalamKutip = true
    } else if (c === pemisah) {
      sel.push(kini)
      kini = ''
    } else {
      kini += c
    }
  }
  sel.push(kini)
  return sel.map((s) => s.trim())
}

export function parseCsvTeks(teks) {
  const bersih = String(teks || '')
    .replace(/^﻿/, '')
    .replace(/^\uFEFF/, '')
  const baris = bersih.split(/\r?\n/).filter((b) => b.trim() !== '')
  if (!baris.length) return []
  const awal = baris[0].trim().toLowerCase() === 'sep=;' ? baris.slice(1) : baris
  if (!awal.length) return []
  // Deteksi pemisah dari baris pertama yang mengandung header
  const contoh = awal[0]
  const pemisah =
    contoh.split(';').length >= contoh.split(',').length ? ';' : ','
  return awal.map((b) => pecahBaris(b, pemisah))
}

/* ------------------------- Pemetaan kolom ------------------------------ */

const ALIAS = {
  sku: ['sku', 'barcode', 'kode', 'kode barang', 'sku/barcode'],
  nama: ['nama', 'nama produk', 'nama barang'],
  kategori: ['kategori'],
  satuan: ['satuan'],
  hargaBeli: ['harga beli', 'modal', 'harga modal'],
  hargaJual: ['harga jual', 'harga'],
  stok: ['stok', 'stok awal', 'qty', 'jumlah'],
  stokMin: ['stok min', 'stok minimum', 'minimum', 'min'],
  aktif: ['status', 'aktif', 'dijual'],
}

function normalJudul(s) {
  return String(s || '').trim().toLowerCase()
}

/** Cari indeks kolom untuk tiap kunci kanonis dari baris judul */
function petakanKolom(judul) {
  const peta = {}
  judul.forEach((j, i) => {
    const n = normalJudul(j)
    Object.entries(ALIAS).forEach(([kunci, alias]) => {
      if (peta[kunci] === undefined && alias.includes(n)) peta[kunci] = i
    })
  })
  return peta
}

function barisJudulValid(sel) {
  const peta = petakanKolom(sel)
  return peta.nama !== undefined ? peta : null
}

/* --------------------------- Baca berkas ------------------------------- */

/**
 * @returns {Promise<{ok:boolean, galat?:string, baris?:Array<Array<string>>}>}
 * baris = matriks sel mentah (tanpa baris judul)
 */
export async function bacaFileProduk(file) {
  const nama = String(file?.name || '').toLowerCase()
  try {
    let matriks
    if (nama.endsWith('.csv')) {
      matriks = parseCsvTeks(await file.text())
    } else if (nama.endsWith('.xlsx') || nama.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const buku = XLSX.read(buf, { type: 'array' })
      const lembar = buku.Sheets[buku.SheetNames[0]]
      if (!lembar) return { ok: false, galat: 'Berkas Excel tidak berisi lembar kerja' }
      matriks = XLSX.utils.sheet_to_json(lembar, { header: 1, defval: '', raw: true })
        .map((r) => r.map((s) => String(s ?? '').trim()))
        .filter((r) => r.some((s) => s !== ''))
    } else {
      return { ok: false, galat: 'Format berkas tidak didukung — pakai .csv, .xls, atau .xlsx' }
    }
    if (!matriks.length) return { ok: false, galat: 'Berkas kosong' }

    // Baris judul = baris pertama yang memuat kolom "nama"
    const idxJudul = matriks.findIndex((r) => barisJudulValid(r))
    if (idxJudul < 0) {
      return {
        ok: false,
        galat: 'Baris judul tidak ditemukan — pakai template agar kolom terbaca',
      }
    }
    const peta = petakanKolom(matriks[idxJudul])
    const data = matriks.slice(idxJudul + 1).filter((r) => r.some((s) => s !== ''))
    if (!data.length) return { ok: false, galat: 'Tidak ada baris data di bawah judul' }
    if (data.length > 2000) {
      return { ok: false, galat: `Terlalu banyak baris (${data.length}) — maksimal 2.000 per impor` }
    }
    const ambil = (r, kunci) => (peta[kunci] === undefined ? '' : String(r[peta[kunci]] ?? '').trim())
    return {
      ok: true,
      baris: data.map((r, i) => ({
        no: idxJudul + 2 + i,
        sku: ambil(r, 'sku'),
        nama: ambil(r, 'nama'),
        kategori: ambil(r, 'kategori'),
        satuan: ambil(r, 'satuan') || 'pcs',
        hargaBeli: ambil(r, 'hargaBeli'),
        hargaJual: ambil(r, 'hargaJual'),
        stok: ambil(r, 'stok'),
        stokMin: ambil(r, 'stokMin'),
        aktif: ambil(r, 'aktif'),
      })),
    }
  } catch {
    return { ok: false, galat: 'Berkas tidak bisa dibaca — pastikan tidak rusak' }
  }
}

/* ----------------------------- Validasi -------------------------------- */

const NONAKTIF = ['nonaktif', 'tidak', 'tidak dijual', 'no', 'false', '0', 'n', 'off']

export function parseAktif(teks) {
  const t = String(teks || '').trim().toLowerCase()
  if (!t || t === 'dijual' || t === 'aktif' || t === 'ya' || t === 'yes' || t === 'true' || t === '1') return true
  return !NONAKTIF.includes(t)
}

/**
 * @param {Array} barisMentah  dari bacaFileProduk
 * @param {Array} produkAda    daftar produk saat ini (cek duplikat SKU)
 * @returns {Array<{no, mentah, ok, galat:Array<string>, data}>}
 */
export function validasiBarisImpor(barisMentah, produkAda) {
  const skuAda = new Set((produkAda || []).map((p) => String(p.sku || '')))
  const skuFile = new Set()
  return barisMentah.map((m) => {
    const galat = []
    const nama = String(m.nama || '').trim()
    const kategori = String(m.kategori || '').trim()
    const sku = String(m.sku || '').trim()
    const hargaJual = keAngka(m.hargaJual)
    const hargaBeli = keAngka(m.hargaBeli)
    const stok = keAngka(m.stok)
    const stokMin = keAngka(m.stokMin)

    if (!nama) galat.push('Nama produk wajib diisi')
    if (!kategori) galat.push('Kategori wajib diisi')
    if (!(hargaJual > 0)) galat.push('Harga jual harus lebih dari 0')
    if (stok < 0) galat.push('Stok tidak boleh negatif')
    if (stokMin < 0) galat.push('Stok min tidak boleh negatif')
    if (sku) {
      if (skuAda.has(sku)) galat.push(`SKU dipakai produk lain`)
      else if (skuFile.has(sku)) galat.push(`SKU duplikat di berkas ini`)
      else skuFile.add(sku)
    }

    return {
      no: m.no,
      mentah: m,
      ok: galat.length === 0,
      galat,
      data: {
        nama,
        sku,
        kategori,
        satuan: String(m.satuan || 'pcs').trim() || 'pcs',
        hargaBeli,
        hargaJual,
        stok,
        stokMin,
        aktif: parseAktif(m.aktif),
      },
    }
  })
}
