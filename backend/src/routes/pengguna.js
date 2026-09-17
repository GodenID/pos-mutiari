import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { adminOnly, authRequired, hashPassword } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

const publik = (u) => ({ id: u.id, nama: u.nama, username: u.username, peran: u.peran, aktif: u.aktif, dibuatPada: u.dibuatPada })

app.get('/', async (c) => {
  const data = await db.user.findMany({ orderBy: { nama: 'asc' } })
  return c.json({ pengguna: data.map(publik) })
})

const tambahSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(1, 'Username wajib diisi'),
  peran: z.enum(['admin', 'kasir']).default('kasir'),
  sandi: z.string().min(6, 'Kata sandi minimal 6 karakter'),
})

app.post('/', adminOnly, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const p = tambahSchema.safeParse(body)
  if (!p.success) return c.json({ error: p.error.issues[0]?.message || 'Data tidak valid' }, 400)
  const username = String(p.data.username).trim().toLowerCase().replace(/\s+/g, '')
  if (!username) return c.json({ error: 'Username wajib diisi' }, 400)
  const bentrok = await db.user.findUnique({ where: { username } })
  if (bentrok) return c.json({ error: 'Username sudah dipakai' }, 409)
  const pengguna = await db.user.create({
    data: {
      nama: p.data.nama.trim(),
      username,
      peran: p.data.peran,
      passwordHash: await hashPassword(p.data.sandi),
      aktif: true,
    },
  })
  return c.json({ pengguna: publik(pengguna) }, 201)
})

app.put('/:id', adminOnly, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const lama = await db.user.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Pengguna tidak ditemukan' }, 404)
  const nama = String(body.nama ?? lama.nama).trim()
  const peran = body.peran === 'admin' ? 'admin' : body.peran === 'kasir' ? 'kasir' : lama.peran
  if (!nama) return c.json({ error: 'Nama wajib diisi' }, 400)
  if (lama.peran === 'admin' && peran !== 'admin') {
    const adminLain = await db.user.findFirst({ where: { id: { not: id }, peran: 'admin', aktif: true } })
    if (!adminLain) return c.json({ error: 'Minimal harus ada 1 admin aktif' }, 409)
  }
  const pengguna = await db.user.update({ where: { id }, data: { nama, peran } })
  return c.json({ pengguna: publik(pengguna) })
})

app.post('/:id/sandi', adminOnly, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (String(body.sandi || '').length < 6) return c.json({ error: 'Kata sandi minimal 6 karakter' }, 400)
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(body.sandi) } }).catch(() => null)
  return c.json({ ok: true })
})

app.patch('/:id/aktif', adminOnly, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return c.json({ error: 'Pengguna tidak ditemukan' }, 404)
  if (!body.aktif && target.peran === 'admin') {
    const adminLain = await db.user.findFirst({ where: { id: { not: id }, peran: 'admin', aktif: true } })
    if (!adminLain) return c.json({ error: 'Minimal harus ada 1 admin aktif' }, 409)
  }
  const pengguna = await db.user.update({ where: { id }, data: { aktif: !!body.aktif } })
  return c.json({ pengguna: publik(pengguna) })
})

app.delete('/:id', adminOnly, async (c) => {
  const id = c.req.param('id')
  const me = c.get('user')
  if (id === me?.sub) return c.json({ error: 'Tidak bisa menghapus akun sendiri' }, 400)
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return c.json({ error: 'Pengguna tidak ditemukan' }, 404)
  if (target.peran === 'admin') {
    const adminLain = await db.user.findFirst({ where: { id: { not: id }, peran: 'admin', aktif: true } })
    if (!adminLain) return c.json({ error: 'Minimal harus ada 1 admin aktif' }, 409)
  }
  await db.user.delete({ where: { id } })
  return c.json({ ok: true })
})

export default app
