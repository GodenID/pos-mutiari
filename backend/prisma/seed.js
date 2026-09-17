import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const KATEGORI = ['Minuman', 'Makanan Instan', 'Sembako', 'Snack & Biskuit', 'Perawatan Diri', 'Rumah Tangga', 'Alat Tulis', 'Lain-lain']

const SATUAN = ['pcs', 'pack', 'botol', 'kaleng', 'sachet', 'kg', 'liter', 'renteng', 'dus']

async function main() {
  for (const nama of KATEGORI) {
    await db.category.upsert({ where: { nama }, update: {}, create: { nama } })
  }

  for (const nama of SATUAN) {
    await db.unit.upsert({ where: { nama }, update: {}, create: { nama } })
  }

  const adminHash = await bcrypt.hash('admin123', 10)
  const kasirHash = await bcrypt.hash('kasir123', 10)

  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { nama: 'Admin', username: 'admin', peran: 'admin', passwordHash: adminHash, aktif: true },
  })
  await db.user.upsert({
    where: { username: 'kasir' },
    update: {},
    create: { nama: 'Kasir', username: 'kasir', peran: 'kasir', passwordHash: kasirHash, aktif: true },
  })

  await db.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      data: {
        namaToko: 'Mutiari Garden',
        alamat: 'Jl. Damai 1 No.51-52, Jatiasih, Bekasi',
        telepon: '0857-7009-4079',
        pajakAktif: false,
        pajakPersen: 11,
        footerStruk: 'Terima kasih telah berbelanja. Barang yang sudah dibeli tidak dapat ditukar.',
        tampilkanTerbilang: true,
        lebarStruk: '58mm',
        bunyiPindai: true,
        cetakOtomatis: false,
      },
    },
  })

  console.log('Seed OK: admin/admin123, kasir/kasir123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
