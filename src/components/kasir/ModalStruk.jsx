/* Konfirmasi transaksi berhasil + pratinjau & cetak struk */

import { useEffect, useRef } from 'react'

import Icon from '../Icon.jsx'
import Modal from '../Modal.jsx'
import Struk from '../Struk.jsx'
import { cetakElemen } from '../../lib/cetak.js'
import { labelMetode } from '../../data/seed.js'
import { rupiah } from '../../lib/format.js'

export default function ModalStruk({
  buka,
  tutup,
  transaksi,
  pengaturan,
  labelTutup = 'Transaksi Baru',
  ringkasSukses = true,
  cetakOtomatis = false,
}) {
  const acuan = useRef(null)
  const sudahCetakId = useRef(null)

  const cetak = () =>
    cetakElemen(
      acuan.current,
      `struk ${pengaturan.lebarStruk === '80mm' ? 'struk-80' : ''}`,
      `Struk ${transaksi?.nomor || ''}`,
    )

  // Cetak sekali per transaksi bila sakelar aktif — dialog tetap dibuka
  // agar kasir bisa melihat kembalian & mencetak ulang bila perlu.
  useEffect(() => {
    if (!buka || !transaksi || !cetakOtomatis) return
    if (sudahCetakId.current === transaksi.id || !acuan.current) return
    sudahCetakId.current = transaksi.id
    const t = setTimeout(cetak, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka, transaksi, cetakOtomatis])

  if (!transaksi) return null

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      ukuran="sm"
      kelasIsi="tanpa-jarak"
      kaki={
        <>
          <button type="button" className="btn" onClick={cetak}>
            <Icon nama="cetak" ukuran={15} />
            Cetak Struk
          </button>
          <button type="button" className="btn btn-primer kanan" onClick={tutup}>
            {labelTutup}
          </button>
        </>
      }
    >
      {ringkasSukses ? (
        <div className="sukses-kepala">
          <span className="sukses-cincin">
            <Icon nama="centang" ukuran={22} tebal={2.4} />
          </span>
          <div className="label" style={{ color: 'var(--g-700)' }}>
            {transaksi.metode === 'tunai' ? 'Kembalian' : 'Pembayaran diterima'}
          </div>
          <div className="sukses-kembalian">
            {rupiah(
              transaksi.metode === 'tunai' ? transaksi.kembalian : transaksi.total,
            )}
          </div>
          <div className="xs muted">
            {transaksi.nomor} •{' '}
            {Array.isArray(transaksi.pembayaran) && transaksi.pembayaran.length > 1
              ? 'Split payment'
              : labelMetode(transaksi.metode)}{' '}
            • {rupiah(transaksi.total)}
          </div>
        </div>
      ) : null}

      <div className="struk-panggung">
        <Struk transaksi={transaksi} pengaturan={pengaturan} ref={acuan} />
      </div>
    </Modal>
  )
}
