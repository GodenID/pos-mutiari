/* Struk kasir — tampil di layar sebagai pratinjau, sekaligus jadi
   sumber salinan saat dicetak (lihat lib/cetak.js).                        */

import { labelMetode } from '../data/seed.js'
import {
  angka,
  jam,
  rupiahTanpaLabel,
  tanggal,
  terbilang,
} from '../lib/format.js'

export default function Struk({ transaksi: t, pengaturan: p, ref }) {
  if (!t) return null
  const kembalian = Math.max(0, (t.bayar || 0) - t.total)

  return (
    <div className="struk" ref={ref}>
      <div className="struk-kepala">
        <div className="struk-toko">{p.namaToko}</div>
        {p.alamat ? <div className="struk-alamat">{p.alamat}</div> : null}
        {p.telepon ? <div className="struk-alamat">Telp. {p.telepon}</div> : null}
        {p.npwp ? <div className="struk-alamat">NPWP {p.npwp}</div> : null}
      </div>

      <div className="struk-meta">
        <span>No.</span>
        <span>{t.nomor}</span>
        <span>Tanggal</span>
        <span>
          {tanggal(t.tanggal)} {jam(t.tanggal)}
        </span>
        <span>Kasir</span>
        <span>{t.kasir}</span>
        {t.pelanggan ? (
          <>
            <span>Pelanggan</span>
            <span>{t.pelanggan}</span>
          </>
        ) : null}
      </div>

      {t.status === 'void' ? (
        <div
          style={{
            textAlign: 'center',
            padding: '6px 0',
            borderBottom: '1px dashed var(--ink-300)',
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          *** TRANSAKSI DIBATALKAN ***
        </div>
      ) : null}

      <div className="struk-item">
        {t.item.map((it) => (
          <div className="struk-item-baris" key={it.produkId + it.harga}>
            <div className="struk-item-nama">{it.nama}</div>
            <div className="struk-item-hitung">
              <span>
                {angka(it.qty)} {it.satuan} × {rupiahTanpaLabel(it.harga)}
              </span>
              <span>{rupiahTanpaLabel(it.subtotal)}</span>
            </div>
            {it.diskon > 0 ? (
              <div className="struk-item-hitung">
                <span>diskon item</span>
                <span>-{rupiahTanpaLabel(it.diskon)}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="struk-jumlah">
        <div className="struk-baris">
          <span>Subtotal ({angka(t.item.reduce((a, b) => a + b.qty, 0))} item)</span>
          <span>{rupiahTanpaLabel(t.subtotal + (t.diskonItem || 0))}</span>
        </div>
        {t.diskonItem > 0 ? (
          <div className="struk-baris">
            <span>Diskon item</span>
            <span>-{rupiahTanpaLabel(t.diskonItem)}</span>
          </div>
        ) : null}
        {t.diskon > 0 ? (
          <div className="struk-baris">
            <span>Diskon nota</span>
            <span>-{rupiahTanpaLabel(t.diskon)}</span>
          </div>
        ) : null}
        {t.pajak > 0 ? (
          <div className="struk-baris">
            <span>PPN {t.pajakPersen}%</span>
            <span>{rupiahTanpaLabel(t.pajak)}</span>
          </div>
        ) : null}
        <div className="struk-baris tot">
          <span>TOTAL</span>
          <span>{rupiahTanpaLabel(t.total)}</span>
        </div>
        {Array.isArray(t.pembayaran) && t.pembayaran.length > 1 ? (
          <>
            {t.pembayaran.map((p, i) => (
              <div className="struk-baris" style={{ marginTop: i === 0 ? 4 : 0 }} key={i}>
                <span>{labelMetode(p.metode)}</span>
                <span>{rupiahTanpaLabel(p.jumlah)}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="struk-baris" style={{ marginTop: 4 }}>
            <span>{labelMetode(t.metode)}</span>
            <span>{rupiahTanpaLabel(t.bayar ?? t.total)}</span>
          </div>
        )}
        {t.metode === 'tunai' ? (
          <div className="struk-baris">
            <span>Kembalian</span>
            <span>{rupiahTanpaLabel(kembalian)}</span>
          </div>
        ) : null}
      </div>

      {p.tampilkanTerbilang ? (
        <div className="struk-terbilang">{terbilang(t.total)}</div>
      ) : null}

      {t.catatan ? (
        <div className="struk-terbilang" style={{ fontStyle: 'normal' }}>
          Catatan: {t.catatan}
        </div>
      ) : null}

      <div className="struk-kaki">
        {p.footerStruk ? <div>{p.footerStruk}</div> : null}
        <div style={{ marginTop: 4 }}>
          Dicetak {tanggal(new Date())} {jam(new Date())}
        </div>
      </div>
    </div>
  )
}
