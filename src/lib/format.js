/* =========================================================================
   Pemformatan lokal Indonesia (id-ID)
   Rupiah, angka ribuan titik, tanggal, jam, dan terbilang.
   ========================================================================= */

const fmtAngka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

const fmtDesimal = (digit) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digit,
    maximumFractionDigits: digit,
  })

/** 1250000 -> "1.250.000" */
export function angka(n) {
  return fmtAngka.format(Math.round(Number(n) || 0))
}

/** 1234.567 -> "1.234,57" */
export function desimal(n, digit = 2) {
  return fmtDesimal(digit).format(Number(n) || 0)
}

/** 1250000 -> "Rp 1.250.000" (negatif -> "-Rp 1.250.000") */
export function rupiah(n) {
  const v = Math.round(Number(n) || 0)
  return `${v < 0 ? '-' : ''}Rp ${fmtAngka.format(Math.abs(v))}`
}

/** Tanpa awalan "Rp" — untuk kolom tabel yang sudah berjudul rupiah */
export function rupiahTanpaLabel(n) {
  const v = Math.round(Number(n) || 0)
  return `${v < 0 ? '-' : ''}${fmtAngka.format(Math.abs(v))}`
}

/** 1250000 -> "Rp 1,25 jt" — untuk label bagan yang sempit */
export function rupiahSingkat(n) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const tanda = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${tanda}Rp ${desimal(abs / 1e12, 2)} T`
  if (abs >= 1e9) return `${tanda}Rp ${desimal(abs / 1e9, 2)} M`
  if (abs >= 1e6) return `${tanda}Rp ${desimal(abs / 1e6, abs >= 1e8 ? 0 : 1)} jt`
  if (abs >= 1e3) return `${tanda}Rp ${desimal(abs / 1e3, 0)} rb`
  return rupiah(v)
}

/** 12.5 -> "12,5%" */
export function persen(n, digit = 1) {
  const v = Number(n) || 0
  const d = Number.isInteger(v) ? 0 : digit
  return `${desimal(v, d)}%`
}

/** Ubah masukan pengguna ("Rp 1.250.000", "1250000") menjadi angka */
export function keAngka(teks) {
  if (typeof teks === 'number') return Number.isFinite(teks) ? teks : 0
  if (!teks) return 0
  const bersih = String(teks).replace(/[^\d,-]/g, '').replace(',', '.')
  const n = parseFloat(bersih)
  return Number.isFinite(n) ? n : 0
}

/* ------------------------------ Tanggal --------------------------------- */

const keTanggal = (d) => (d instanceof Date ? d : new Date(d))

const fmtTglPendek = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const fmtTglPanjang = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const fmtTglSedang = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const fmtJam = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

const fmtHari = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })
const fmtHariPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })
const fmtBulan = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
})

/** "16 Sep 2026" */
export const tanggal = (d) => fmtTglPendek.format(keTanggal(d))

/** "16 September 2026" */
export const tanggalSedang = (d) => fmtTglSedang.format(keTanggal(d))

/** "Rabu, 16 September 2026" */
export const tanggalPanjang = (d) => fmtTglPanjang.format(keTanggal(d))

/** "14:30" (pakai titik dua di seluruh sistem) */
export const jam = (d) => fmtJam.format(keTanggal(d)).replace('.', ':')

/** "16 Sep 2026 • 14:30" */
export const tanggalJam = (d) => `${tanggal(d)} • ${jam(d)}`

/** "Rab" */
export const hariPendek = (d) => fmtHari.format(keTanggal(d))

/** "Rabu" */
export const hariPanjang = (d) => fmtHariPanjang.format(keTanggal(d))

/** "September 2026" */
export const bulanTahun = (d) => fmtBulan.format(keTanggal(d))

/* ------------------------- Bantu rentang tanggal ------------------------ */

/** Kunci tanggal lokal "YYYY-MM-DD" (bukan UTC, agar tidak bergeser hari) */
export function kunciTanggal(d) {
  const t = keTanggal(d)
  const bln = String(t.getMonth() + 1).padStart(2, '0')
  const tgl = String(t.getDate()).padStart(2, '0')
  return `${t.getFullYear()}-${bln}-${tgl}`
}

export function dariKunci(kunci) {
  const [th, bl, tg] = String(kunci).split('-').map(Number)
  return new Date(th, (bl || 1) - 1, tg || 1)
}

export function awalHari(d = new Date()) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0)
}

export function akhirHari(d = new Date()) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999)
}

export function tambahHari(d, n) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + n)
}

export function tambahBulan(d, n) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth() + n, 1)
}

export function awalBulan(d = new Date()) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth(), 1)
}

export function akhirBulan(d = new Date()) {
  const t = keTanggal(d)
  return new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Selisih hari kalender (b - a) */
export function selisihHari(a, b) {
  return Math.round((awalHari(b) - awalHari(a)) / 86400000)
}

/** Label rentang: "1 – 16 Sep 2026" atau "Hari ini, 16 Sep 2026" */
export function labelRentang(dari, sampai) {
  const a = awalHari(dari)
  const b = awalHari(sampai)
  if (+a === +b) {
    const hariIni = +a === +awalHari(new Date())
    return `${hariIni ? 'Hari ini, ' : ''}${tanggalPanjang(a)}`
  }
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${tanggal(b)}`
  }
  return `${tanggal(a)} – ${tanggal(b)}`
}

/* ------------------------------ Terbilang ------------------------------- */

const SATUAN = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
]

function terbilangAngka(n) {
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${terbilangAngka(n - 10)} belas`
  if (n < 100)
    return `${terbilangAngka(Math.floor(n / 10))} puluh ${terbilangAngka(n % 10)}`
  if (n < 200) return `seratus ${terbilangAngka(n - 100)}`
  if (n < 1000)
    return `${terbilangAngka(Math.floor(n / 100))} ratus ${terbilangAngka(n % 100)}`
  if (n < 2000) return `seribu ${terbilangAngka(n - 1000)}`
  if (n < 1e6)
    return `${terbilangAngka(Math.floor(n / 1000))} ribu ${terbilangAngka(n % 1000)}`
  if (n < 1e9)
    return `${terbilangAngka(Math.floor(n / 1e6))} juta ${terbilangAngka(n % 1e6)}`
  if (n < 1e12)
    return `${terbilangAngka(Math.floor(n / 1e9))} miliar ${terbilangAngka(n % 1e9)}`
  return `${terbilangAngka(Math.floor(n / 1e12))} triliun ${terbilangAngka(n % 1e12)}`
}

/** 125000 -> "seratus dua puluh lima ribu rupiah" */
export function terbilang(n) {
  const v = Math.floor(Math.abs(Number(n) || 0))
  if (v === 0) return 'nol rupiah'
  const kata = terbilangAngka(v).replace(/\s+/g, ' ').trim()
  return `${Number(n) < 0 ? 'minus ' : ''}${kata} rupiah`
}

/* ------------------------------ Lain-lain ------------------------------- */

/** Inisial untuk avatar: "Budi Santoso" -> "BS" */
export function inisial(nama) {
  return String(nama || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
}

/** Ukuran relatif waktu: "3 menit lalu" */
export function waktuRelatif(d) {
  const detik = Math.floor((Date.now() - keTanggal(d).getTime()) / 1000)
  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  const hari = Math.floor(detik / 86400)
  if (hari === 1) return 'kemarin'
  if (hari < 30) return `${hari} hari lalu`
  return tanggal(d)
}
