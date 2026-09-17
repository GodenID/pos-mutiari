/* =========================================================================
   Ekspor XLSX yang rapi (ExcelJS, dimuat malas hanya saat diklik).

   Tanda tangan sama persis dengan unduhCsv:
     unduhXls(namaFile, kolom[], baris[][], meta[])
   Hasil: judul besar + subjudul, header hijau tebal, garis tepi,
   baris belang, lebar kolom otomatis, freeze + filter, siap cetak.
   ========================================================================= */

const HIJAU = 'FF0F7A4F'
const ABU = 'FFF2F4F3'
const GARIS = 'FFD6D3D1'

const tepi = {
  top: { style: 'thin', color: { argb: GARIS } },
  left: { style: 'thin', color: { argb: GARIS } },
  bottom: { style: 'thin', color: { argb: GARIS } },
  right: { style: 'thin', color: { argb: GARIS } },
}

export async function unduhXls(namaFile, kolom = [], baris = [], meta = []) {
  const { default: ExcelJS } = await import('exceljs')
  const buku = new ExcelJS.Workbook()
  buku.creator = 'Mutiari Garden POS'
  buku.created = new Date()

  const nKolom = Math.max(kolom.length, 1)
  const sheet = buku.addWorksheet('Data', { properties: { defaultRowHeight: 18 } })

  let r = 1
  if (meta.length) {
    sheet.mergeCells(r, 1, r, nKolom)
    const judul = sheet.getCell(r, 1)
    judul.value = String(meta[0])
    judul.font = { size: 14, bold: true, color: { argb: HIJAU } }
    judul.alignment = { vertical: 'middle' }
    sheet.getRow(r).height = 26
    r += 1
    for (const sub of meta.slice(1)) {
      sheet.mergeCells(r, 1, r, nKolom)
      const c = sheet.getCell(r, 1)
      c.value = String(sub)
      c.font = { size: 10, italic: true, color: { argb: 'FF6B7280' } }
      r += 1
    }
    r += 1
  }

  const barisHeader = r
  kolom.forEach((judulKolom, i) => {
    const c = sheet.getCell(r, i + 1)
    c.value = judulKolom
    c.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HIJAU } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = tepi
  })
  sheet.getRow(r).height = 22
  r += 1

  baris.forEach((isi, idx) => {
    isi.forEach((nilai, i) => {
      const c = sheet.getCell(r, i + 1)
      c.value = nilai ?? ''
      c.border = tepi
      c.alignment = { vertical: 'middle' }
      if (typeof nilai === 'number') c.numFmt = '#,##0'
      if (idx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ABU } }
      }
    })
    r += 1
  })

  // Lebar kolom mengikuti isi (12–50)
  kolom.forEach((judulKolom, i) => {
    let maks = String(judulKolom ?? '').length
    for (const isi of baris) {
      const v = isi[i]
      const panjang = v === null || v === undefined ? 0 : String(v).length
      if (panjang > maks) maks = panjang
    }
    sheet.getColumn(i + 1).width = Math.min(50, Math.max(12, maks + 3))
  })

  sheet.views = [{ state: 'frozen', ySplit: Math.max(barisHeader - 1, 0) }]
  if (kolom.length && baris.length) {
    sheet.autoFilter = {
      from: { row: barisHeader, column: 1 },
      to: { row: barisHeader, column: kolom.length },
    }
  }
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }

  const buffer = await buku.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${namaFile}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
