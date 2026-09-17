const p2 = (n) => String(n).padStart(2, '0')

function tanggalStr(tgl) {
  const d = tgl instanceof Date ? tgl : new Date(tgl)
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
}

export const nomorInvoice = (tgl, urut) =>
  `INV-${tanggalStr(tgl)}-${String(urut).padStart(4, '0')}`

export const nomorPO = (tgl, urut) =>
  `PO-${tanggalStr(tgl)}-${String(urut).padStart(4, '0')}`

export function awalHari(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function akhirHari(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
