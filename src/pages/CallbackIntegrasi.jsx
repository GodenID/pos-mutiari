/* =========================================================================
   CallbackIntegrasi — halaman pendaratan sehabis Otorisasi OAuth Accurate.
   Backend sudah menukar kode & menyimpan token; halaman ini tinggal
   menyegarkan status lalu kembali ke Pengaturan.
   ========================================================================= */

import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { useAksi, useSesi, useToast } from '../store/konteks.js'

export default function CallbackIntegrasi() {
  const { pengguna } = useSesi()
  const aksi = useAksi()
  const toast = useToast()
  const navigasi = useNavigate()
  const [param] = useSearchParams()
  const jalan = useRef(false)

  useEffect(() => {
    if (jalan.current) return
    jalan.current = true
    const ok = param.get('ok')
    const galat = param.get('error')
    ;(async () => {
      try {
        await aksi.muatIntegrasi()
      } catch {
        /* abaikan — status dibaca ulang saat buka Pengaturan */
      }
      if (ok) toast.sukses('Accurate terhubung — pilih database di Pengaturan')
      else toast.galat(galat || 'Otorisasi Accurate gagal')
      navigasi('/pengaturan', { replace: true })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!pengguna) return <Navigate to="/masuk" replace />
  return (
    <div className="memuat-layar" role="status" aria-live="polite">
      <div className="memuat-kartu">
        <div className="sm tebal">Menyelesaikan otorisasi…</div>
        <div className="xs muted">Menghubungkan ke Accurate</div>
      </div>
    </div>
  )
}
