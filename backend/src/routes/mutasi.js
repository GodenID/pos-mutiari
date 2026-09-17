import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const produkId = c.req.query('produkId')
  const limit = Math.min(Number(c.req.query('limit') || 200), 5000)
  const where = produkId ? { produkId } : {}
  const [total, data] = await Promise.all([
    db.stockMutation.count({ where }),
    db.stockMutation.findMany({ where, orderBy: { tanggal: 'desc' }, take: limit }),
  ])
  return c.json({ mutasi: data, total, terpotong: total > data.length })
})

const schema = z.object({
  produkId: z.string().min(1),
  tipe: z.enum(['masuk', 'keluar', 'setel']),
  qty: z.coerce.number().min(0),
  keterangan: z.string().default(''),
  ref: z.string().default(''),
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Data mutasi tidak valid' }, 400)
  const user = c.get('user')
  const p = await db.product.findUnique({ where: { id: parsed.data.produkId } })
  if (!p) return c.json({ error: 'Produk tidak ditemukan' }, 404)

  const jumlah = Math.abs(Number(parsed.data.qty) || 0)
  let stokBaru = p.stok
  let delta = 0
  let tipeMutasi = parsed.data.tipe
  if (parsed.data.tipe === 'masuk') {
    stokBaru = p.stok + jumlah
    delta = jumlah
  } else if (parsed.data.tipe === 'keluar') {
    stokBaru = Math.max(0, p.stok - jumlah)
    delta = stokBaru - p.stok
  } else {
    stokBaru = Math.round(jumlah)
    delta = stokBaru - p.stok
    tipeMutasi = 'penyesuaian'
  }
  if (delta === 0 && parsed.data.tipe !== 'setel') return c.json({ error: 'Tidak ada perubahan' }, 400)

  const [produk] = await db.$transaction([
    db.product.update({ where: { id: p.id }, data: { stok: stokBaru } }),
    db.stockMutation.create({
      data: {
        produkId: p.id,
        nama: p.nama,
        tipe: tipeMutasi,
        qty: delta,
        keterangan: parsed.data.keterangan || '',
        ref: parsed.data.ref || '',
        petugas: user?.nama || 'Kasir',
      },
    }),
  ])
  return c.json({ produk, delta }, 201)
})

const opnameSchema = z.object({
  perubahan: z.array(z.object({ produkId: z.string(), stokBaru: z.coerce.number().min(0) })).min(1),
  keterangan: z.string().default('Stok opname'),
})

app.post('/opname', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = opnameSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Data opname tidak valid' }, 400)
  const user = c.get('user')
  let count = 0
  await db.$transaction(async (tx) => {
    for (const row of parsed.data.perubahan) {
      const p = await tx.product.findUnique({ where: { id: row.produkId } })
      if (!p) continue
      const baru = Math.round(row.stokBaru)
      const delta = baru - p.stok
      if (delta === 0) continue
      await tx.product.update({ where: { id: p.id }, data: { stok: baru } })
      await tx.stockMutation.create({
        data: {
          produkId: p.id,
          nama: p.nama,
          tipe: 'penyesuaian',
          qty: delta,
          keterangan: `${parsed.data.keterangan} (${p.stok} → ${baru})`,
          ref: 'OPNAME',
          petugas: user?.nama || 'Kasir',
        },
      })
      count += 1
    }
  })
  return c.json({ ok: true, diubah: count })
})

export default app
