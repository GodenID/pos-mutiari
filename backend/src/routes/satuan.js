import { Hono } from 'hono'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const data = await db.unit.findMany({ orderBy: { nama: 'asc' } })
  return c.json({ satuan: data })
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const nama = String(body.nama || '').trim()
  if (!nama) return c.json({ error: 'Nama satuan wajib diisi' }, 400)
  if (nama.length > 24) return c.json({ error: 'Nama satuan maksimal 24 karakter' }, 400)
  const unit = await db.unit.upsert({ where: { nama }, update: {}, create: { nama } })
  const baru = await db.unit.findUnique({ where: { nama } })
  return c.json({ satuan: baru || unit }, 201)
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const nama = String(body.nama || '').trim()
  if (!nama) return c.json({ error: 'Nama satuan wajib diisi' }, 400)
  const lama = await db.unit.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Satuan tidak ditemukan' }, 404)
  if (lama.nama === nama) return c.json({ satuan: lama })
  const bentrok = await db.unit.findUnique({ where: { nama } })
  if (bentrok) return c.json({ error: 'Nama satuan sudah dipakai' }, 409)
  const unit = await db.$transaction(async (tx) => {
    const baru = await tx.unit.create({ data: { nama } })
    await tx.product.updateMany({ where: { satuan: lama.nama }, data: { satuan: nama } })
    await tx.unit.delete({ where: { id } }).catch(() => null)
    return baru
  })
  return c.json({ satuan: unit })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const lama = await db.unit.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Satuan tidak ditemukan' }, 404)
  const dipakai = await db.product.count({ where: { satuan: lama.nama } })
  if (dipakai > 0) {
    return c.json({ error: `"${lama.nama}" dipakai ${dipakai} produk — pindahkan dulu ke satuan lain` }, 409)
  }
  await db.unit.delete({ where: { id } }).catch(() => null)
  return c.json({ ok: true })
})

export default app
