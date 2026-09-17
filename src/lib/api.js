/* Klien API backend (mode server).
   Base URL diisi dari env Pages: VITE_API_URL=https://api.prasastigroup.id */

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
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opsi,
      headers: {
        'Content-Type': 'application/json',
        ...(ambilToken() ? { Authorization: `Bearer ${ambilToken()}` } : {}),
        ...(opsi.headers || {}),
      },
    })
  } catch {
    throw new Error('Tidak tersambung ke server — periksa koneksi internet')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    simpanToken('')
    throw new Error('Sesi berakhir — silakan masuk ulang')
  }
  if (!res.ok) throw new Error(data.error || `Server galat (${res.status})`)
  return data
}

const get = (path) => req(path)
const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body || {}) })
const put = (path, body) => req(path, { method: 'PUT', body: JSON.stringify(body || {}) })
const patch = (path, body) => req(path, { method: 'PATCH', body: JSON.stringify(body || {}) })
const del = (path, body) => req(path, { method: 'DELETE', body: JSON.stringify(body || {}) })

export const api = {
  // Auth
  masuk: (username, sandi) => post('/api/auth/masuk', { username, sandi }),
  saya: () => get('/api/auth/saya'),

  // Master
  daftarProduk: () => get('/api/produk'),
  tambahProduk: (d) => post('/api/produk', d),
  ubahProduk: (id, d) => put(`/api/produk/${id}`, d),
  setAktifProduk: (id, aktif) => patch(`/api/produk/${id}/aktif`, { aktif }),
  hapusProduk: (id) => del(`/api/produk/${id}`),

  daftarKategori: () => get('/api/kategori'),
  tambahKategori: (nama) => post('/api/kategori', { nama }),
  ubahKategori: (id, nama) => put(`/api/kategori/${id}`, { nama }),
  hapusKategori: (id) => del(`/api/kategori/${id}`),

  daftarSatuan: () => get('/api/satuan'),
  tambahSatuan: (nama) => post('/api/satuan', { nama }),
  ubahSatuan: (id, nama) => put(`/api/satuan/${id}`, { nama }),
  hapusSatuan: (id) => del(`/api/satuan/${id}`),

  daftarPelanggan: () => get('/api/pelanggan'),
  tambahPelanggan: (d) => post('/api/pelanggan', d),
  ubahPelanggan: (id, d) => put(`/api/pelanggan/${id}`, d),
  hapusPelanggan: (id) => del(`/api/pelanggan/${id}`),

  daftarSupplier: () => get('/api/supplier'),
  tambahSupplier: (d) => post('/api/supplier', d),
  ubahSupplier: (id, d) => put(`/api/supplier/${id}`, d),
  hapusSupplier: (id) => del(`/api/supplier/${id}`),

  // Transaksi & stok
  daftarTransaksi: () => get('/api/transaksi?limit=5000'),
  simpanTransaksi: (d) => post('/api/transaksi', d),
  voidTransaksi: (id, alasan = '') => post(`/api/transaksi/${id}/void`, { alasan }),

  daftarPembelian: () => get('/api/pembelian?limit=500'),
  simpanPembelian: (d) => post('/api/pembelian', d),

  daftarMutasi: () => get('/api/mutasi?limit=1000'),
  mutasiStok: (d) => post('/api/mutasi', d),
  opnameStok: (perubahan, keterangan) => post('/api/mutasi/opname', { perubahan, keterangan }),

  // Pengguna & pengaturan
  daftarPengguna: () => get('/api/pengguna'),
  tambahPengguna: (d) => post('/api/pengguna', d),
  ubahPengguna: (id, d) => put(`/api/pengguna/${id}`, d),
  aturSandiPengguna: (id, sandi) => post(`/api/pengguna/${id}/sandi`, { sandi }),
  setAktifPengguna: (id, aktif) => patch(`/api/pengguna/${id}/aktif`, { aktif }),
  hapusPengguna: (id) => del(`/api/pengguna/${id}`),

  ambilPengaturan: () => get('/api/pengaturan'),
  simpanPengaturan: (d) => put('/api/pengaturan', d),

  // Admin
  muatDemo: () => post('/api/admin/demo', {}),
  kosongkanData: () => post('/api/admin/reset', {}),

  // Foto produk (S3)
  presignUnggah: (namaFile, tipe, ukuran) => post('/api/upload/presign', { namaFile, tipe, ukuran }),
  hapusFoto: (key) => del('/api/upload', { key }),
  unggahKeS3: async (uploadUrl, file) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!res.ok) throw new Error('Upload foto ke penyimpanan gagal')
  },

  // Integrasi akuntansi
  statusIntegrasi: () => get('/api/integrasi'),
  simpanIntegrasi: (provider, d) => put(`/api/integrasi/${provider}`, d),
  authorizeAccurate: () => get('/api/integrasi/accurate/authorize'),
  dbAccurate: () => get('/api/integrasi/accurate/db'),
  bukaDbAccurate: (dbId) => post('/api/integrasi/accurate/buka-db', { dbId }),
  ujiIntegrasi: (provider) => post(`/api/integrasi/${provider}/uji`, {}),
  putusIntegrasi: (provider) => del(`/api/integrasi/${provider}`),
  kirimAccurate: (saleId) => post(`/api/integrasi/accurate/kirim/${saleId}`, {}),
}

export const API_BASE = BASE
