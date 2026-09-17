/* Konteks & hook akses status aplikasi.

   Dipisah dari AppStore.jsx agar berkas provider hanya mengekspor komponen
   (syarat Fast Refresh) dan hook bisa diimpor dari mana saja.              */

import { createContext, useContext } from 'react'

export const StatusKonteks = createContext(null)
export const AksiKonteks = createContext(null)
export const ToastKonteks = createContext(null)
export const SesiKonteks = createContext(null)

/** Status mentah: { produk, kategori, transaksi, mutasi, pelanggan, supplier, pembelian, pengguna, pengaturan } */
export function useStatus() {
  const v = useContext(StatusKonteks)
  if (!v) throw new Error('useStatus harus dipakai di dalam <AppStoreProvider>')
  return v
}

/** Kumpulan aksi pengubah data (stabil, tidak berubah antar render) */
export function useAksi() {
  const v = useContext(AksiKonteks)
  if (!v) throw new Error('useAksi harus dipakai di dalam <AppStoreProvider>')
  return v
}

/** Pemberitahuan singkat: toast.sukses / toast.galat / toast.info */
export function useToast() {
  const v = useContext(ToastKonteks)
  if (!v) throw new Error('useToast harus dipakai di dalam <AppStoreProvider>')
  return v
}

/** Sesi masuk: { pengguna } atau { pengguna: null } bila belum masuk */
export function useSesi() {
  const v = useContext(SesiKonteks)
  if (!v) throw new Error('useSesi harus dipakai di dalam <AppStoreProvider>')
  return v
}
