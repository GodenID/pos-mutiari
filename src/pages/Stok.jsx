/* =========================================================================
   Stok & Mutasi — posisi persediaan, barang masuk/keluar, stok opname,
   serta riwayat pergerakan stok.
   ========================================================================= */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import {
  BatangStok,
  Bidang,
  InpAngka,
  Kartu,
  Kosong,
  KotakCari,
  Lencana,
  LencanaStok,
  Paginasi,
  Segmen,
  Stat,
  TabBar,
} from '../components/UI.jsx'
import { useAksi, useStatus, useToast } from '../store/konteks.js'
import { nilaiPersediaan, statusStok } from '../lib/analitik.js'
import { angka, jam, rupiah, rupiahSingkat, tanggal, tanggalJam } from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'

const PER_HALAMAN = 12

const SARING_STOK = [
  { id: 'semua', nama: 'Semua' },
  { id: 'menipis', nama: 'Menipis' },
  { id: 'habis', nama: 'Habis' },
]

const TIPE_MUTASI = {
  masuk: { nama: 'Barang masuk', warna: 'hijau', ikon: 'masuk' },
  keluar: { nama: 'Barang keluar', warna: 'kuning', ikon: 'keluar' },
  penjualan: { nama: 'Penjualan', warna: 'biru', ikon: 'kasir' },
  penyesuaian: { nama: 'Penyesuaian', warna: 'netral', ikon: 'sesuai' },
  retur: { nama: 'Retur / batal', warna: 'merah', ikon: 'muat-ulang' },
}

const ALASAN_MASUK = [
  'Pembelian dari supplier',
  'Retur dari pelanggan',
  'Koreksi tambah (temuan)',
  'Transfer dari cabang lain',
]

export default function Stok() {
  const { produk, mutasi } = useStatus()
  const [tab, setTab] = useState('persediaan')

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Stok &amp; Mutasi</h1>
          <p>Pantau persediaan, catat barang masuk/keluar, dan lakukan stok opname</p>
        </div>
      </div>

      <TabBar
        label="Bagian stok"
        nilai={tab}
        onUbah={setTab}
        opsi={[
          { id: 'persediaan', nama: 'Posisi Persediaan', hitung: produk.length },
          { id: 'riwayat', nama: 'Riwayat Mutasi', hitung: mutasi.length },
        ]}
      />

      {tab === 'persediaan' ? <TabPersediaan /> : <TabRiwayat />}
    </div>
  )
}

/* ============================== Persediaan =============================== */

function TabPersediaan() {
  const { produk, kategori } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState('semua')
  const [katPilih, setKatPilih] = useState('semua')
  const [halaman, setHalaman] = useState(1)
  const [mutasiUntuk, setMutasiUntuk] = useState(null)
  const [opnameBuka, setOpnameBuka] = useState(false)

  const persediaan = useMemo(() => nilaiPersediaan(produk), [produk])

  const hitung = useMemo(() => {
    const aktif = produk.filter((p) => p.aktif !== false)
    return {
      habis: aktif.filter((p) => statusStok(p) === 'habis').length,
      menipis: aktif.filter((p) => statusStok(p) === 'menipis').length,
    }
  }, [produk])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return produk
      .filter((p) => {
        if (q && !p.nama.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
          return false
        }
        if (katPilih !== 'semua' && p.kategori !== katPilih) return false
        if (saring !== 'semua' && statusStok(p) !== saring) return false
        return true
      })
      .sort((a, b) => {
        const urutStatus = { habis: 0, menipis: 1, aman: 2 }
        const d = urutStatus[statusStok(a)] - urutStatus[statusStok(b)]
        if (d !== 0) return d
        return a.nama.localeCompare(b.nama, 'id')
      })
  }, [produk, cari, katPilih, saring])

  const halamanAman = Math.min(
    halaman,
    Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN)),
  )
  const tampil = tersaring.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  )

  const eksporCsv = () => {
    unduhCsv(
      `laporan_stok_${stempelFile()}`,
      [
        'Barcode/SKU',
        'Nama Produk',
        'Kategori',
        'Satuan',
        'Stok',
        'Stok Minimum',
        'Status',
        'Harga Beli',
        'Nilai Modal',
        'Harga Jual',
        'Nilai Jual',
      ],
      tersaring.map((p) => [
        p.sku,
        p.nama,
        p.kategori,
        p.satuan,
        p.stok,
        p.stokMin,
        { habis: 'Habis', menipis: 'Menipis', aman: 'Aman' }[statusStok(p)],
        p.hargaBeli,
        p.hargaBeli * p.stok,
        p.hargaJual,
        p.hargaJual * p.stok,
      ]),
      [
        `Laporan Posisi Stok — ${tersaring.length} produk`,
        `Nilai modal total: ${rupiah(persediaan.modal)}`,
        `Dicetak ${tanggalJam(new Date())}`,
      ],
    )
    toast.sukses('Laporan stok diekspor ke CSV')
  }

  return (
    <>
      <div className="grid-stat">
        <Stat
          utama
          label="Nilai persediaan (modal)"
          ikon="dompet"
          nilai={rupiah(persediaan.modal)}
          kaki={`potensi jual ${rupiahSingkat(persediaan.jual)} • laba ${rupiahSingkat(
            persediaan.potensiLaba,
          )}`}
        />
        <Stat
          label="Total unit"
          ikon="gudang"
          nilai={angka(persediaan.unit)}
          kaki={`${angka(persediaan.sku)} SKU`}
        />
        <Stat
          label="Stok menipis"
          ikon="peringatan"
          nilai={angka(hitung.menipis)}
          kaki="di bawah stok minimum"
        />
        <Stat
          label="Stok habis"
          ikon="batal"
          nilai={angka(hitung.habis)}
          kaki="tidak bisa dijual di kasir"
        />
      </div>

      {hitung.habis + hitung.menipis > 0 ? (
        <div className="info-box info-box-kuning">
          <Icon nama="peringatan" ukuran={16} />
          <span>
            <b>{angka(hitung.habis + hitung.menipis)} produk</b> perlu restok.
            Gunakan tombol <b>Masuk</b> pada baris produk untuk mencatat pembelian
            dari supplier.
          </span>
        </div>
      ) : null}

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
            placeholder="Cari produk…"
            className="isi"
            style={{ minWidth: 180 }}
          />
          <select
            className="sel"
            style={{ width: 'auto', minWidth: 150 }}
            value={katPilih}
            onChange={(e) => {
              setKatPilih(e.target.value)
              setHalaman(1)
            }}
            aria-label="Saring kategori"
          >
            <option value="semua">Semua kategori</option>
            {kategori.map((k) => (
              <option key={k.id} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
          <Segmen
            label="Saring status stok"
            opsi={SARING_STOK}
            nilai={saring}
            onUbah={(v) => {
              setSaring(v)
              setHalaman(1)
            }}
          />
          <div className="row g6 kanan">
            <Link to="/supplier" className="btn btn-lunak" title="Catat pembelian dari supplier (menambah stok + riwayat harga)">
              <Icon nama="truk" ukuran={15} />
              <span className="hanya-desktop">Beli dari Supplier</span>
            </Link>
            <button type="button" className="btn" onClick={eksporCsv}>
              <Icon nama="unduh" ukuran={15} />
              <span className="hanya-desktop">Ekspor</span>
            </button>
            <button
              type="button"
              className="btn btn-primer"
              onClick={() => setOpnameBuka(true)}
            >
              <Icon nama="hitung" ukuran={15} />
              Stok Opname
            </button>
          </div>
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="gudang"
            judul="Tidak ada produk"
            pesan="Ubah saringan atau tambahkan produk di halaman Produk."
          />
        ) : (
          <>
            <div className="tabel-bungkus tabel-responsif">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Stok saat ini</th>
                    <th className="kanan-teks">Minimum</th>
                    <th className="kanan-teks">Nilai modal</th>
                    <th>Status</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="sel-utama">{p.nama}</div>
                        <div className="sel-sub num">
                          {p.sku} • {p.kategori}
                        </div>
                      </td>
                      <td>
                        <div className="row g6">
                          <span className="num tebal">{angka(p.stok)}</span>
                          <span className="xs muted">{p.satuan}</span>
                        </div>
                        <div style={{ marginTop: 5 }}>
                          <BatangStok produk={p} />
                        </div>
                      </td>
                      <td className="kanan-teks num muted">{angka(p.stokMin)}</td>
                      <td className="kanan-teks">
                        <span className="rp tebal">{rupiah(p.hargaBeli * p.stok)}</span>
                        <div className="sel-sub rp">@{rupiah(p.hargaBeli)}</div>
                      </td>
                      <td>
                        <LencanaStok produk={p} />
                      </td>
                      <td>
                        <div className="sel-aksi">
                          <button
                            type="button"
                            className="btn btn-sm btn-lunak"
                            onClick={() => setMutasiUntuk({ produk: p, tipe: 'masuk' })}
                          >
                            <Icon nama="masuk" ukuran={13} />
                            Masuk
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setMutasiUntuk({ produk: p, tipe: 'keluar' })}
                          >
                            <Icon nama="keluar" ukuran={13} />
                            Keluar
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
                <div className="daftar-item" key={p.id}>
                  <div>
                    <div className="daftar-nama">{p.nama}</div>
                    <div className="daftar-meta num">
                      stok {angka(p.stok)} {p.satuan} • min {angka(p.stokMin)}
                    </div>
                    <div className="row g6" style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-lunak"
                        onClick={() => setMutasiUntuk({ produk: p, tipe: 'masuk' })}
                      >
                        <Icon nama="masuk" ukuran={13} />
                        Masuk
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setMutasiUntuk({ produk: p, tipe: 'keluar' })}
                      >
                        <Icon nama="keluar" ukuran={13} />
                        Keluar
                      </button>
                    </div>
                  </div>
                  <div>
                    <LencanaStok produk={p} ringkas />
                    <div className="daftar-nilai" style={{ marginTop: 5 }}>
                      {rupiahSingkat(p.hargaBeli * p.stok)}
                    </div>
                  </div>
                </div>
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

      <ModalMutasi
        data={mutasiUntuk}
        tutup={() => setMutasiUntuk(null)}
        onSimpan={async ({ produk: p, tipe, qty, keterangan }) => {
          try {
            const hasil = await aksi.mutasiStok({
              produkId: p.id,
              tipe,
              qty,
              keterangan,
              ref: tipe === 'masuk' ? 'MASUK' : 'KELUAR',
            })
            if (hasil) {
              toast.sukses(
                `${p.nama}: stok ${angka(hasil.stokLama)} → ${angka(hasil.stokBaru)} ${
                  p.satuan
                }`,
              )
            }
          } catch (e) {
            toast.galat(e?.message || 'Gagal mencatat mutasi stok')
          }
          setMutasiUntuk(null)
        }}
      />

      <ModalOpname buka={opnameBuka} tutup={() => setOpnameBuka(false)} />
    </>
  )
}

/* ---------------------------- Modal mutasi stok --------------------------- */

function ModalMutasi({ data, tutup, onSimpan }) {
  const [tipe, setTipe] = useState('masuk')
  const [qty, setQty] = useState('')
  const [alasan, setAlasan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [siap, setSiap] = useState(null)

  // Setel ulang nilai form setiap kali modal dibuka untuk produk lain
  if (data && siap !== data.produk.id + data.tipe) {
    setSiap(data.produk.id + data.tipe)
    setTipe(data.tipe)
    setQty('')
    setAlasan(data.tipe === 'masuk' ? ALASAN_MASUK[0] : '')
    setCatatan('')
  }
  if (!data && siap !== null) setSiap(null)

  if (!data) return null
  const p = data.produk
  const jumlah = Number(qty) || 0
  const stokBaru = tipe === 'masuk' ? p.stok + jumlah : Math.max(0, p.stok - jumlah)
  const berlebihan = tipe === 'keluar' && jumlah > p.stok
  const alasanWajib = tipe === 'keluar' && !alasan.trim()

  return (
    <Modal
      buka={!!data}
      tutup={tutup}
      judul={tipe === 'masuk' ? 'Catat Barang Masuk' : 'Catat Barang Keluar'}
      keterangan={p.nama}
      ukuran="sm"
      kaki={
        <>
          <button type="button" className="btn" onClick={tutup}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primer kanan"
            disabled={jumlah <= 0 || alasanWajib}
            onClick={() =>
              onSimpan({
                produk: p,
                tipe,
                qty: jumlah,
                keterangan:
                  tipe === 'keluar'
                    ? alasan.trim()
                    : [alasan, catatan].filter(Boolean).join(' — '),
              })
            }
          >
            <Icon nama="simpan" ukuran={15} />
            Simpan Mutasi
          </button>
        </>
      }
    >
      <div className="col g12">
        <div className="detail-kepala">
          <div className="detail-sel">
            <span className="label">Stok sekarang</span>
            <b className="num">
              {angka(p.stok)} {p.satuan}
            </b>
          </div>
          <div className="detail-sel">
            <span className="label">Setelah mutasi</span>
            <b className="num" style={{ color: 'var(--g-700)' }}>
              {angka(stokBaru)} {p.satuan}
            </b>
          </div>
          <div className="detail-sel">
            <span className="label">Nilai modal</span>
            <b className="num">{rupiahSingkat(p.hargaBeli * stokBaru)}</b>
          </div>
        </div>

        <Bidang label="Jenis mutasi">
          <Segmen
            label="Jenis mutasi"
            nilai={tipe}
            onUbah={(v) => {
              setTipe(v)
              setAlasan(v === 'masuk' ? ALASAN_MASUK[0] : '')
            }}
            opsi={[
              { id: 'masuk', nama: 'Barang masuk' },
              { id: 'keluar', nama: 'Barang keluar' },
            ]}
          />
        </Bidang>

        <Bidang
          label="Jumlah"
          wajib
          galat={berlebihan ? `Melebihi stok tersedia (${angka(p.stok)})` : undefined}
        >
          <InpAngka
            nilai={qty}
            onUbah={setQty}
            akhiran={p.satuan}
            data-fokus-awal
            placeholder="0"
          />
        </Bidang>

        <Bidang
          label="Alasan"
          wajib={tipe === 'keluar'}
          galat={alasanWajib ? 'Tulis alasannya — mis. dipakai buat client' : undefined}
        >
          {tipe === 'keluar' ? (
            <input
              className="inp"
              data-fokus-awal
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="mis. dipakai buat client"
              aria-invalid={alasanWajib}
            />
          ) : (
            <select
              className="sel"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            >
              {ALASAN_MASUK.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
        </Bidang>

        {tipe === 'masuk' ? (
          <Bidang label="Catatan tambahan" petunjuk="Opsional, mis. nomor nota supplier">
            <input
              className="inp"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. PO-20260916 / Toko Grosir Amanah"
            />
          </Bidang>
        ) : null}
      </div>
    </Modal>
  )
}

/* ------------------------------ Stok opname ------------------------------- */

function ModalOpname({ buka, tutup }) {
  const { produk } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [fisik, setFisik] = useState({})

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return produk
      .filter((p) => (q ? p.nama.toLowerCase().includes(q) : true))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      .slice(0, 60)
  }, [produk, cari])

  const perubahan = Object.entries(fisik)
    .filter(([id, v]) => {
      const p = produk.find((x) => x.id === id)
      return p && v !== '' && Number(v) !== p.stok
    })
    .map(([id, v]) => ({ produkId: id, stokBaru: Number(v) }))

  const selisihNilai = perubahan.reduce((a, c) => {
    const p = produk.find((x) => x.id === c.produkId)
    return a + (c.stokBaru - p.stok) * p.hargaBeli
  }, 0)

  const simpan = async () => {
    try {
      const jumlah = await aksi.opnameStok(perubahan, 'Stok opname')
      if (jumlah) {
        toast.sukses(`${jumlah} produk disesuaikan lewat stok opname`)
      } else {
        toast.info('Tidak ada selisih yang perlu disimpan')
      }
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan stok opname')
    }
    setFisik({})
    tutup()
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Stok Opname"
      keterangan="Masukkan jumlah fisik hasil hitung gudang. Hanya baris yang berbeda akan disesuaikan."
      ukuran="lg"
      kelasIsi="tanpa-jarak"
      kaki={
        <>
          <div className="col">
            <span className="xs muted">
              {perubahan.length
                ? `${perubahan.length} produk akan disesuaikan`
                : 'Belum ada selisih'}
            </span>
            {perubahan.length ? (
              <span
                className={`xs tebal rp ${selisihNilai < 0 ? 'turun' : 'naik'}`}
              >
                Dampak nilai modal: {rupiah(selisihNilai)}
              </span>
            ) : null}
          </div>
          <button type="button" className="btn kanan" onClick={tutup}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primer"
            onClick={simpan}
            disabled={!perubahan.length}
          >
            <Icon nama="simpan" ukuran={15} />
            Simpan Penyesuaian
          </button>
        </>
      }
    >
      <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
        <KotakCari
          nilai={cari}
          onUbah={setCari}
          placeholder="Cari produk yang dihitung…"
        />
      </div>

      <div className="tabel-bungkus" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
        <table className="tabel">
          <thead>
            <tr>
              <th>Produk</th>
              <th className="kanan-teks">Stok sistem</th>
              <th style={{ width: 150 }}>Stok fisik</th>
              <th className="kanan-teks">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((p) => {
              const nilai = fisik[p.id]
              const adaNilai = nilai !== undefined && nilai !== ''
              const selisih = adaNilai ? Number(nilai) - p.stok : 0
              return (
                <tr key={p.id}>
                  <td>
                    <div className="sel-utama">{p.nama}</div>
                    <div className="sel-sub num">{p.sku}</div>
                  </td>
                  <td className="kanan-teks num">
                    {angka(p.stok)} <span className="xs muted">{p.satuan}</span>
                  </td>
                  <td>
                    <InpAngka
                      nilai={nilai === undefined ? '' : nilai}
                      onUbah={(v) => setFisik((f) => ({ ...f, [p.id]: v }))}
                      akhiran={p.satuan}
                      placeholder={String(p.stok)}
                    />
                  </td>
                  <td className="kanan-teks">
                    {adaNilai && selisih !== 0 ? (
                      <Lencana warna={selisih > 0 ? 'hijau' : 'merah'}>
                        {selisih > 0 ? '+' : ''}
                        {angka(selisih)}
                      </Lencana>
                    ) : (
                      <span className="tersier">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/* ============================ Riwayat mutasi ============================= */

function TabRiwayat() {
  const { mutasi } = useStatus()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [tipe, setTipe] = useState('semua')
  const [halaman, setHalaman] = useState(1)

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return mutasi.filter((m) => {
      if (tipe !== 'semua' && m.tipe !== tipe) return false
      if (!q) return true
      return (
        m.nama.toLowerCase().includes(q) ||
        (m.ref || '').toLowerCase().includes(q) ||
        (m.keterangan || '').toLowerCase().includes(q)
      )
    })
  }, [mutasi, cari, tipe])

  const halamanAman = Math.min(
    halaman,
    Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN)),
  )
  const tampil = tersaring.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  )

  const ringkasTipe = useMemo(() => {
    const hasil = { masuk: 0, keluar: 0, penjualan: 0 }
    mutasi.forEach((m) => {
      if (m.tipe === 'masuk') hasil.masuk += m.qty
      else if (m.tipe === 'penjualan') hasil.penjualan += Math.abs(m.qty)
      else if (m.tipe === 'keluar') hasil.keluar += Math.abs(m.qty)
    })
    return hasil
  }, [mutasi])

  const eksporCsv = () => {
    unduhCsv(
      `mutasi_stok_${stempelFile()}`,
      ['Tanggal', 'Jam', 'Produk', 'Jenis', 'Qty', 'Keterangan', 'Referensi', 'Petugas'],
      tersaring.map((m) => [
        tanggal(m.tanggal),
        jam(m.tanggal),
        m.nama,
        TIPE_MUTASI[m.tipe]?.nama || m.tipe,
        m.qty,
        m.keterangan,
        m.ref,
        m.petugas,
      ]),
      [`Riwayat Mutasi Stok — ${tersaring.length} baris`, `Dicetak ${tanggalJam(new Date())}`],
    )
    toast.sukses('Riwayat mutasi diekspor ke CSV')
  }

  return (
    <>
      <div className="grid-stat">
        <Stat
          label="Barang masuk tercatat"
          ikon="masuk"
          nilai={angka(ringkasTipe.masuk)}
          kaki="unit dari pembelian & koreksi"
        />
        <Stat
          label="Terjual"
          ikon="kasir"
          nilai={angka(ringkasTipe.penjualan)}
          kaki="unit keluar lewat kasir"
        />
        <Stat
          label="Barang keluar non-penjualan"
          ikon="keluar"
          nilai={angka(ringkasTipe.keluar)}
          kaki="rusak, hilang, retur supplier"
        />
        <Stat
          label="Total baris mutasi"
          ikon="riwayat"
          nilai={angka(mutasi.length)}
          kaki="seluruh riwayat tersimpan"
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
            placeholder="Cari produk, referensi, atau keterangan…"
            className="isi"
            style={{ minWidth: 200 }}
          />
          <select
            className="sel"
            style={{ width: 'auto', minWidth: 160 }}
            value={tipe}
            onChange={(e) => {
              setTipe(e.target.value)
              setHalaman(1)
            }}
            aria-label="Saring jenis mutasi"
          >
            <option value="semua">Semua jenis</option>
            {Object.entries(TIPE_MUTASI).map(([id, t]) => (
              <option key={id} value={id}>
                {t.nama}
              </option>
            ))}
          </select>
          <button type="button" className="btn kanan" onClick={eksporCsv}>
            <Icon nama="unduh" ukuran={15} />
            <span className="hanya-desktop">Ekspor CSV</span>
          </button>
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="riwayat"
            judul="Belum ada mutasi stok"
            pesan="Setiap penjualan, pembelian, dan penyesuaian akan tercatat di sini."
          />
        ) : (
          <>
            <div className="tabel-bungkus tabel-responsif">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Produk</th>
                    <th>Jenis</th>
                    <th className="kanan-teks">Perubahan</th>
                    <th>Keterangan</th>
                    <th>Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((m) => {
                    const t = TIPE_MUTASI[m.tipe] || {
                      nama: m.tipe,
                      warna: 'netral',
                      ikon: 'sesuai',
                    }
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="sm num">{tanggal(m.tanggal)}</div>
                          <div className="sel-sub num">{jam(m.tanggal)}</div>
                        </td>
                        <td>
                          <div className="sel-utama">{m.nama}</div>
                          {m.ref ? <div className="sel-sub num">{m.ref}</div> : null}
                        </td>
                        <td>
                          <Lencana warna={t.warna} ikon={t.ikon}>
                            {t.nama}
                          </Lencana>
                        </td>
                        <td className="kanan-teks">
                          <span
                            className={`num tebal ${m.qty > 0 ? 'naik' : 'turun'}`}
                          >
                            {m.qty > 0 ? '+' : ''}
                            {angka(m.qty)}
                          </span>
                        </td>
                        <td className="sm muted">{m.keterangan || '—'}</td>
                        <td className="sm muted">{m.petugas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="kartu-daftar">
              {tampil.map((m) => {
                const t = TIPE_MUTASI[m.tipe] || { nama: m.tipe, warna: 'netral' }
                return (
                  <div className="daftar-item" key={m.id}>
                    <div>
                      <div className="daftar-nama">{m.nama}</div>
                      <div className="daftar-meta num">
                        {tanggal(m.tanggal)} {jam(m.tanggal)}
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <Lencana warna={t.warna}>{t.nama}</Lencana>
                      </div>
                    </div>
                    <div>
                      <div
                        className={`daftar-nilai ${m.qty > 0 ? 'naik' : 'turun'}`}
                      >
                        {m.qty > 0 ? '+' : ''}
                        {angka(m.qty)}
                      </div>
                      <div className="daftar-meta daftar-kanan-bawah">{m.petugas}</div>
                    </div>
                  </div>
                )
              })}
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
    </>
  )
}
