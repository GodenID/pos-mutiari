/* Nama kasir/petugas operasional.
   Urutan: kiriman body > Pengaturan toko (nama kasir aktif) > nama login.
   Nama di Pengaturan yang dipegang user — login tidak boleh menimpanya. */

export async function namaKasirOperasional(sumber, user, kasirBody = '') {
  const dariBody = String(kasirBody || '').trim().slice(0, 64)
  if (dariBody) return dariBody
  try {
    const row = await sumber.setting.findUnique({ where: { id: 1 } })
    const dariSetting = String(row?.data?.kasir || '').trim().slice(0, 64)
    if (dariSetting) return dariSetting
  } catch {
    /* abaikan, pakai nama login */
  }
  return user?.nama || 'Kasir'
}
