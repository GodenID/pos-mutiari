/* =========================================================================
   Penjualan — riwayat transaksi, rincian nota, cetak ulang struk, pembatalan
   ========================================================================= */

import { useMemo, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import RentangTanggal from '../components/RentangTanggal.jsx'
import useRentang from '../hooks/useRentang.js'
import Struk from '../components/Struk.jsx'
import {
  Bidang,
  Kartu,
  Kosong,
  KotakCari,
  LencanaMetode,
  LencanaStatusTrx,
  Paginasi,
  Segmen,
  Stat,
} from '../components/UI.jsx'
import { useAksi, useSesi, useStatus, useToast } from '../store/konteks.js'
import { dalamRentang, ringkas } from '../lib/analitik.js'
import { METODE_BAYAR, labelMetode } from '../data/seed.js'
import { cetakElemen } from '../lib/cetak.js'
import {
  angka,
  jam,
  rupiah,
  rupiahSingkat,
  tanggal,
  tanggalJam,
  tanggalPanjang,
} from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'

const PER_HALAMAN = 15

const SARING_STATUS = [
  { id: 'semua', nama: 'Semua' },
  { id: 'selesai', nama: 'Selesai' },
  { id: 'void', nama: 'Dibatalkan' },
]

export default function Penjualan() {
  const { transaksi, pengaturan } = useStatus()
  const { pengguna } = useSesi()
  const aksi = useAksi()
  const toast = useToast()
  const admin = pengguna?.peran === 'admin'

  const rentang = useRentang('7hari')
  const [cari, setCari] = useState('')
  const [metode, setMetode] = useState('semua')
  const [status, setStatus] = useState('semua')
  const [halaman, setHalaman] = useState(1)
  const [detail, setDetail] = useState(null)
  const [akanVoid, setAkanVoid] = useState(null)
  const [alasanVoid, setAlasanVoid] = useState('')

  const acuanStruk = useRef(null)

  const dalamPeriode = useMemo(
    () => dalamRentang(transaksi, rentang.dari, rentang.sampai),
    [transaksi, rentang.dari, rentang.sampai],
  )

  const r = useMemo(() => ringkas(dalamPeriode), [dalamPeriode])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return dalamPeriode.filter((t) => {
      if (metode !== 'semua' && t.metode !== metode) return false
      if (status === 'selesai' && t.status === 'void') return false
      if (status === 'void' && t.status !== 'void') return false
      if (!q) return true
      return (
        t.nomor.toLowerCase().includes(q) ||
        (t.pelanggan || '').toLowerCase().includes(q) ||
        t.kasir.toLowerCase().includes(q) ||
        t.item.some((i) => i.nama.toLowerCase().includes(q))
      )
    })
  }, [dalamPeriode, cari, metode, status])

  const halamanAman = Math.min(
    halaman,
    Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN)),
  )
  const tampil = tersaring.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  )

  const cetakStruk = () =>
    cetakElemen(
      acuanStruk.current,
      `struk ${pengaturan.lebarStruk === '80mm' ? 'struk-80' : ''}`,
      `Struk ${detail?.nomor || ''}`,
    )

  const eksporCsv = () => {
    unduhCsv(
      `penjualan_${stempelFile()}`,
      [
        'No. Nota',
        'Tanggal',
        'Jam',
        'Kasir',
        'Pelanggan',
        'Jenis Item',
        'Total Qty',
        'Subtotal',
        'Diskon Item',
        'Diskon Nota',
        'Pajak',
        'Total',
        'Metode',
        'Rincian Bayar',
        'Bayar',
        'Kembalian',
        'Status',
      ],
      tersaring.map((t) => [
        t.nomor,
        tanggal(t.tanggal),
        jam(t.tanggal),
        t.kasir,
        t.pelanggan || '-',
        t.item.length,
        t.item.reduce((a, b) => a + b.qty, 0),
        t.subtotal + (t.diskonItem || 0),
        t.diskonItem || 0,
        t.diskon,
        t.pajak,
        t.total,
        labelMetode(t.metode),
        Array.isArray(t.pembayaran) && t.pembayaran.length > 1
          ? t.pembayaran.map((p) => `${labelMetode(p.metode)} ${p.jumlah}`).join(' + ')
          : labelMetode(t.metode),
        t.bayar,
        t.kembalian,
        t.status === 'void' ? 'Dibatalkan' : 'Selesai',
      ]),
      [
        `Laporan Penjualan — ${rentang.label}`,
        `${tersaring.length} transaksi • omzet ${rupiah(r.omzet)}`,
        `Dicetak ${tanggalJam(new Date())}`,
      ],
    )
    toast.sukses('Data penjualan diekspor ke CSV')
  }

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Penjualan</h1>
          <p>{rentang.label}</p>
        </div>
        <button type="button" className="btn" onClick={eksporCsv}>
          <Icon nama="unduh" ukuran={15} />
          Ekspor CSV
        </button>
      </div>

      <RentangTanggal rentang={rentang} />

      <div className="grid-stat">
        <Stat
          utama
          label="Omzet periode"
          ikon="uang"
          nilai={rupiah(r.omzet)}
          kaki={`${angka(r.jumlahTransaksi)} transaksi selesai`}
        />
        <Stat
          label="Item terjual"
          ikon="kotak"
          nilai={angka(r.itemTerjual)}
          kaki={`${r.rataItemPerTransaksi.toFixed(1)} item per nota`}
        />
        <Stat
          label="Rata-rata per nota"
          ikon="struk"
          nilai={rupiah(r.rataPerTransaksi)}
          kaki={`diskon diberikan ${rupiahSingkat(r.diskon)}`}
        />
        <Stat
          label="Dibatalkan"
          ikon="batal"
          nilai={angka(r.dibatalkan)}
          kaki="nota void pada periode ini"
        />
      </div>

      <Kartu rapat>
        <div
          className="alat-baris"
          style={{ padding: 12, borderBottom: '1px solid var(--line)' }}
        >
          <KotakCari
            nilai={cari}
            onUbah={(v) => {
              setCari(v)
              setHalaman(1)
            }}
            placeholder="Cari no. nota, pelanggan, kasir, atau produk…"
            className="isi"
            style={{ minWidth: 220 }}
          />
          <select
            className="sel"
            style={{ width: 'auto', minWidth: 150 }}
            value={metode}
            onChange={(e) => {
              setMetode(e.target.value)
              setHalaman(1)
            }}
            aria-label="Saring metode pembayaran"
          >
            <option value="semua">Semua metode</option>
            {METODE_BAYAR.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
          <Segmen
            label="Saring status"
            opsi={SARING_STATUS}
            nilai={status}
            onUbah={(v) => {
              setStatus(v)
              setHalaman(1)
            }}
          />
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="struk"
            judul="Tidak ada transaksi"
            pesan={`Belum ada transaksi yang cocok pada periode ${rentang.label.toLowerCase()}.`}
          />
        ) : (
          <>
            <div className="tabel-bungkus tabel-responsif">
              <table className="tabel tabel-klik">
                <thead>
                  <tr>
                    <th>No. Nota</th>
                    <th>Waktu</th>
                    <th>Kasir / Pelanggan</th>
                    <th className="kanan-teks">Item</th>
                    <th>Metode</th>
                    <th className="kanan-teks">Total</th>
                    <th>Status</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setDetail(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setDetail(t)
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <span className="sel-utama num sm">{t.nomor}</span>
                      </td>
                      <td>
                        <div className="sm num">{tanggal(t.tanggal)}</div>
                        <div className="sel-sub num">{jam(t.tanggal)}</div>
                      </td>
                      <td>
                        <div className="sm">{t.kasir}</div>
                        {t.pelanggan ? (
                          <div className="sel-sub">{t.pelanggan}</div>
                        ) : null}
                      </td>
                      <td className="kanan-teks">
                        <span className="num">{angka(t.item.length)}</span>
                        <div className="sel-sub num">
                          {angka(t.item.reduce((a, b) => a + b.qty, 0))} qty
                        </div>
                      </td>
                      <td>
                        <LencanaMetode metode={t.metode} />
                      </td>
                      <td className="kanan-teks">
                        <span
                          className="rp tebal"
                          style={
                            t.status === 'void'
                              ? { textDecoration: 'line-through', opacity: 0.5 }
                              : undefined
                          }
                        >
                          {rupiah(t.total)}
                        </span>
                      </td>
                      <td>
                        <LencanaStatusTrx status={t.status} />
                      </td>
                      <td>
                        <div className="sel-aksi">
                          <button
                            type="button"
                            className="btn btn-sm btn-hantu btn-ikon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetail(t)
                            }}
                            aria-label={`Lihat rincian ${t.nomor}`}
                          >
                            <Icon nama="mata" ukuran={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>
                      Total halaman ini ({angka(tampil.length)} nota)
                    </td>
                    <td className="kanan-teks rp">
                      {rupiah(
                        tampil
                          .filter((t) => t.status !== 'void')
                          .reduce((a, t) => a + t.total, 0),
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="kartu-daftar">
              {tampil.map((t) => (
                <button
                  type="button"
                  className="daftar-item"
                  key={t.id}
                  onClick={() => setDetail(t)}
                >
                  <div>
                    <div className="daftar-nama num">{t.nomor}</div>
                    <div className="daftar-meta num">
                      {tanggal(t.tanggal)} {jam(t.tanggal)} • {t.kasir}
                    </div>
                    <div className="row g6" style={{ marginTop: 5 }}>
                      <LencanaMetode metode={t.metode} />
                      {t.status === 'void' ? (
                        <LencanaStatusTrx status={t.status} />
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div
                      className="daftar-nilai"
                      style={
                        t.status === 'void'
                          ? { textDecoration: 'line-through', opacity: 0.5 }
                          : undefined
                      }
                    >
                      {rupiah(t.total)}
                    </div>
                    <div className="daftar-meta daftar-kanan-bawah num">
                      {angka(t.item.length)} jenis
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
              <Paginasi
                halaman={halamanAman}
                totalData={tersaring.length}
                perHalaman={PER_HALAMAN}
                onUbah={setHalaman}
              />
            </div>
          </>
        )}
      </Kartu>

      {/* =========================== Rincian nota ======================== */}
      <Modal
        buka={!!detail}
        tutup={() => setDetail(null)}
        judul={detail ? `Nota ${detail.nomor}` : ''}
        keterangan={detail ? tanggalPanjang(detail.tanggal) : ''}
        ukuran="lg"
        kaki={
          <>
            {detail?.status !== 'void' && admin ? (
              <button
                type="button"
                className="btn btn-bahaya"
                onClick={() => {
                  setAlasanVoid('')
                  setAkanVoid(detail)
                }}
              >
                <Icon nama="batal" ukuran={15} />
                Batalkan Nota
              </button>
            ) : null}
            <button type="button" className="btn kanan" onClick={cetakStruk}>
              <Icon nama="cetak" ukuran={15} />
              Cetak Struk
            </button>
            <button
              type="button"
              className="btn btn-primer"
              onClick={() => setDetail(null)}
            >
              Tutup
            </button>
          </>
        }
      >
        {detail ? (
          <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
            <div className="col g12">
              <div className="detail-kepala">
                <div className="detail-sel">
                  <span className="label">Waktu</span>
                  <b className="num">{jam(detail.tanggal)}</b>
                </div>
                <div className="detail-sel">
                  <span className="label">Kasir</span>
                  <b>{detail.kasir}</b>
                </div>
                <div className="detail-sel">
                  <span className="label">Metode</span>
                  <b>{labelMetode(detail.metode)}</b>
                </div>
                <div className="detail-sel">
                  <span className="label">Status</span>
                  <b>
                    <LencanaStatusTrx status={detail.status} />
                  </b>
                </div>
              </div>

              {detail.status === 'void' ? (
                <div className="info-box info-box-merah">
                  <Icon nama="peringatan" ukuran={16} />
                  <span>
                    Nota ini dibatalkan
                    {detail.waktuVoid ? ` pada ${tanggalJam(detail.waktuVoid)}` : ''}.
                    Stok barang sudah dikembalikan.
                    {detail.alasanVoid ? (
                      <>
                        {' '}
                        Alasan: <b>{detail.alasanVoid}</b>
                      </>
                    ) : null}
                  </span>
                </div>
              ) : null}

              <div className="tabel-bungkus">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th className="kanan-teks">Harga</th>
                      <th className="kanan-teks">Qty</th>
                      <th className="kanan-teks">Diskon</th>
                      <th className="kanan-teks">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.item.map((i) => (
                      <tr key={i.produkId + i.harga}>
                        <td>
                          <div className="sel-utama sm">{i.nama}</div>
                          <div className="sel-sub num">{i.sku}</div>
                        </td>
                        <td className="kanan-teks rp">{rupiah(i.harga)}</td>
                        <td className="kanan-teks num">
                          {angka(i.qty)} <span className="xs muted">{i.satuan}</span>
                        </td>
                        <td className="kanan-teks rp">
                          {i.diskon > 0 ? (
                            <span className="turun">-{rupiah(i.diskon)}</span>
                          ) : (
                            <span className="tersier">—</span>
                          )}
                        </td>
                        <td className="kanan-teks rp tebal">{rupiah(i.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="rincian">
                <div className="rincian-baris">
                  <dt>Subtotal</dt>
                  <dd>{rupiah(detail.subtotal + (detail.diskonItem || 0))}</dd>
                </div>
                {detail.diskonItem > 0 ? (
                  <div className="rincian-baris">
                    <dt>Diskon item</dt>
                    <dd className="turun">-{rupiah(detail.diskonItem)}</dd>
                  </div>
                ) : null}
                {detail.diskon > 0 ? (
                  <div className="rincian-baris">
                    <dt>Diskon nota</dt>
                    <dd className="turun">-{rupiah(detail.diskon)}</dd>
                  </div>
                ) : null}
                {detail.pajak > 0 ? (
                  <div className="rincian-baris">
                    <dt>PPN {detail.pajakPersen}%</dt>
                    <dd>{rupiah(detail.pajak)}</dd>
                  </div>
                ) : null}
                {Array.isArray(detail.pembayaran) && detail.pembayaran.length > 1 ? (
                  <>
                    {detail.pembayaran.map((p, idx) => (
                      <div className="rincian-baris" key={idx}>
                        <dt>Dibayar ({labelMetode(p.metode)})</dt>
                        <dd>{rupiah(p.jumlah)}</dd>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="rincian-baris">
                    <dt>Dibayar ({labelMetode(detail.metode)})</dt>
                    <dd>{rupiah(detail.bayar)}</dd>
                  </div>
                )}
                {detail.metode === 'tunai' ? (
                  <div className="rincian-baris">
                    <dt>Kembalian</dt>
                    <dd>{rupiah(detail.kembalian)}</dd>
                  </div>
                ) : null}
                <div className="rincian-baris rincian-total">
                  <dt>Total</dt>
                  <dd>{rupiah(detail.total)}</dd>
                </div>
              </dl>

              {detail.catatan ? (
                <div className="info-box info-box-netral">
                  <Icon nama="info" ukuran={16} />
                  <span>Catatan: {detail.catatan}</span>
                </div>
              ) : null}
            </div>

            <div className="struk-panggung" style={{ borderRadius: 'var(--r)' }}>
              <Struk transaksi={detail} pengaturan={pengaturan} ref={acuanStruk} />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ========================= Pembatalan nota ======================= */}
      <Modal
        buka={!!akanVoid}
        tutup={() => setAkanVoid(null)}
        judul="Batalkan transaksi?"
        ukuran="sm"
        kaki={
          <>
            <button type="button" className="btn" onClick={() => setAkanVoid(null)}>
              Tidak
            </button>
            <button
              type="button"
              className="btn btn-bahaya-isi kanan"
              onClick={() => {
                const nomor = akanVoid.nomor
                aksi.voidTransaksi(akanVoid.id, alasanVoid.trim())
                toast.sukses(`Nota ${nomor} dibatalkan, stok dikembalikan`)
                setAkanVoid(null)
                setDetail(null)
              }}
            >
              <Icon nama="batal" ukuran={15} />
              Ya, batalkan nota
            </button>
          </>
        }
      >
        <div className="col g12">
          <div className="info-box info-box-merah">
            <Icon nama="peringatan" ukuran={16} />
            <span>
              Nota <b className="num">{akanVoid?.nomor}</b> sebesar{' '}
              <b>{rupiah(akanVoid?.total || 0)}</b> akan ditandai dibatalkan dan{' '}
              <b>stok barang dikembalikan</b>. Nota tetap tersimpan sebagai jejak audit
              dan tidak dihitung dalam omzet.
            </span>
          </div>
          <Bidang label="Alasan pembatalan" petunjuk="Tercatat pada riwayat mutasi stok">
            <input
              className="inp"
              data-fokus-awal
              value={alasanVoid}
              onChange={(e) => setAlasanVoid(e.target.value)}
              placeholder="mis. salah input qty, pembeli membatalkan"
            />
          </Bidang>
        </div>
      </Modal>
    </div>
  )
}
