/* Fitur toko yang bisa dimatikan lewat Pengaturan.
   sumber = db atau tx Prisma (keduanya punya .setting.findUnique). */

export async function bacaPengaturan(sumber) {
  try {
    const row = await sumber.setting.findUnique({ where: { id: 1 } })
    return row?.data || {}
  } catch {
    return {}
  }
}

/** true bila pelacakan stok aktif (default aktif agar toko lama tidak berubah). */
export async function stokAktif(sumber) {
  const p = await bacaPengaturan(sumber)
  return p.stokAktif !== false
}
