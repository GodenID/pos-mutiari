import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim()
  const data = await db.customer.findMany({
    where: q ? { nama: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { nama: 'asc' },
    take: 1000,
  })
  return c.json({ pelanggan: data })
})

const schema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  telepon: z.string().default(''),
  alamat: z.string().default(''),
  catatan: z.string().default(''),
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const p = schema.safeParse(body)
  if (!p.success) return c.json({ error: p.error.issues[0]?.message || 'Data tidak valid' }, 400)
  const pelanggan = await db.customer.create({
    data: {
      nama: p.data.nama.trim(),
      telepon: String(p.data.telepon || '').trim(),
      alamat: String(p.data.alamat || '').trim(),
      catatan: String(p.data.catatan || '').trim(),
    },
  })
  return c.json({ pelanggan }, 201)
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const p = schema.partial().safeParse(body)
  if (!p.success) return c.json({ error: 'Data tidak valid' }, 400)
  const pelanggan = await db.customer.update({ where: { id }, data: p.data }).catch(() => null)
  if (!pelanggan) return c.json({ error: 'Pelanggan tidak ditemukan' }, 404)
  return c.json({ pelanggan })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.customer.delete({ where: { id } }).catch(() => null)
  return c.json({ ok: true })
})

export default app
