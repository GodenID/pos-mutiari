import { Hono } from 'hono'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'

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
  integrasi: { accurate: {}, jurnal: {} },
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

export default app
