/* =========================================================================
   Bunyi pendek operasional kasir via Web Audio API — tanpa berkas suara.
   'sukses': blip tinggi (pindai berhasil). 'galat': nada rendah (gagal).
   Diam total bila peramban tak mendukung audio atau dimatikan di pengaturan.
   ========================================================================= */

let konteks = null

function ambilKonteks() {
  try {
    if (typeof window === 'undefined') return null
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!konteks) konteks = new AC()
    if (konteks.state === 'suspended') konteks.resume().catch(() => {})
    return konteks
  } catch {
    return null
  }
}

const NADA = {
  sukses: { frekuensi: 880, durasi: 0.07, tipe: 'sine', volume: 0.12 },
  galat: { frekuensi: 220, durasi: 0.14, tipe: 'square', volume: 0.06 },
}

/** @param {'sukses'|'galat'} jenis @param {boolean} aktif sakelar pengaturan */
export function bunyikan(jenis = 'sukses', aktif = true) {
  if (!aktif) return
  const ac = ambilKonteks()
  const nada = NADA[jenis]
  if (!ac || !nada) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = nada.tipe
    osc.frequency.value = nada.frekuensi
    gain.gain.value = nada.volume
    osc.connect(gain)
    gain.connect(ac.destination)
    const mulai = ac.currentTime
    osc.start(mulai)
    osc.stop(mulai + nada.durasi)
  } catch {
    /* audio gagal — kasir tetap jalan tanpa bunyi */
  }
}
