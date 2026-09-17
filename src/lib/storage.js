/* Penyimpanan lokal peramban (frontend-only, tanpa server) */

const AWALAN = 'kasirku.v1.'

export function muat(kunci, bawaan) {
  try {
    const mentah = localStorage.getItem(AWALAN + kunci)
    if (mentah == null) return bawaan
    const nilai = JSON.parse(mentah)
    return nilai == null ? bawaan : nilai
  } catch {
    return bawaan
  }
}

export function simpan(kunci, nilai) {
  try {
    localStorage.setItem(AWALAN + kunci, JSON.stringify(nilai))
    return true
  } catch {
    // Kuota penuh atau mode privat — data tetap hidup di memori sesi ini
    return false
  }
}

export function hapus(kunci) {
  try {
    localStorage.removeItem(AWALAN + kunci)
  } catch {
    /* diabaikan */
  }
}

export function kosongkanSemua() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(AWALAN))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* diabaikan */
  }
}

/** ID pendek unik-cukup untuk data lokal */
export function buatId(awalan = 'id') {
  return `${awalan}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`
}
