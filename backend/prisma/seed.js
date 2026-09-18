import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Hanya akun admin — tanpa data contoh. Login lalu ganti sandinya.
  const adminHash = await bcrypt.hash('admin123', 10)

  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { nama: 'Admin', username: 'admin', peran: 'admin', passwordHash: adminHash, aktif: true },
  })

  console.log('Seed OK: admin/admin123 — segera ganti sandinya di Pengaturan → Pengguna')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
