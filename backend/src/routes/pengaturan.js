import { Hono } from 'hono'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'
import { daftarPenerimaNotif, kirimEmailResend, susunEmailTransaksi } from '../lib/email.js'

const app = new Hono()

const bawaan = {
  namaToko: 'Mutiari Garden',
  alamat: '',
  telepon: '',
  npwp: '',
  kasir: 'Admin',
  pajakAktif: false,
  pajakPersen: 11,
  footerStruk: 'Terima kasih telah berbelanja.',
  tampilkanTerbilang: true,
  lebarStruk: '58mm',
  bunyiPindai: true,
  cetakOtomatis: false,
  stokAktif: true,
  integrasi: { accurate: {}, jurnal: {} },
  emailNotifAktif: true,
  emailNotif1: '',
  emailNotif2: '',
}

app.get('/', authRequired, async (c) => {
  const row = await db.setting.findUnique({ where: { id: 1 } })
  return c.json({ pengaturan: { ...bawaan, ...(row?.data || {}) } })
})

app.put('/', authRequired, adminOnly, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const lama = await db.setting.findUnique({ where: { id: 1 } })
  const gabung = { ...((lama?.data) || {}), ...body }
  const row = await db.setting.upsert({
    where: { id: 1 },
    update: { data: gabung },
    create: { id: 1, data: gabung },
  })
  return c.json({ pengaturan: { ...bawaan, ...row.data } })
})

/* Tes kirim email notifikasi (admin saja) — memakai template profesional + data contoh */
app.post('/test-email', authRequired, adminOnly, async (c) => {
  const row = await db.setting.findUnique({ where: { id: 1 } })
  const pengaturan = { ...bawaan, ...(row?.data || {}) }
  const to = daftarPenerimaNotif(pengaturan)
  if (!to.length) return c.json({ error: 'Isi dulu 2 email penerima di Pengaturan' }, 400)
  try {
    const contoh = {
      nomor: 'INV-20261010-0001',
      tanggal: new Date(),
      kasir: pengaturan.kasir || 'Admin',
      pelanggan: 'Pelanggan Umum',
      metode: 'qris',
      pembayaran: [{ metode: 'qris', jumlah: 85000 }],
      subtotal: 80000,
      diskonItem: 0,
      diskon: 5000,
      pajakPersen: 11,
      pajak: 8250,
      total: 83250,
      bayar: 85000,
      kembalian: 1750,
      catatan: 'Contoh tampilan email — transaksi asli akan memakai data kasir.',
      item: [
        { nama: 'Indomie Goreng', sku: '8998866101011', satuan: 'pcs', qty: 5, harga: 3500, subtotal: 17500 },
        { nama: 'Aqua Botol 600ml', sku: '8991002101010', satuan: 'botol', qty: 4, harga: 4000, subtotal: 16000 },
        { nama: 'Beras Pandan Wangi 5kg', sku: '8996006200015', satuan: 'pack', qty: 1, harga: 46500, subtotal: 46500 },
      ],
    }
    const { subject, text, html } = susunEmailTransaksi(contoh, pengaturan)
    const hasil = await kirimEmailResend({ to, subject: `[TES] ${subject}`, text, html })
    return c.json({ ok: true, ke: to, id: hasil?.id })
  } catch (e) {
    return c.json({ error: e?.message || 'Gagal kirim email tes' }, 500)
  }
})

export default app
