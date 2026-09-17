/* Ekspor CSV yang ramah Excel Indonesia:
   - pemisah titik koma (;) karena koma dipakai sebagai desimal
   - BOM UTF-8 agar huruf beraksen tidak rusak
   - angka desimal memakai koma                                            */

function selKe(v) {
  if (v == null) return ''
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : String(v).replace('.', ',')
  }
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {string} namaFile  tanpa ekstensi
 * @param {string[]} kolom   judul kolom
 * @param {Array<Array>} baris
 * @param {string[]} [meta]  baris keterangan di atas tabel (opsional)
 */
export function unduhCsv(namaFile, kolom, baris, meta = []) {
  const garis = []
  garis.push('sep=;')
  meta.forEach((m) => garis.push(selKe(m)))
  if (meta.length) garis.push('')
  garis.push(kolom.map(selKe).join(';'))
  baris.forEach((b) => garis.push(b.map(selKe).join(';')))

  const isi = '\uFEFF' + garis.join('\r\n')
  const blob = new Blob([isi], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${namaFile}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Stempel waktu untuk nama file: "2026-09-16_1432" */
export function stempelFile(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(
    d.getHours(),
  )}${p(d.getMinutes())}`
}
