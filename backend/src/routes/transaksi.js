import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { akhirHari, awalHari, nomorInvoice } from '../lib/angka.js'

const app = new Hono()
app.use('*', authRequired)

const itemSchema = z.object({
  produkId: z.string().min(1),
  qty: z.coerce.number().min(1),
  harga: z.coerce.number().min(0).optional(),
  diskon: z.coerce.number().min(0).default(0),
})

const bayarSchema = z.object({
  metode: z.string().min(1),
  jumlah: z.coerce.number().min(1),
})

const simpanSchema = z.object({
  item: z.array(itemSchema).min(1),
  diskonNota: z.coerce.number().min(0).default(0),
  diskon: z.coerce.number().min(0).default(0),
  pajakPersen: z.coerce.number().min(0).default(0),
  pembayaran: z.array(bayarSchema).default([]),
  metode: z.string().default('tunai'),
  bayar: z.coerce.number().min(0).default(0),
  pelanggan: z.string().default(''),
  pelangganId: z.string().default(''),
  catatan: z.string().default(''),
})

app.get('/', async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')
  const metode = c.req.query('metode')
  const q = (c.req.query('q') || '').trim()
  const limit = Math.min(Number(c.req.query('limit') || 200), 5000)

  const where = {
    ...(dari || sampai
      ? {
          tanggal: {
            ...(dari ? { gte: awalHari(new Date(dari)) } : {}),
            ...(sampai ? { lte: akhirHari(new Date(sampai)) } : {}),
          },
        }
      : {}),
    ...(status ? { status } : {}),
    ...(metode ? { metode } : {}),
    ...(q ? { nomor: { contains: q, mode: 'insensitive' } } : {}),
  }
  const data = await db.sale.findMany({
    where,
    include: { item: true, pembayaran: true },
    orderBy: { tanggal: 'desc' },
    take: limit,
  })
  return c.json({ transaksi: data })
})

app.get('/:id', async (c) => {
  const data = await db.sale.findUnique({
    where: { id: c.req.param('id') },
    include: { item: true, pembayaran: true },
  })
  if (!data) return c.json({ error: 'Transaksi tidak ditemukan' }, 404)
  return c.json({ transaksi: data })
})

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = simpanSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Keranjang tidak valid' }, 400)
  }
  const d = parsed.data
  const user = c.get('user')

  const ids = [...new Set(d.item.map((i) => i.produkId))]
  const produkList = await db.product.findMany({ where: { id: { in: ids } } })
  const peta = new Map(produkList.map((p) => [p.id, p]))
  for (const it of d.item) {
    const p = peta.get(it.produkId)
    if (!p) return c.json({ error: `Produk tidak ditemukan` }, 404)
    if (p.aktif === false) return c.json({ error: `${p.nama} sudah nonaktif` }, 409)
    if (p.stok < it.qty) return c.json({ error: `Stok ${p.nama} kurang (sisa ${p.stok})` }, 409)
  }

  const item = d.item.map((it) => {
    const p = peta.get(it.produkId)
    const harga = it.harga !== undefined ? Math.round(it.harga) : p.hargaJual
    const diskonBaris = Math.max(0, Math.min(Math.round(it.diskon || 0), harga * it.qty))
    return {
      produkId: p.id,
      sku: p.sku,
      nama: p.nama,
      satuan: p.satuan,
      harga,
      hargaBeli: p.hargaBeli,
      qty: Math.round(it.qty),
      diskon: diskonBaris,
      subtotal: harga * Math.round(it.qty) - diskonBaris,
    }
  })

  const subtotal = item.reduce((a, b) => a + b.subtotal, 0)
  const diskonItem = item.reduce((a, b) => a + (b.diskon || 0), 0)
  const diskonNota = Math.min(Math.max(0, Math.round(d.diskonNota ?? d.diskon ?? 0)), subtotal)
  const dasarPajak = subtotal - diskonNota
  const pajakPersen = Number(d.pajakPersen) || 0
  const pajak = Math.round((dasarPajak * pajakPersen) / 100)
  const total = dasarPajak + pajak

  let pembayaran = (d.pembayaran || [])
    .map((p) => ({ metode: p.metode, jumlah: Math.round(p.jumlah) }))
    .filter((p) => p.jumlah > 0)
  if (!pembayaran.length) {
    pembayaran = [{ metode: d.metode || 'tunai', jumlah: Math.round(d.bayar) || total }]
  }
  const bayar = pembayaran.reduce((a, p) => a + p.jumlah, 0)
  if (bayar < total) return c.json({ error: `Bayar kurang Rp ${total - bayar}` }, 400)
  const utama = [...pembayaran].sort((a, b) => b.jumlah - a.jumlah)[0]

  let pelangganId = (d.pelangganId || '').trim()
  let namaPelanggan = (d.pelanggan || '').trim()
  if (pelangganId) {
    const ada = await db.customer.findUnique({ where: { id: pelangganId } })
    if (ada) namaPelanggan = ada.nama
    else pelangganId = ''
  }

  const sekarang = new Date()
  const hitungHariIni = await db.sale.count({
    where: { tanggal: { gte: awalHari(sekarang), lte: akhirHari(sekarang) } },
  })

  const buatSatu = (urut) =>
    db.$transaction(async (tx) => {
      if (!pelangganId && namaPelanggan) {
        const cocok = await tx.customer.findFirst({
          where: { nama: { equals: namaPelanggan, mode: 'insensitive' } },
        })
        if (cocok) {
          pelangganId = cocok.id
          namaPelanggan = cocok.nama
        } else {
          const baru = await tx.customer.create({
            data: { nama: namaPelanggan, telepon: '', alamat: '', catatan: 'Dibentuk otomatis dari kasir' },
          })
          pelangganId = baru.id
        }
      }

      const nomor = nomorInvoice(sekarang, urut)
      const kasir = user?.nama || 'Kasir'
      const sale = await tx.sale.create({
        data: {
          nomor,
          tanggal: sekarang,
          kasir,
          pelanggan: namaPelanggan,
          pelangganId,
          subtotal,
          diskonItem,
          diskon: diskonNota,
          pajakPersen,
          pajak,
          total,
          metode: utama.metode,
          bayar,
          kembalian: Math.max(0, bayar - total),
          status: 'selesai',
          catatan: (d.catatan || '').trim(),
          item: { create: item },
          pembayaran: { create: pembayaran },
        },
        include: { item: true, pembayaran: true },
      })

      for (const it of item) {
        const upd = await tx.product.updateMany({
          where: { id: it.produkId, stok: { gte: it.qty } },
          data: { stok: { decrement: it.qty } },
        })
        if (upd.count === 0) throw new Error(`Stok ${it.nama} habis saat menyimpan`)
        await tx.stockMutation.create({
          data: {
            produkId: it.produkId,
            nama: it.nama,
            tipe: 'penjualan',
            qty: -it.qty,
            keterangan: 'Penjualan kasir',
            ref: nomor,
            petugas: kasir,
          },
        })
      }
      return sale
    })

  try {
    const transaksi = await buatSatu(hitungHariIni + 1)
    return c.json({ transaksi }, 201)
  } catch (e) {
    if (String(e?.code) === 'P2002') {
      const transaksi = await buatSatu(hitungHariIni + 1 + Math.floor(Math.random() * 50) + 1)
      return c.json({ transaksi }, 201)
    }
    if (String(e?.message || '').startsWith('Stok ')) {
      return c.json({ error: e.message }, 409)
    }
    throw e
  }
})

app.post('/:id/void', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const alasan = String(body.alasan || '').trim()
  const user = c.get('user')

  const trx = await db.sale.findUnique({ where: { id }, include: { item: true } })
  if (!trx) return c.json({ error: 'Transaksi tidak ditemukan' }, 404)
  if (trx.status === 'void') return c.json({ error: 'Sudah dibatalkan' }, 409)

  const waktu = new Date()
  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { status: 'void', alasanVoid: alasan, waktuVoid: waktu },
    })
    for (const it of trx.item) {
      await tx.product.update({ where: { id: it.produkId }, data: { stok: { increment: it.qty } } }).catch(() => null)
      await tx.stockMutation.create({
        data: {
          produkId: it.produkId,
          nama: it.nama,
          tipe: 'retur',
          qty: it.qty,
          keterangan: `Pembatalan ${trx.nomor}${alasan ? ` — ${alasan}` : ''}`,
          ref: trx.nomor,
          petugas: user?.nama || 'Kasir',
        },
      })
    }
  })
  return c.json({ ok: true })
})

export default app
