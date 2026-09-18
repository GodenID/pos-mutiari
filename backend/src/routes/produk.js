import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'
import { hapusObjek } from '../lib/s3.js'
import { namaKasirOperasional } from '../lib/kasir.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim()
  const kategori = (c.req.query('kategori') || '').trim()
  const aktif = c.req.query('aktif')
  const where = {
    ...(q
      ? { OR: [{ nama: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] }
      : {}),
    ...(kategori ? { kategori } : {}),
    ...(aktif === 'true' ? { aktif: true } : aktif === 'false' ? { aktif: false } : {}),
  }
  const BATAS = 5000
  const [total, data] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy: { nama: 'asc' }, take: BATAS }),
  ])
  return c.json({ produk: data, total, terpotong: total > data.length })
})

const produkSchema = z.object({
  sku: z.string().max(64).optional().default(''),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kategori: z.string().min(1).default('Lain-lain'),
  satuan: z.string().default('pcs'),
  hargaBeli: z.coerce.number().min(0).default(0),
  hargaJual: z.coerce.number().min(0).default(0),
  stok: z.coerce.number().min(0).default(0),
  stokMin: z.coerce.number().min(0).default(0),
  aktif: z.boolean().default(true),
  gambarUrl: z.string().max(512).default(''),
  gambarKey: z.string().max(256).default(''),
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = produkSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Data tidak valid' }, 400)
  }
  const d = parsed.data
  const user = c.get('user')
  const sku = d.sku.trim() || `LOK${Date.now().toString().slice(-9)}`

  try {
    const produk = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          sku,
          nama: d.nama.trim(),
          kategori: d.kategori.trim() || 'Lain-lain',
          satuan: d.satuan || 'pcs',
          hargaBeli: Math.round(d.hargaBeli),
          hargaJual: Math.round(d.hargaJual),
          stok: Math.round(d.stok),
          stokMin: Math.round(d.stokMin),
          aktif: d.aktif,
          gambarUrl: d.gambarUrl || '',
          gambarKey: d.gambarKey || '',
        },
      })
      await tx.unit.upsert({
        where: { nama: p.satuan },
        update: {},
        create: { nama: p.satuan },
      }).catch(() => null)
      if (p.stok > 0) {
        await tx.stockMutation.create({
          data: {
            produkId: p.id,
            nama: p.nama,
            tipe: 'masuk',
            qty: p.stok,
            keterangan: 'Stok awal produk baru',
            ref: 'AWAL',
            petugas: await namaKasirOperasional(tx, user),
          },
        })
      }
      await tx.category.upsert({
        where: { nama: p.kategori },
        update: {},
        create: { nama: p.kategori },
      })
      return p
    })
    return c.json({ produk }, 201)
  } catch (e) {
    if (String(e?.code) === 'P2002') return c.json({ error: 'SKU sudah dipakai' }, 409)
    throw e
  }
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const parsed = produkSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: 'Data tidak valid' }, 400)
  const lama = await db.product.findUnique({ where: { id } })
  if (!lama) return c.json({ error: 'Produk tidak ditemukan' }, 404)
  const user = c.get('user')
  const d = parsed.data

  const stokBaru = d.stok !== undefined ? Math.round(Number(d.stok)) : lama.stok
  const berubah = stokBaru !== lama.stok

  // SKU kembar dicek manual agar pesannya ramah (bukan 500 generik)
  if (d.sku !== undefined) {
    const skuBaru = String(d.sku).trim() || lama.sku
    if (skuBaru !== lama.sku) {
      const bentrok = await db.product.findUnique({ where: { sku: skuBaru } })
      if (bentrok) return c.json({ error: `Barcode sudah dipakai produk "${bentrok.nama}"` }, 409)
    }
  }

  const produk = await db.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id },
      data: {
        ...(d.sku !== undefined ? { sku: String(d.sku).trim() || lama.sku } : {}),
        ...(d.nama !== undefined ? { nama: String(d.nama).trim() } : {}),
        ...(d.kategori !== undefined ? { kategori: String(d.kategori).trim() || lama.kategori } : {}),
        ...(d.satuan !== undefined ? { satuan: d.satuan } : {}),
        ...(d.hargaBeli !== undefined ? { hargaBeli: Math.round(Number(d.hargaBeli) || 0) } : {}),
        ...(d.hargaJual !== undefined ? { hargaJual: Math.round(Number(d.hargaJual) || 0) } : {}),
        ...(d.stok !== undefined ? { stok: stokBaru } : {}),
        ...(d.stokMin !== undefined ? { stokMin: Math.round(Number(d.stokMin) || 0) } : {}),
        ...(d.aktif !== undefined ? { aktif: !!d.aktif } : {}),
        ...(d.gambarUrl !== undefined ? { gambarUrl: String(d.gambarUrl || '') } : {}),
        ...(d.gambarKey !== undefined ? { gambarKey: String(d.gambarKey || '') } : {}),
      },
    })
    if (d.gambarKey !== undefined && lama.gambarKey && lama.gambarKey !== d.gambarKey) {
      await hapusObjek(lama.gambarKey)
    }
    if (berubah) {
      await tx.stockMutation.create({
        data: {
          produkId: id,
          nama: p.nama,
          tipe: 'penyesuaian',
          qty: stokBaru - lama.stok,
          keterangan: `Koreksi dari form produk (${lama.stok} → ${stokBaru})`,
          ref: 'EDIT',
          petugas: await namaKasirOperasional(tx, user),
        },
      })
    }
    return p
  })
  return c.json({ produk })
})

app.patch('/:id/aktif', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const produk = await db.product.update({
    where: { id },
    data: { aktif: !!body.aktif },
  }).catch(() => null)
  if (!produk) return c.json({ error: 'Produk tidak ditemukan' }, 404)
  return c.json({ produk })
})

app.delete('/:id', adminOnly, async (c) => {
  const id = c.req.param('id')
  const adaTransaksi = await db.saleItem.findFirst({ where: { produkId: id } })
  if (adaTransaksi) {
    return c.json({ error: 'Produk sudah ada di riwayat, nonaktifkan saja' }, 409)
  }
  const lama = await db.product.findUnique({ where: { id } })
  await db.product.delete({ where: { id } }).catch(() => null)
  if (lama?.gambarKey) await hapusObjek(lama.gambarKey)
  return c.json({ ok: true })
})

export default app
