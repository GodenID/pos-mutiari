import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim()
  const data = await db.supplier.findMany({
    where: q ? { nama: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { nama: 'asc' },
    take: 1000,
  })
  return c.json({ supplier: data })
})

const schema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  telepon: z.string().default(''),
  alamat: z.string().default(''),
  catatan: z.string().default(''),
})

app.post('/', adminOnly, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const p = schema.safeParse(body)
  if (!p.success) return c.json({ error: 'Nama wajib diisi' }, 400)
  const supplier = await db.supplier.create({ data: p.data })
  return c.json({ supplier }, 201)
})

app.put('/:id', adminOnly, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const supplier = await db.supplier.update({ where: { id }, data: body }).catch(() => null)
  if (!supplier) return c.json({ error: 'Supplier tidak ditemukan' }, 404)
  return c.json({ supplier })
})

app.delete('/:id', adminOnly, async (c) => {
  await db.supplier.delete({ where: { id: c.req.param('id') } }).catch(() => null)
  return c.json({ ok: true })
})

export default app
