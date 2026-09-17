import { Hono } from 'hono'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { akhirHari, awalHari } from '../lib/angka.js'

const app = new Hono()
app.use('*', authRequired)

app.get('/', async (c) => {
  const dariQ = c.req.query('dari')
  const sampaiQ = c.req.query('sampai')
  const dari = dariQ ? awalHari(new Date(dariQ)) : awalHari(new Date())
  const sampai = sampaiQ ? akhirHari(new Date(sampaiQ)) : akhirHari(new Date())

  const penjualan = await db.sale.findMany({
    where: { tanggal: { gte: dari, lte: sampai } },
    include: { item: true },
    take: 5000,
    orderBy: { tanggal: 'desc' },
  })
  const selesai = penjualan.filter((t) => t.status !== 'void')
  const omzet = selesai.reduce((a, t) => a + t.total, 0)
  const hpp = selesai.reduce((a, t) => a + t.item.reduce((x, it) => x + (it.hargaBeli || 0) * it.qty, 0), 0)
  const itemTerjual = selesai.reduce((a, t) => a + t.item.reduce((x, it) => x + it.qty, 0), 0)

  const produk = await db.product.findMany({ take: 5000 })
  const kritis = produk.filter((p) => p.aktif && p.stok <= 0).length
  const menipis = produk.filter((p) => p.aktif && p.stok > 0 && p.stokMin > 0 && p.stok <= p.stokMin).length

  return c.json({
    ringkasan: {
      omzet,
      hpp,
      labaKotor: omzet - hpp,
      jumlahTransaksi: selesai.length,
      dibatalkan: penjualan.length - selesai.length,
      itemTerjual,
      skuAktif: produk.filter((p) => p.aktif).length,
      stokHabis: kritis,
      stokMenipis: menipis,
    },
    terakhir: penjualan.slice(0, 10),
  })
})

export default app
