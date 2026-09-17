import { Hono } from 'hono'
import { z } from 'zod'
import { authRequired } from '../auth.js'
import { hapusObjek, presignUnggah, s3Aktif } from '../lib/s3.js'

const app = new Hono()
app.use('*', authRequired)

const EKSTENSI = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAKS_BYTE = 2 * 1024 * 1024

const presignSchema = z.object({
  namaFile: z.string().min(1).max(128),
  tipe: z.string().min(1),
  ukuran: z.coerce.number().min(1).max(MAKS_BYTE),
})

function acak(n = 10) {
  const huruf = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < n; i += 1) s += huruf[Math.floor(Math.random() * huruf.length)]
  return s
}

/** Minta URL upload langsung ke S3 (file tidak lewat VPS) */
app.post('/presign', async (c) => {
  if (!s3Aktif()) {
    return c.json({ error: 'Penyimpanan foto belum dikonfigurasi di server (S3)' }, 503)
  }
  const body = await c.req.json().catch(() => ({}))
  const parsed = presignSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Berkas tidak valid (maks 2 MB, JPG/PNG/WebP)' }, 400)
  }
  const { tipe } = parsed.data
  const ekstensi = EKSTENSI[tipe]
  if (!ekstensi) return c.json({ error: 'Format harus JPG, PNG, atau WebP' }, 400)

  const key = `produk/${Date.now().toString(36)}-${acak()}.${ekstensi}`
  try {
    const hasil = await presignUnggah(key, tipe)
    return c.json(hasil, 201)
  } catch {
    return c.json({ error: 'Gagal membuat URL upload S3' }, 502)
  }
})

/** Hapus objek foto (hanya prefix produk/) */
app.delete('/', async (c) => {
  if (!s3Aktif()) return c.json({ error: 'S3 belum dikonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const key = String(body.key || '')
  if (!key.startsWith('produk/')) return c.json({ error: 'Key tidak valid' }, 400)
  await hapusObjek(key)
  return c.json({ ok: true })
})

export default app
