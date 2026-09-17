/* =========================================================================
   Unduh dokumen PO sebagai PDF (A4) — kop toko, rincian supplier,
   tabel barang, total + terbilang, dan kolom tanda tangan.
   ========================================================================= */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { angka, tanggalJam, terbilang } from './format.js'

const HIJAU = [15, 122, 79]
const TINTA = [16, 22, 26]
const ABU = [107, 119, 114]
const GARIS = [226, 231, 227]

/**
 * @param {object} po pesanan pembelian { nomor, tanggal, supplierNama, item, total, keterangan, petugas }
 * @param {object} pengaturan identitas toko
 * @param {object|null} supplier master supplier (telepon/alamat, opsional)
 * @returns {string} nama file yang diunduh
 */
export function unduhPoPdf(po, pengaturan = {}, supplier = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const LEBAR = 210
  const KIRI = 14
  const KANAN = LEBAR - 14
  let y = 15

  /* ------------------------------- Kop ---------------------------------- */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...TINTA)
  doc.text(pengaturan.namaToko || 'Toko', KIRI, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...ABU)
  const barisKop = [
    pengaturan.alamat || '',
    pengaturan.telepon ? `Telp. ${pengaturan.telepon}` : '',
  ]
    .filter(Boolean)
    .join('  •  ')
  doc.splitTextToSize(barisKop, 120).slice(0, 2).forEach((b, i) => {
    doc.text(b, KIRI, y + 5 + i * 4)
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...HIJAU)
  doc.text('PESANAN PEMBELIAN', KANAN, y, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(...TINTA)
  doc.text(po.nomor, KANAN, y + 5.5, { align: 'right' })

  y += 14
  doc.setDrawColor(...HIJAU)
  doc.setLineWidth(0.9)
  doc.line(KIRI, y, KANAN, y)
  y += 7

  /* --------------------------- Meta & supplier --------------------------- */
  const meta = [
    ['Tanggal', tanggalJam(po.tanggal)],
    ['Supplier', po.supplierNama || '-'],
  ]
  if (supplier?.telepon) meta.push(['Telepon supplier', supplier.telepon])
  if (supplier?.alamat) meta.push(['Alamat supplier', supplier.alamat])
  meta.push(['Petugas', po.petugas || '-'])

  doc.setFontSize(9)
  meta.forEach(([kunci, nilai]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...ABU)
    doc.text(kunci, KIRI, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    const barisNilai = doc.splitTextToSize(String(nilai), 118)
    doc.text(barisNilai, 52, y)
    y += Math.max(1, barisNilai.length) * 4.6
  })
  y += 3

  /* ------------------------------ Tabel ---------------------------------- */
  autoTable(doc, {
    startY: y,
    margin: { left: KIRI, right: KIRI },
    theme: 'grid',
    head: [['No', 'Produk', 'Qty', 'Harga Beli', 'Subtotal']],
    body: po.item.map((it, i) => [
      String(i + 1),
      `${it.nama}\n${it.sku}`,
      `${angka(it.qty)} ${it.satuan}`,
      `Rp ${angka(it.hargaBeli)}`,
      `Rp ${angka(it.subtotal)}`,
    ]),
    foot: [
      [
        {
          content: `TOTAL  (${po.item.length} jenis • ${angka(po.item.reduce((a, b) => a + b.qty, 0))} unit)`,
          colSpan: 4,
          styles: { halign: 'right' },
        },
        { content: `Rp ${angka(po.total)}`, styles: { halign: 'right' } },
      ],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: TINTA,
      lineColor: GARIS,
      lineWidth: 0.25,
      cellPadding: 2.4,
      valign: 'middle',
    },
    headStyles: {
      fillColor: HIJAU,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 248, 244],
      textColor: TINTA,
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 33 },
      4: { halign: 'right', cellWidth: 36 },
    },
  })

  y = doc.lastAutoTable.finalY + 7

  /* --------------------- Terbilang & keterangan --------------------------- */
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...ABU)
  const kalimat = `Terbilang: ${terbilang(po.total)}`
  doc.splitTextToSize(kalimat, KANAN - KIRI).forEach((b) => {
    doc.text(b, KIRI, y)
    y += 4.4
  })
  y += 1

  if (po.keterangan) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TINTA)
    doc.splitTextToSize(`Keterangan: ${po.keterangan}`, KANAN - KIRI).forEach((b) => {
      doc.text(b, KIRI, y)
      y += 4.4
    })
    y += 2
  }

  /* --------------------------- Tanda tangan ------------------------------ */
  if (y > 232) {
    doc.addPage()
    y = 20
  } else {
    y += 8
  }
  const tengah = [55, 155]
  const pihak = ['Dibuat oleh,', 'Supplier,']
  const nama = [po.petugas || '-', po.supplierNama || '-']
  doc.setFontSize(9)
  tengah.forEach((x, i) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TINTA)
    doc.text(pihak[i], x, y, { align: 'center' })
    doc.text('( ........................................ )', x, y + 24, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.text(String(nama[i]).slice(0, 28), x, y + 29, { align: 'center' })
  })

  /* ------------------------------- Kaki ---------------------------------- */
  const totalHalaman = doc.getNumberOfPages()
  for (let i = 1; i <= totalHalaman; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...ABU)
    doc.text(`Dicetak ${tanggalJam(new Date())} • Mutiari Garden POS`, KIRI, 290)
    doc.text(`Hal. ${i}/${totalHalaman}`, KANAN, 290, { align: 'right' })
  }

  const namaFile = `${po.nomor}.pdf`
  doc.save(namaFile)
  return namaFile
}
