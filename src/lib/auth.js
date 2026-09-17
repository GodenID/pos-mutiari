/* =========================================================================
   Otentikasi lokal — kata sandi tidak pernah disimpan mentah, yang
   disimpan pasangan { salt, hash } dengan SHA-256("salt:password").
   crypto.subtle butuh konteks aman; bila tidak tersedia (mis. file://),
   dipakai hash cadangan cyrb53 agar login tetap berfungsi offline.
   ========================================================================= */

function keHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function cadangan(teks) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < teks.length; i += 1) {
    const ch = teks.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `c53:${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

export async function hashSandi(sandi, salt) {
  const bahan = `${salt}:${sandi}`
  try {
    if (crypto?.subtle) {
      const dicerna = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(bahan),
      )
      return keHex(dicerna)
    }
  } catch {
    /* jatuh ke cadangan */
  }
  return cadangan(bahan)
}

export function buatSalt(awalan = 'mg') {
  const acak = Math.random().toString(36).slice(2, 8)
  return `${awalan}-${Date.now().toString(36)}-${acak}`
}

export async function cocokSandi(pengguna, sandi) {
  if (!pengguna || pengguna.aktif === false) return false
  const hash = await hashSandi(sandi || '', pengguna.salt || '')
  return hash === pengguna.hash
}

export const labelPeran = (peran) => (peran === 'admin' ? 'Admin' : 'Kasir')
