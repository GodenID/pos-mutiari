import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'ganti-di-coolify-min-32-karakter'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h'

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain), String(hash))
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, peran: user.peran, nama: user.nama },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  )
}

export function authRequired(c, next) {
  const header = c.req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return c.json({ error: 'Butuh login' }, 401)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    c.set('user', payload)
    return next()
  } catch {
    return c.json({ error: 'Token tidak valid' }, 401)
  }
}

export function adminOnly(c, next) {
  const user = c.get('user')
  if (user?.peran !== 'admin') return c.json({ error: 'Khusus admin' }, 403)
  return next()
}
