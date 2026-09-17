import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'

import authRoute from './routes/auth.js'
import produkRoute from './routes/produk.js'
import kategoriRoute from './routes/kategori.js'
import satuanRoute from './routes/satuan.js'
import pelangganRoute from './routes/pelanggan.js'
import supplierRoute from './routes/supplier.js'
import transaksiRoute from './routes/transaksi.js'
import pembelianRoute from './routes/pembelian.js'
import mutasiRoute from './routes/mutasi.js'
import penggunaRoute from './routes/pengguna.js'
import pengaturanRoute from './routes/pengaturan.js'
import ringkasanRoute from './routes/ringkasan.js'
import uploadRoute from './routes/upload.js'
import adminRoute from './routes/admin.js'

const app = new Hono()

app.use('*', logger())

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  '*',
  cors({
    origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

app.get('/', (c) => c.json({ ok: true, nama: 'mutiari-pos-api', waktu: new Date().toISOString() }))
app.get('/health', (c) => c.json({ ok: true }))

app.route('/api/auth', authRoute)
app.route('/api/produk', produkRoute)
app.route('/api/kategori', kategoriRoute)
app.route('/api/satuan', satuanRoute)
app.route('/api/pelanggan', pelangganRoute)
app.route('/api/supplier', supplierRoute)
app.route('/api/transaksi', transaksiRoute)
app.route('/api/pembelian', pembelianRoute)
app.route('/api/mutasi', mutasiRoute)
app.route('/api/pengguna', penggunaRoute)
app.route('/api/pengaturan', pengaturanRoute)
app.route('/api/ringkasan', ringkasanRoute)
app.route('/api/upload', uploadRoute)
app.route('/api/admin', adminRoute)

app.notFound((c) => c.json({ error: 'Tidak ditemukan' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Kesalahan server' }, 500)
})

const port = Number(process.env.PORT || 3000)
serve({ fetch: app.fetch, port }, () => {
  console.log(`API jalan di :${port}`)
})
