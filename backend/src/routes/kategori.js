import { Hono } from 'hono'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const data = await db.category.findMany({ orderBy: { nama: 'asc' } })
  return c.json({ kategori: data })
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const nama = String(body.nama || '').trim()
  if (!nama) return c.json({ error: 'Nama wajib diisi' }, 400)
  const kat = await db.category.upsert({
    where: { nama },
    update: {},
    create: { nama },
  })
  return c.json({ kategori: kat }, 201)
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const nama = String(body.nama || '').trim()
  if (!nama) return c.json({ error: 'Nama wajib diisi' }, 400)
  const lama = await db.category.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Kategori tidak ditemukan' }, 404)
  if (lama.nama === nama) return c.json({ kategori: lama })
  const kat = await db.$transaction(async (tx) => {
    const baru = await tx.category.create({ data: { nama } }).catch(() =>
      tx.category.findUnique({ where: { nama } }),
    )
    await tx.product.updateMany({ where: { kategori: lama.nama }, data: { kategori: nama } })
    await tx.category.delete({ where: { id } }).catch(() => null)
    return baru
  })
  return c.json({ kategori: kat })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const lama = await db.category.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Kategori tidak ditemukan' }, 404)
  await db.$transaction(async (tx) => {
    await tx.product.updateMany({ where: { kategori: lama.nama }, data: { kategori: 'Lain-lain' } })
    await tx.category.delete({ where: { id } })
    await tx.category.upsert({ where: { nama: 'Lain-lain' }, update: {}, create: { nama: 'Lain-lain' } })
  })
  return c.json({ ok: true })
})

export default app
