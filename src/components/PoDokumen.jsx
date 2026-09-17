/* Dokumen PO — pratinjau rapi di layar sekaligus sumber salinan cetak
   (lihat lib/cetak.js). Isi sejajar dengan PDF unduhan (lib/poPdf.js). */

import { angka, tanggalJam, terbilang } from '../lib/format.js'

export default function PoDokumen({ po, pengaturan, supplier, ref }) {
  if (!po) return null

  const totalUnit = po.item.reduce((a, b) => a + b.qty, 0)

  return (
    <div className="dok-po" ref={ref}>
      {/* Kop */}
      <div className="dok-po-kop">
        <div className="isi">
          <div className="dok-po-toko">{pengaturan.namaToko}</div>
          <div className="dok-po-sub">
            {[pengaturan.alamat, pengaturan.telepon ? `Telp. ${pengaturan.telepon}` : '']
              .filter(Boolean)
              .join('  •  ')}
          </div>
        </div>
        <div className="dok-po-judul">
          <div className="label">Pesanan Pembelian</div>
          <div className="dok-po-nomor num">{po.nomor}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="dok-po-meta">
        <div>
          <span>Tanggal</span>
          <b className="num">{tanggalJam(po.tanggal)}</b>
        </div>
        <div>
          <span>Supplier</span>
          <b>{po.supplierNama}</b>
          {supplier?.telepon || supplier?.alamat ? (
            <i className="dok-po-sub2">
              {[supplier?.telepon, supplier?.alamat].filter(Boolean).join(' • ')}
            </i>
          ) : null}
        </div>
        <div>
          <span>Petugas</span>
          <b>{po.petugas}</b>
        </div>
      </div>

      {/* Barang */}
      <div className="tabel-bungkus">
        <table className="tabel">
          <thead>
            <tr>
              <th style={{ width: 36 }} className="tengah-teks">No</th>
              <th>Produk</th>
              <th className="kanan-teks">Qty</th>
              <th className="kanan-teks">Harga Beli</th>
              <th className="kanan-teks">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {po.item.map((it, i) => (
              <tr key={it.produkId}>
                <td className="tengah-teks num tersier">{i + 1}</td>
                <td>
                  <div className="sel-utama sm">{it.nama}</div>
                  <div className="sel-sub num">{it.sku}</div>
                </td>
                <td className="kanan-teks num">
                  {angka(it.qty)} <span className="xs muted">{it.satuan}</span>
                </td>
                <td className="kanan-teks rp muted">{angka(it.hargaBeli)}</td>
                <td className="kanan-teks rp tebal">{angka(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                Total ({angka(po.item.length)} jenis • {angka(totalUnit)} unit)
              </td>
              <td className="kanan-teks rp">Rp {angka(po.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Terbilang + keterangan */}
      <div className="dok-po-terbilang">{terbilang(po.total)}</div>
      {po.keterangan ? (
        <div className="dok-po-catatan">Keterangan: {po.keterangan}</div>
      ) : null}

      {/* Tanda tangan */}
      <div className="dok-po-ttd">
        {[
          { peran: 'Dibuat oleh,', nama: po.petugas },
          { peran: 'Supplier,', nama: po.supplierNama },
        ].map((t) => (
          <div key={t.peran} className="dok-po-ttd-kolom">
            <span>{t.peran}</span>
            <b className="dok-po-ttd-garis">( ........................................ )</b>
            <b>{t.nama || '\u00A0'}</b>
          </div>
        ))}
      </div>

      <div className="dok-po-kaki">
        Dicetak {tanggalJam(new Date())} • Mutiari Garden POS
      </div>
    </div>
  )
}
