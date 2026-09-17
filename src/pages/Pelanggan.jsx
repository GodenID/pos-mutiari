/* =========================================================================
   Pelanggan — master pembeli + riwayat belanja per orang.
   Nama yang diketik di kasir otomatis tersimpan di sini.
   ========================================================================= */

import { useMemo, useState } from 'react'

import Icon from '../components/Icon.jsx'
import Modal, { Konfirmasi } from '../components/Modal.jsx'
import {
  Bidang,
  Kartu,
  Kosong,
  KotakCari,
  Paginasi,
  Stat,
  ThUrut,
} from '../components/UI.jsx'
import { useAksi, useStatus, useToast } from '../store/konteks.js'
import { perPelanggan, produkPelanggan } from '../lib/analitik.js'
import {
  angka,
  inisial,
  rupiah,
  rupiahSingkat,
  tanggal,
  tanggalJam,
  waktuRelatif,
} from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'

const PER_HALAMAN = 12

const FORM_KOSONG = { nama: '', telepon: '', alamat: '', catatan: '' }

export default function Pelanggan() {
  const { pelanggan, transaksi } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [urut, setUrut] = useState({ kunci: 'omzet', arah: 'turun' })
  const [halaman, setHalaman] = useState(1)
  const [modal, setModal] = useState(null) // 'form' | 'detail'
  const [sedangUbah, setSedangUbah] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [galat, setGalat] = useState({})
  const [detailId, setDetailId] = useState(null)
  const [akanHapus, setAkanHapus] = useState(null)

  const rekap = useMemo(() => perPelanggan(transaksi), [transaksi])
  const petaRekap = useMemo(() => {
    const peta = new Map()
    rekap.forEach((r) => {
      if (r.id) peta.set(r.id, r)
      peta.set(`nama:${r.nama.toLowerCase()}`, r)
    })
    return peta
  }, [rekap])

  const rekapOf = (p) =>
    petaRekap.get(p.id) ||
    petaRekap.get(`nama:${p.nama.toLowerCase()}`) || {
      transaksi: 0,
      omzet: 0,
      item: 0,
      terakhir: null,
    }

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    const hasil = pelanggan
      .filter((p) => {
        if (!q) return true
        return (
          p.nama.toLowerCase().includes(q) ||
          (p.telepon || '').toLowerCase().includes(q)
        )
      })
      .map((p) => ({ ...p, ...rekapOf(p) }))

    const arah = urut.arah === 'naik' ? 1 : -1
    return [...hasil].sort((a, b) => {
      switch (urut.kunci) {
        case 'nama':
          return a.nama.localeCompare(b.nama, 'id') * arah
        case 'transaksi':
          return (a.transaksi - b.transaksi) * arah
        case 'terakhir':
          return (
            (new Date(a.terakhir || 0) - new Date(b.terakhir || 0)) * arah
          )
        default:
          return (a.omzet - b.omzet) * arah
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pelanggan, cari, urut, petaRekap])

  const totalOmzetMember = rekap.reduce((a, r) => a + r.omzet, 0)
  const pernahBeli = baris.filter((b) => b.transaksi > 0).length

  const halamanAman = Math.min(
    halaman,
    Math.max(1, Math.ceil(baris.length / PER_HALAMAN)),
  )
  const tampil = baris.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  )

  const gantiUrut = (kunci) => {
    setUrut((u) =>
      u.kunci === kunci
        ? { kunci, arah: u.arah === 'naik' ? 'turun' : 'naik' }
        : { kunci, arah: kunci === 'nama' ? 'naik' : 'turun' },
    )
  }

  /* ------------------------------ Form ------------------------------ */

  function bukaTambah() {
    setSedangUbah(null)
    setForm(FORM_KOSONG)
    setGalat({})
    setModal('form')
  }

  function bukaUbah(p) {
    setSedangUbah(p)
    setForm({
      nama: p.nama,
      telepon: p.telepon || '',
      alamat: p.alamat || '',
      catatan: p.catatan || '',
    })
    setGalat({})
    setModal('form')
  }

  function simpan() {
    const g = {}
    if (!form.nama.trim()) g.nama = 'Nama pelanggan wajib diisi'
    const bentrok = pelanggan.find(
      (p) =>
        p.nama.toLowerCase() === form.nama.trim().toLowerCase() &&
        p.id !== sedangUbah?.id,
    )
    if (bentrok) g.nama = 'Nama ini sudah terdaftar'
    setGalat(g)
    if (Object.keys(g).length) return
    if (sedangUbah) {
      aksi.ubahPelanggan(sedangUbah.id, form)
      toast.sukses(`Pelanggan "${form.nama.trim()}" diperbarui`)
    } else {
      aksi.tambahPelanggan(form)
      toast.sukses(`Pelanggan "${form.nama.trim()}" ditambahkan`)
    }
    setModal(null)
  }

  function eksporCsv() {
    unduhCsv(
      `pelanggan_${stempelFile()}`,
      [
        'Nama',
        'Telepon',
        'Alamat',
        'Transaksi',
        'Item Dibeli',
        'Total Belanja',
        'Terakhir Beli',
      ],
      baris.map((p) => [
        p.nama,
        p.telepon || '-',
        p.alamat || '-',
        p.transaksi,
        p.item,
        p.omzet,
        p.terakhir ? tanggalJam(p.terakhir) : '-',
      ]),
      [`Daftar Pelanggan — ${baris.length} data`, `Diekspor ${tanggalJam(new Date())}`],
    )
    toast.sukses('Data pelanggan diekspor ke CSV')
  }

  const detail = detailId ? pelanggan.find((p) => p.id === detailId) : null

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Pelanggan</h1>
          <p>
            {angka(pelanggan.length)} pelanggan terdaftar •{' '}
            {angka(pernahBeli)} pernah berbelanja
          </p>
        </div>
        <div className="row g6 wrap">
          <button type="button" className="btn" onClick={eksporCsv}>
            <Icon nama="unduh" ukuran={15} />
            <span className="hanya-desktop">Ekspor CSV</span>
          </button>
          <button type="button" className="btn btn-primer" onClick={bukaTambah}>
            <Icon nama="tambah" ukuran={15} />
            Tambah Pelanggan
          </button>
        </div>
      </div>

      <div className="grid-stat">
        <Stat
          utama
          label="Belanja pelanggan tercatat"
          ikon="uang"
          nilai={rupiah(totalOmzetMember)}
          kaki={`${angka(rekap.reduce((a, r) => a + r.transaksi, 0))} transaksi bernama`}
        />
        <Stat
          label="Total pelanggan"
          ikon="pengguna"
          nilai={angka(pelanggan.length)}
          kaki="termasuk yang dibentuk dari kasir"
        />
        <Stat
          label="Pelanggan aktif"
          ikon="orang"
          nilai={angka(pernahBeli)}
          kaki="pernah berbelanja"
        />
        <Stat
          label="Rata-rata per pelanggan"
          ikon="bagan"
          nilai={rupiah(pernahBeli ? totalOmzetMember / pernahBeli : 0)}
          kaki="total belanja ÷ pelanggan aktif"
        />
      </div>

      <div className="info-box info-box-netral">
        <Icon nama="info" ukuran={16} />
        <span>
          Nama yang diketik di pembayaran kasir otomatis tersimpan sebagai
          pelanggan baru — riwayat belanjanya langsung terlacak di sini.
        </span>
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
            placeholder="Cari nama atau telepon…"
            className="isi"
            style={{ minWidth: 200 }}
          />
        </div>

        {baris.length === 0 ? (
          <Kosong
            ikon="pengguna"
            judul={pelanggan.length ? 'Tidak ada yang cocok' : 'Belum ada pelanggan'}
            pesan={
              pelanggan.length
                ? 'Ubah kata kunci pencarian.'
                : 'Tambahkan manual, atau ketik nama di pembayaran kasir agar terbentuk otomatis.'
            }
            aksi={
              pelanggan.length ? null : (
                <button type="button" className="btn btn-primer" onClick={bukaTambah}>
                  <Icon nama="tambah" ukuran={15} />
                  Tambah Pelanggan
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="tabel-bungkus tabel-responsif">
              <table className="tabel tabel-klik">
                <thead>
                  <tr>
                    <ThUrut kunci="nama" urut={urut} onUrut={gantiUrut}>
                      Pelanggan
                    </ThUrut>
                    <ThUrut kunci="transaksi" urut={urut} onUrut={gantiUrut} kanan>
                      Transaksi
                    </ThUrut>
                    <ThUrut kunci="omzet" urut={urut} onUrut={gantiUrut} kanan>
                      Total belanja
                    </ThUrut>
                    <ThUrut kunci="terakhir" urut={urut} onUrut={gantiUrut}>
                      Terakhir beli
                    </ThUrut>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setDetailId(p.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setDetailId(p.id)
                      }}
                    >
                      <td>
                        <div className="row g6">
                          <span className="avatar" style={{ width: 26, height: 26 }}>
                            {inisial(p.nama)}
                          </span>
                          <div>
                            <div className="sel-utama">{p.nama}</div>
                            <div className="sel-sub num">{p.telepon || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="kanan-teks">
                        <span className="num tebal">{angka(p.transaksi)}</span>
                        <div className="sel-sub num">{angka(p.item)} item</div>
                      </td>
                      <td className="kanan-teks">
                        <span className="rp tebal">{rupiah(p.omzet)}</span>
                        <div className="sel-sub rp">
                          {p.transaksi
                            ? `rata ${rupiahSingkat(p.omzet / p.transaksi)}/nota`
                            : 'belum belanja'}
                        </div>
                      </td>
                      <td>
                        {p.terakhir ? (
                          <>
                            <div className="sm num">{tanggal(p.terakhir)}</div>
                            <div className="sel-sub">{waktuRelatif(p.terakhir)}</div>
                          </>
                        ) : (
                          <span className="tersier">—</span>
                        )}
                      </td>
                      <td>
                        <div className="sel-aksi">
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={(e) => {
                              e.stopPropagation()
                              bukaUbah(p)
                            }}
                            aria-label={`Ubah ${p.nama}`}
                          >
                            <Icon nama="ubah" ukuran={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAkanHapus(p)
                            }}
                            aria-label={`Hapus ${p.nama}`}
                          >
                            <Icon nama="sampah" ukuran={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="kartu-daftar">
              {tampil.map((p) => (
                <button
                  type="button"
                  className="daftar-item"
                  key={p.id}
                  onClick={() => setDetailId(p.id)}
                >
                  <div>
                    <div className="daftar-nama">{p.nama}</div>
                    <div className="daftar-meta num">
                      {angka(p.transaksi)} transaksi
                      {p.terakhir ? ` • ${waktuRelatif(p.terakhir)}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="daftar-nilai">{rupiahSingkat(p.omzet)}</div>
                    <div className="daftar-meta daftar-kanan-bawah">total belanja</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
              <Paginasi
                halaman={halamanAman}
                totalData={baris.length}
                perHalaman={PER_HALAMAN}
                onUbah={setHalaman}
              />
            </div>
          </>
        )}
      </Kartu>

      {/* ------------------------- Form pelanggan ------------------------- */}
      <Modal
        buka={modal === 'form'}
        tutup={() => setModal(null)}
        judul={sedangUbah ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}
        ukuran="sm"
        kaki={
          <>
            <button type="button" className="btn" onClick={() => setModal(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-primer kanan" onClick={simpan}>
              <Icon nama="simpan" ukuran={15} />
              {sedangUbah ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Bidang label="Nama" wajib galat={galat.nama} penuh>
            <input
              className="inp"
              data-fokus-awal
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Bu Ningsih"
              aria-invalid={!!galat.nama}
            />
          </Bidang>
          <Bidang label="Telepon" penuh>
            <input
              className="inp"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="mis. 0812-3456-7890"
            />
          </Bidang>
          <Bidang label="Alamat" penuh>
            <textarea
              className="area"
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Alamat pelanggan"
            />
          </Bidang>
          <Bidang label="Catatan" penuh>
            <input
              className="inp"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="mis. langganan warung, ambil tiap Jumat"
            />
          </Bidang>
        </div>
      </Modal>

      {/* --------------------------- Rincian ------------------------------ */}
      <Modal
        buka={!!detail}
        tutup={() => setDetailId(null)}
        judul={detail ? detail.nama : ''}
        keterangan={
          detail
            ? [detail.telepon, detail.alamat].filter(Boolean).join(' • ') ||
              'Rincian belanja pelanggan'
            : ''
        }
        ukuran="lg"
        kaki={
          <>
            {detail ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDetailId(null)
                  bukaUbah(detail)
                }}
              >
                <Icon nama="ubah" ukuran={15} />
                Ubah Data
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primer kanan"
              onClick={() => setDetailId(null)}
            >
              Tutup
            </button>
          </>
        }
      >
        {detail ? <DetailPelanggan pelanggan={detail} /> : null}
      </Modal>

      <Konfirmasi
        buka={!!akanHapus}
        tutup={() => setAkanHapus(null)}
        judul="Hapus pelanggan?"
        bahaya
        labelSetuju="Hapus pelanggan"
        pesan={`"${akanHapus?.nama}" akan dihapus dari master. Riwayat transaksi yang sudah terjadi tetap tersimpan dan tetap bisa dilihat di halaman Penjualan.`}
        onSetuju={() => {
          aksi.hapusPelanggan(akanHapus.id)
          toast.info(`Pelanggan "${akanHapus.nama}" dihapus`)
        }}
      />
    </div>
  )
}

/* ------------------------- Isi rincian pelanggan ------------------------ */

function DetailPelanggan({ pelanggan: p }) {
  const { transaksi } = useStatus()

  const riwayat = useMemo(
    () =>
      transaksi
        .filter((t) => {
          if (p.id && t.pelangganId) return t.pelangganId === p.id
          return (t.pelanggan || '').trim().toLowerCase() === p.nama.toLowerCase()
        })
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)),
    [transaksi, p],
  )

  const produk = useMemo(
    () => produkPelanggan(transaksi, p.id, p.nama),
    [transaksi, p],
  )

  const total = riwayat
    .filter((t) => t.status !== 'void')
    .reduce((a, t) => a + t.total, 0)

  if (!riwayat.length) {
    return (
      <Kosong
        ikon="struk"
        judul="Belum ada riwayat belanja"
        pesan={`${p.nama} tercatat di master, tetapi belum ada transaksi atas nama ini.`}
      />
    )
  }

  return (
    <div className="col g16">
      <div className="detail-kepala">
        <div className="detail-sel">
          <span className="label">Transaksi</span>
          <b className="num">{angka(riwayat.filter((t) => t.status !== 'void').length)}</b>
        </div>
        <div className="detail-sel">
          <span className="label">Total belanja</span>
          <b className="num">{rupiah(total)}</b>
        </div>
        <div className="detail-sel">
          <span className="label">Rata-rata / nota</span>
          <b className="num">
            {rupiah(
              total / Math.max(1, riwayat.filter((t) => t.status !== 'void').length),
            )}
          </b>
        </div>
        <div className="detail-sel">
          <span className="label">Terakhir beli</span>
          <b className="num">{tanggal(riwayat[0].tanggal)}</b>
        </div>
      </div>

      <div>
        <h4 style={{ marginBottom: 8 }}>
          Produk yang dibeli ({angka(produk.length)} jenis)
        </h4>
        <div className="tabel-bungkus">
          <table className="tabel">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="kanan-teks">Qty</th>
                <th className="kanan-teks">Total</th>
                <th>Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {produk.slice(0, 15).map((r) => (
                <tr key={r.produkId}>
                  <td>
                    <div className="sel-utama sm">{r.nama}</div>
                    <div className="sel-sub num">{r.sku}</div>
                  </td>
                  <td className="kanan-teks num tebal">
                    {angka(r.qty)} <span className="xs muted">{r.satuan}</span>
                  </td>
                  <td className="kanan-teks rp">{rupiah(r.omzet)}</td>
                  <td className="sm num muted">{tanggal(r.terakhir)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {produk.length > 15 ? (
          <div className="xs muted" style={{ marginTop: 6 }}>
            +{produk.length - 15} jenis produk lain
          </div>
        ) : null}
      </div>

      <div>
        <h4 style={{ marginBottom: 8 }}>Riwayat transaksi ({angka(riwayat.length)})</h4>
        <div className="tabel-bungkus">
          <table className="tabel">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Tanggal</th>
                <th className="kanan-teks">Item</th>
                <th className="kanan-teks">Total</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.slice(0, 20).map((t) => (
                <tr key={t.id}>
                  <td className="num sm">{t.nomor}</td>
                  <td className="sm num muted">{tanggalJam(t.tanggal)}</td>
                  <td className="kanan-teks num">{angka(t.item.reduce((a, b) => a + b.qty, 0))}</td>
                  <td className="kanan-teks rp tebal">{rupiah(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {riwayat.length > 20 ? (
          <div className="xs muted" style={{ marginTop: 6 }}>
            +{riwayat.length - 20} transaksi lain — lihat selengkapnya di halaman Penjualan.
          </div>
        ) : null}
      </div>
    </div>
  )
}
