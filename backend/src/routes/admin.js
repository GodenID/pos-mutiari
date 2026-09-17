import { Hono } from 'hono'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'
import { KATEGORI_DEMO, PELANGGAN_DEMO, PRODUK_DEMO, SATUAN_DEMO, SUPPLIER_DEMO } from '../../prisma/demoData.js'

const app = new Hono()
app.use('*', authRequired, adminOnly)

async function bersih(tx) {
  await tx.saleItem.deleteMany()
  await tx.payment.deleteMany()
  await tx.sale.deleteMany()
  await tx.purchaseItem.deleteMany()
  await tx.purchase.deleteMany()
  await tx.stockMutation.deleteMany()
  await tx.product.deleteMany()
  await tx.customer.deleteMany()
  await tx.supplier.deleteMany()
  await tx.category.deleteMany()
  await tx.unit.deleteMany()
}

async function tanamDasar(tx) {
  for (const nama of KATEGORI_DEMO) {
    await tx.category.upsert({ where: { nama }, update: {}, create: { nama } })
  }
  for (const nama of SATUAN_DEMO) {
    await tx.unit.upsert({ where: { nama }, update: {}, create: { nama } })
  }
  for (const s of SUPPLIER_DEMO) {
    await tx.supplier.create({ data: { ...s } })
  }
}

/** Kosongkan toko (pengguna + pengaturan dipertahankan) */
app.post('/reset', async (c) => {
  await db.$transaction(async (tx) => {
    await bersih(tx)
    await tanamDasar(tx)
  })
  return c.json({ ok: true })
})

/** Muat data master demo (tanpa riwayat transaksi palsu) */
app.post('/demo', async (c) => {
  const user = c.get('user')
  const petugas = user?.nama || 'Admin'
  const sekarang = new Date()
  await db.$transaction(async (tx) => {
    await bersih(tx)
    await tanamDasar(tx)
    for (const p of PELANGGAN_DEMO) {
      await tx.customer.create({ data: { ...p, catatan: '' } })
    }
    for (const [sku, nama, kategori, satuan, beli, jual, stok, stokMin] of PRODUK_DEMO) {
      const produk = await tx.product.create({
        data: {
          sku, nama, kategori, satuan,
          hargaBeli: beli, hargaJual: jual,
          stok, stokMin, aktif: true,
        },
      })
      if (stok > 0) {
        await tx.stockMutation.create({
          data: {
            produkId: produk.id, nama, tipe: 'masuk', qty: stok,
            keterangan: 'Stok awal data demo', ref: 'AWAL', petugas,
          },
        })
      }
    }
    void sekarang
  })
  const jumlah = await db.product.count()
  return c.json({ ok: true, produk: jumlah })
})

export default app
