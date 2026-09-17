import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { signToken, verifyPassword } from '../auth.js'

const app = new Hono()

const loginSchema = z.object({
  username: z.string().min(1),
  sandi: z.string().min(1),
})

app.post('/masuk', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Username dan sandi wajib diisi' }, 400)

  const username = parsed.data.username.trim().toLowerCase()
  const user = await db.user.findUnique({ where: { username } })
  if (!user || user.aktif === false) {
    return c.json({ error: 'Username tidak ditemukan' }, 401)
  }
  const cocok = await verifyPassword(parsed.data.sandi, user.passwordHash)
  if (!cocok) return c.json({ error: 'Kata sandi salah' }, 401)

  const token = signToken(user)
  return c.json({
    token,
    pengguna: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      peran: user.peran,
    },
  })
})

app.get('/saya', async (c) => {
  const header = c.req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return c.json({ pengguna: null })
  const { default: jwt } = await import('jsonwebtoken')
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'ganti-di-coolify-min-32-karakter')
    const user = await db.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.aktif) return c.json({ pengguna: null })
    return c.json({
      pengguna: { id: user.id, nama: user.nama, username: user.username, peran: user.peran },
    })
  } catch {
    return c.json({ pengguna: null })
  }
})

export default app
