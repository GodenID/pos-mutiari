import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'
import { akhirHari, awalHari, nomorPO } from '../lib/angka.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 200), 500)
  const [total, data] = await Promise.all([
    db.purchase.count(),
    db.purchase.findMany({
      include: { item: true },
      orderBy: { tanggal: 'desc' },
      take: limit,
    }),
  ])
  return c.json({ pembelian: data, total, terpotong: total > data.length })
})

const schema = z.object({
  supplierId: z.string().default(''),
  item: z
    .array(
      z.object({
        produkId: z.string().min(1),
        qty: z.coerce.number().min(1),
        hargaBeli: z.coerce.number().min(0),
      }),
    )
    .min(1),
  keterangan: z.string().default(''),
})

app.post('/', adminOnly, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Item pembelian tidak valid' }, 400)
  const user = c.get('user')

  const ids = [...new Set(parsed.data.item.map((i) => i.produkId))]
  const produkList = await db.product.findMany({ where: { id: { in: ids } } })
  const peta = new Map(produkList.map((p) => [p.id, p]))
  const itemBersih = []
  for (const it of parsed.data.item) {
    const p = peta.get(it.produkId)
    if (!p) return c.json({ error: 'Produk tidak ditemukan' }, 404)
    const qty = Math.round(it.qty)
    const hargaBeli = Math.round(it.hargaBeli)
    if (qty <= 0) continue
    itemBersih.push({
      produkId: p.id, sku: p.sku, nama: p.nama, satuan: p.satuan, qty, hargaBeli, subtotal: qty * hargaBeli,
    })
  }
  if (!itemBersih.length) return c.json({ error: 'Item kosong' }, 400)

  const sup = parsed.data.supplierId
    ? await db.supplier.findUnique({ where: { id: parsed.data.supplierId } })
    : null
  const sekarang = new Date()
  const hitung = await db.purchase.count({
    where: { tanggal: { gte: awalHari(sekarang), lte: akhirHari(sekarang) } },
  })
  const nomor = nomorPO(sekarang, hitung + 1)
  const total = itemBersih.reduce((a, b) => a + b.subtotal, 0)
  const petugas = user?.nama || 'Kasir'

  const pembelian = await db.$transaction(async (tx) => {
    const po = await tx.purchase.create({
      data: {
        nomor,
        tanggal: sekarang,
        supplierId: sup?.id || '',
        supplierNama: sup?.nama || 'Supplier umum',
        total,
        keterangan: (parsed.data.keterangan || '').trim(),
        petugas,
        item: { create: itemBersih },
      },
      include: { item: true },
    })
    for (const it of itemBersih) {
      const lama = peta.get(it.produkId)
      const stokLama = Math.max(0, lama.stok || 0)
      const stokBaru = stokLama + it.qty
      const rata = stokBaru > 0 ? Math.round(((lama.hargaBeli || 0) * stokLama + it.qty * it.hargaBeli) / stokBaru) : it.hargaBeli
      await tx.product.update({
        where: { id: it.produkId },
        data: { stok: { increment: it.qty }, hargaBeli: rata },
      })
      await tx.stockMutation.create({
        data: {
          produkId: it.produkId,
          nama: it.nama,
          tipe: 'masuk',
          qty: it.qty,
          keterangan: `Pembelian ${nomor} — ${po.supplierNama} @${it.hargaBeli}`,
          ref: nomor,
          petugas,
        },
      })
    }
    return po
  })

  return c.json({ pembelian }, 201)
})

export default app
