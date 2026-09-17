/* =========================================================================
   Penyimpan status aplikasi — MODE SERVER (API backend + Postgres).

   Semua data (produk, kategori, satuan, transaksi, mutasi, pelanggan,
   supplier, pembelian, pengguna, pengaturan) diambil dari backend lewat
   src/lib/api.js. Token JWT tersimpan di localStorage, sesi pulih otomatis
   saat aplikasi dibuka ulang.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from 'react'

import Icon from '../components/Icon.jsx'
import { AksiKonteks, SesiKonteks, StatusKonteks, ToastKonteks } from './konteks.js'
import { ambilToken, api, simpanToken } from '../lib/api.js'
import { PENGATURAN_AWAL } from '../data/seed.js'

function statusKosong() {
  return {
    produk: [],
    kategori: [],
    satuan: [],
    transaksi: [],
    mutasi: [],
    pelanggan: [],
    supplier: [],
    pembelian: [],
    pengguna: [],
    pengaturan: { ...PENGATURAN_AWAL },
    meta: metaKosong(),
    integrasi: {
      accurate: statusIntegrasiKosong('accurate'),
      jurnal: statusIntegrasiKosong('jurnal'),
    },
  }
}

function metaKosong() {
  return {
    produk: { total: 0, terpotong: false },
    transaksi: { total: 0, terpotong: false },
    mutasi: { total: 0, terpotong: false },
    pembelian: { total: 0, terpotong: false },
  }
}

function statusIntegrasiKosong(provider) {
  return {
    provider,
    dikonfigurasi: false,
    clientIdTampil: '',
    terhubung: false,
    status: 'belum',
    redirectUri: '',
    dbId: '',
    dbAlias: '',
    perusahaan: '',
    sandbox: false,
    lastCheck: null,
    lastError: '',
  }
}

let hitungToast = 0
const idToast = () => `tst_${Date.now().toString(36)}_${(hitungToast += 1)}`

/* ------------------------------- Provider ------------------------------- */

const KUNCI_SUMBER = [
  'produk',
  'kategori',
  'satuan',
  'transaksi',
  'mutasi',
  'pelanggan',
  'supplier',
  'pembelian',
  'pengguna',
  'pengaturan',
  'integrasi',
]

export function AppStoreProvider({ children }) {
  const [status, setStatus] = useState(statusKosong)
  const [sesiPengguna, setSesiPengguna] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [galatKonek, setGalatKonek] = useState('')

  /* ------------------------------ Toast ------------------------------ */
  const [toasts, setToasts] = useState([])

  const tutupToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useMemo(() => {
    const dorong = (jenis) => (pesan, durasi = 3200) => {
      const id = idToast()
      setToasts((t) => [...t.slice(-3), { id, jenis, pesan }])
      if (durasi) setTimeout(() => tutupToast(id), durasi)
      return id
    }
    return {
      sukses: dorong('sukses'),
      galat: dorong('galat'),
      info: dorong('info'),
      tutup: tutupToast,
    }
  }, [tutupToast])

  /* --------------------------- Muat dari server --------------------------- */

  const muatSemua = useCallback(async () => {
    const hasil = await Promise.allSettled([
      api.daftarProduk(),
      api.daftarKategori(),
      api.daftarSatuan(),
      api.daftarTransaksi(),
      api.daftarMutasi(),
      api.daftarPelanggan(),
      api.daftarSupplier(),
      api.daftarPembelian(),
      api.daftarPengguna(),
      api.ambilPengaturan(),
      api.statusIntegrasi(),
    ])
    const patch = {}
    const metaPatch = {}
    const gagal = []
    hasil.forEach((h, i) => {
      const k = KUNCI_SUMBER[i]
      if (h.status === 'fulfilled') {
        const v = h.value?.[k]
        patch[k] =
          v ??
          (k === 'pengaturan'
            ? { ...PENGATURAN_AWAL }
            : k === 'integrasi'
              ? {
                  accurate: statusIntegrasiKosong('accurate'),
                  jurnal: statusIntegrasiKosong('jurnal'),
                }
              : [])
        if (k === 'produk' || k === 'transaksi' || k === 'mutasi' || k === 'pembelian') {
          metaPatch[k] = {
            total: Number(h.value?.total ?? (Array.isArray(v) ? v.length : 0)),
            terpotong: !!h.value?.terpotong,
          }
        }
      } else {
        gagal.push(`${k}: ${h.reason?.message || 'gagal'}`)
      }
    })
    setStatus((s) => ({ ...s, ...patch, meta: { ...s.meta, ...metaPatch } }))
    if (gagal.some((g) => g.includes('Sesi berakhir'))) {
      simpanToken('')
      setSesiPengguna(null)
      setGalatKonek('')
      return
    }
    setGalatKonek(gagal.length ? `Sebagian data gagal dimuat — ${gagal.join('; ')}` : '')
  }, [])

  const segarkanStok = useCallback(async () => {
    const [produk, mutasi] = await Promise.all([api.daftarProduk(), api.daftarMutasi()])
    setStatus((s) => ({
      ...s,
      produk: produk.produk || [],
      mutasi: mutasi.mutasi || [],
      meta: {
        ...s.meta,
        produk: { total: Number(produk.total ?? 0), terpotong: !!produk.terpotong },
        mutasi: { total: Number(mutasi.total ?? 0), terpotong: !!mutasi.terpotong },
      },
    }))
  }, [])

  const muatIntegrasi = useCallback(async () => {
    const { integrasi } = await api.statusIntegrasi()
    setStatus((s) => ({ ...s, integrasi }))
    return integrasi
  }, [])

  const segarkanMaster = useCallback(async () => {    const [kategori, satuan, produk] = await Promise.all([
      api.daftarKategori(),
      api.daftarSatuan(),
      api.daftarProduk(),
    ])
    setStatus((s) => ({
      ...s,
      kategori: kategori.kategori || [],
      satuan: satuan.satuan || [],
      produk: produk.produk || [],
      meta: {
        ...s.meta,
        produk: { total: Number(produk.total ?? 0), terpotong: !!produk.terpotong },
      },
    }))
  }, [])

  /* Pulihkan sesi saat aplikasi dibuka */
  useEffect(() => {
    let batal = false
    ;(async () => {
      if (!ambilToken()) {
        setMemuat(false)
        return
      }
      try {
        const { pengguna } = await api.saya()
        if (batal) return
        if (pengguna) {
          setSesiPengguna(pengguna)
          await muatSemua()
        } else {
          simpanToken('')
        }
      } catch (e) {
        if (!batal) {
          if (String(e?.message || '').includes('Sesi berakhir')) simpanToken('')
          else setGalatKonek(e?.message || 'Gagal tersambung ke server')
        }
      } finally {
        if (!batal) setMemuat(false)
      }
    })()
    return () => {
      batal = true
    }
  }, [muatSemua])

  /* ------------------------------- Aksi ------------------------------- */
  const aksi = useMemo(() => {
    const depan = (kunci, obj) =>
      setStatus((s) => ({ ...s, [kunci]: [obj, ...s[kunci]] }))
    const ganti = (kunci, obj) =>
      setStatus((s) => ({ ...s, [kunci]: s[kunci].map((x) => (x.id === obj.id ? obj : x)) }))
    const buang = (kunci, id) =>
      setStatus((s) => ({ ...s, [kunci]: s[kunci].filter((x) => x.id !== id) }))

    return {
      muatUlang: async () => {
        setGalatKonek('')
        await muatSemua()
      },

      /* ------------------------------ Sesi ------------------------------ */
      async masuk(username, sandi) {
        try {
          const { token, pengguna } = await api.masuk(username, sandi)
          simpanToken(token)
          setSesiPengguna(pengguna)
          setMemuat(true)
          try {
            await muatSemua()
          } finally {
            setMemuat(false)
          }
          return { ok: true, pengguna }
        } catch (e) {
          return { ok: false, galat: e?.message || 'Gagal masuk' }
        }
      },

      keluar() {
        simpanToken('')
        setSesiPengguna(null)
        setStatus(statusKosong())
      },

      /* ----------------------------- Produk ----------------------------- */
      async tambahProduk(data) {
        const { produk } = await api.tambahProduk(data)
        depan('produk', produk)
        segarkanMaster().catch(() => null)
        return produk
      },

      async ubahProduk(id, data) {
        const { produk } = await api.ubahProduk(id, data)
        ganti('produk', produk)
        return produk
      },

      async hapusProduk(id) {
        await api.hapusProduk(id)
        buang('produk', id)
      },

      async setAktifProduk(id, aktif) {
        const { produk } = await api.setAktifProduk(id, aktif)
        ganti('produk', produk)
      },

      /* ---------------------------- Kategori ---------------------------- */
      async tambahKategori(nama) {
        const { kategori } = await api.tambahKategori(nama)
        await segarkanMaster()
        return kategori
      },

      async ubahKategori(id, nama) {
        const { kategori } = await api.ubahKategori(id, nama)
        await segarkanMaster()
        return kategori
      },

      async hapusKategori(id) {
        await api.hapusKategori(id)
        await segarkanMaster()
      },

      /* ----------------------------- Satuan ----------------------------- */
      async tambahSatuan(nama) {
        const { satuan } = await api.tambahSatuan(nama)
        await segarkanMaster()
        return satuan
      },

      async ubahSatuan(id, nama) {
        const { satuan } = await api.ubahSatuan(id, nama)
        await segarkanMaster()
        return satuan
      },

      async hapusSatuan(id) {
        await api.hapusSatuan(id)
        await segarkanMaster()
      },

      /* ------------------------------- Stok ------------------------------ */
      async mutasiStok({ produkId, tipe, qty, keterangan, ref }) {
        try {
          const { produk, delta } = await api.mutasiStok({ produkId, tipe, qty, keterangan, ref })
          ganti('produk', produk)
          const { mutasi } = await api.daftarMutasi()
          setStatus((s) => ({ ...s, mutasi: mutasi.mutasi || [] }))
          return { stokLama: produk.stok - delta, stokBaru: produk.stok }
        } catch (e) {
          if (String(e?.message || '').includes('Tidak ada perubahan')) return null
          throw e
        }
      },

      async opnameStok(perubahan, keterangan = 'Stok opname') {
        const hasil = await api.opnameStok(perubahan, keterangan)
        await segarkanStok()
        return hasil.diubah || 0
      },

      /* ---------------------------- Transaksi ---------------------------- */
      async simpanTransaksi(data) {
        const { transaksi } = await api.simpanTransaksi(data)
        depan('transaksi', transaksi)
        segarkanStok().catch(() => null)
        return transaksi
      },

      async voidTransaksi(id, alasan = '') {
        await api.voidTransaksi(id, alasan)
        setStatus((s) => ({
          ...s,
          transaksi: s.transaksi.map((t) =>
            t.id === id ? { ...t, status: 'void', alasanVoid: alasan } : t,
          ),
        }))
        segarkanStok().catch(() => null)
        return true
      },

      /* ---------------------------- Pelanggan ---------------------------- */
      async tambahPelanggan(data) {
        const { pelanggan } = await api.tambahPelanggan(data)
        depan('pelanggan', pelanggan)
        return pelanggan
      },

      async ubahPelanggan(id, data) {
        const { pelanggan } = await api.ubahPelanggan(id, data)
        ganti('pelanggan', pelanggan)
        return pelanggan
      },

      async hapusPelanggan(id) {
        await api.hapusPelanggan(id)
        buang('pelanggan', id)
      },

      /* ---------------------------- Supplier ----------------------------- */
      async tambahSupplier(data) {
        const { supplier } = await api.tambahSupplier(data)
        depan('supplier', supplier)
        return supplier
      },

      async ubahSupplier(id, data) {
        const { supplier } = await api.ubahSupplier(id, data)
        ganti('supplier', supplier)
        return supplier
      },

      async hapusSupplier(id) {
        await api.hapusSupplier(id)
        buang('supplier', id)
      },

      /* ---------------------------- Pembelian ---------------------------- */
      async simpanPembelian(data) {
        const { pembelian } = await api.simpanPembelian(data)
        depan('pembelian', pembelian)
        segarkanStok().catch(() => null)
        return pembelian
      },

      /* ---------------------------- Pengaturan --------------------------- */
      async simpanPengaturan(nilai) {
        const { pengaturan } = await api.simpanPengaturan(nilai)
        setStatus((s) => ({ ...s, pengaturan }))
        return pengaturan
      },

      /* ---------------------------- Pengguna ----------------------------- */
      async tambahPengguna({ nama, username, peran, sandi }) {
        try {
          const { pengguna } = await api.tambahPengguna({ nama, username, peran, sandi })
          depan('pengguna', pengguna)
          return { ok: true, pengguna }
        } catch (e) {
          return { ok: false, galat: e?.message || 'Gagal menambah pengguna' }
        }
      },

      async ubahPengguna(id, { nama, peran }) {
        try {
          const { pengguna } = await api.ubahPengguna(id, { nama, peran })
          ganti('pengguna', pengguna)
          return { ok: true }
        } catch (e) {
          return { ok: false, galat: e?.message || 'Gagal menyimpan' }
        }
      },

      async aturSandi(id, sandiBaru) {
        try {
          await api.aturSandiPengguna(id, sandiBaru)
          return { ok: true }
        } catch (e) {
          return { ok: false, galat: e?.message || 'Gagal mengganti sandi' }
        }
      },

      async setAktifPengguna(id, aktif) {
        try {
          const { pengguna } = await api.setAktifPengguna(id, aktif)
          ganti('pengguna', pengguna)
          return { ok: true }
        } catch (e) {
          return { ok: false, galat: e?.message || 'Gagal mengubah status' }
        }
      },

      hapusPengguna(id, sesiIdAktif) {
        if (id === sesiIdAktif) return Promise.resolve({ ok: false, galat: 'Tidak bisa menghapus akun sendiri' })
        return api
          .hapusPengguna(id)
          .then(() => {
            buang('pengguna', id)
            return { ok: true }
          })
          .catch((e) => ({ ok: false, galat: e?.message || 'Gagal menghapus' }))
      },

      /* ------------------------------ Data ------------------------------ */
      async muatDemo() {
        await api.muatDemo()
        await muatSemua()
      },

      async kosongkanData() {
        await api.kosongkanData()
        await muatSemua()
      },

      bersihFotoYatim: () => api.bersihFoto(),

      /* ---------------------------- Integrasi ---------------------------- */
      muatIntegrasi,

      async simpanIntegrasi(provider, draf) {
        const { integrasi } = await api.simpanIntegrasi(provider, draf)
        await muatIntegrasi()
        return integrasi
      },

      authorizeAccurate: () => api.authorizeAccurate(),
      dbAccurate: () => api.dbAccurate(),
      bukaDbAccurate: (dbId) => api.bukaDbAccurate(dbId).then((r) => muatIntegrasi().then(() => r)),
      ujiIntegrasi: (provider) =>
        api.ujiIntegrasi(provider).then((r) => muatIntegrasi().then(() => r)),
      putusIntegrasi: (provider) =>
        api.putusIntegrasi(provider).then((r) => muatIntegrasi().then(() => r)),
      kirimAccurate: (saleId) => api.kirimAccurate(saleId),
    }
  }, [muatSemua, muatIntegrasi, segarkanMaster, segarkanStok])

  const statusLengkap = useMemo(
    () => ({ ...status, memuat, galatKonek }),
    [status, memuat, galatKonek],
  )

  return (
    <StatusKonteks.Provider value={statusLengkap}>
      <AksiKonteks.Provider value={aksi}>
        <ToastKonteks.Provider value={toast}>
          <SesiKonteks.Provider value={{ pengguna: sesiPengguna }}>
            {children}
            <TumpukToast daftar={toasts} tutup={tutupToast} />
          </SesiKonteks.Provider>
        </ToastKonteks.Provider>
      </AksiKonteks.Provider>
    </StatusKonteks.Provider>
  )
}

/* --------------------------- Tumpukan toast ----------------------------- */

function TumpukToast({ daftar, tutup }) {
  if (!daftar.length) return null
  const ikon = { sukses: 'centang-bulat', galat: 'peringatan', info: 'info' }
  return (
    <div className="toast-tumpuk tanpa-cetak" role="status" aria-live="polite">
      {daftar.map((t) => (
        <div key={t.id} className={`toast toast-${t.jenis}`}>
          <Icon nama={ikon[t.jenis] || 'info'} ukuran={16} />
          <span className="isi">{t.pesan}</span>
          <button
            type="button"
            className="toast-tutup"
            onClick={() => tutup(t.id)}
            aria-label="Tutup pemberitahuan"
          >
            <Icon nama="tutup" ukuran={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
