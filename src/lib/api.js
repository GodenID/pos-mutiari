/* Klien API backend — dipakai menggantikan src/lib/storage.js tahap berikutnya.
   Base URL diisi dari env Pages: VITE_API_URL=https://api.domainlu.com */

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
const KUNCI_TOKEN = 'kasirku.v1.token'

export function ambilToken() {
  try {
    return localStorage.getItem(KUNCI_TOKEN) || ''
  } catch {
    return ''
  }
}

export function simpanToken(token) {
  try {
    if (token) localStorage.setItem(KUNCI_TOKEN, token)
    else localStorage.removeItem(KUNCI_TOKEN)
  } catch {
    /* abaikan */
  }
}

async function req(path, opsi = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(ambilToken() ? { Authorization: `Bearer ${ambilToken()}` } : {}),
      ...(opsi.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  masuk: (username, sandi) => req('/api/auth/masuk', { method: 'POST', body: JSON.stringify({ username, sandi }) }),
  daftarProduk: (q = '') => req(`/api/produk${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  simpanTransaksi: (payload) => req('/api/transaksi', { method: 'POST', body: JSON.stringify(payload) }),
  voidTransaksi: (id, alasan = '') => req(`/api/transaksi/${id}/void`, { method: 'POST', body: JSON.stringify({ alasan }) }),
  daftarTransaksi: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/api/transaksi${qs ? `?${qs}` : ''}`)
  },
  ringkasan: (dari, sampai) => req(`/api/ringkasan?dari=${dari}&sampai=${sampai}`),
}

export const API_BASE = BASE
