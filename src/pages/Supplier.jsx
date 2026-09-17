/* =========================================================================
   Supplier & Pembelian — master pemasok, pesanan pembelian (PO) yang
   menambah stok otomatis, dan riwayat harga beli per produk.
   ========================================================================= */

import { useMemo, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import Modal, { Konfirmasi } from '../components/Modal.jsx'
import PoDokumen from '../components/PoDokumen.jsx'
import {
  Bidang,
  InpAngka,
  InpRupiah,
  Kartu,
  Kosong,
  KotakCari,
  Lencana,
  Paginasi,
  Stat,
  TabBar,
} from '../components/UI.jsx'
import { useAksi, useStatus, useToast } from '../store/konteks.js'
import { riwayatHargaBeli } from '../lib/analitik.js'
import { cetakElemen } from '../lib/cetak.js'

/** Generator PDF dimuat malas — hanya saat pengguna mengunduh (hemat bundle awal) */
async function unduhPoPdfMalas(po, pengaturan, supplier) {
  const modul = await import('../lib/poPdf.js')
  return modul.unduhPoPdf(po, pengaturan, supplier)
}
import {
  angka,
  rupiah,
  rupiahSingkat,
  tanggal,
  tanggalJam,
  waktuRelatif,
} from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'

const PER_HALAMAN = 12

const FORM_SUP_KOSONG = { nama: '', telepon: '', alamat: '', catatan: '' }

export default function Supplier() {
  const { supplier, pembelian } = useStatus()
  const [tab, setTab] = useState('pembelian')

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Supplier &amp; Pembelian</h1>
          <p>
            {angka(supplier.length)} supplier • {angka(pembelian.length)}{' '}
            pesanan pembelian tercatat
          </p>
        </div>
      </div>

      <TabBar
        label="Bagian supplier"
        nilai={tab}
        onUbah={setTab}
        opsi={[
          { id: 'pembelian', nama: 'Pembelian (PO)', hitung: pembelian.length },
          { id: 'supplier', nama: 'Master Supplier', hitung: supplier.length },
          { id: 'harga', nama: 'Riwayat Harga Beli' },
        ]}
      />

      {tab === 'pembelian' ? <TabPembelian /> : null}
      {tab === 'supplier' ? <TabSupplier /> : null}
      {tab === 'harga' ? <TabHarga /> : null}
    </div>
  )
}

/* ================================ Pembelian ============================== */

function TabPembelian() {
  const { pembelian, supplier, pengaturan } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [supPilih, setSupPilih] = useState('semua')
  const [halaman, setHalaman] = useState(1)
  const [formBuka, setFormBuka] = useState(false)
  const [detail, setDetail] = useState(null)
  const acuanCetak = useRef(null)

  const totalBelanja = useMemo(
    () => pembelian.reduce((a, p) => a + p.total, 0),
    [pembelian],
  )
  const totalUnit = useMemo(
    () => pembelian.reduce((a, p) => a + p.item.reduce((x, i) => x + i.qty, 0), 0),
    [pembelian],
  )

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return pembelian.filter((p) => {
      if (supPilih !== 'semua' && p.supplierId !== supPilih && p.supplierNama !== supPilih) {
        return false
      }
      if (!q) return true
      return (
        p.nomor.toLowerCase().includes(q) ||
        p.supplierNama.toLowerCase().includes(q) ||
        p.item.some((i) => i.nama.toLowerCase().includes(q))
      )
    })
  }, [pembelian, cari, supPilih])

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
      `pembelian_${stempelFile()}`,
      ['No. PO', 'Tanggal', 'Supplier', 'Jenis Item', 'Total Qty', 'Total Belanja', 'Petugas'],
      tersaring.map((p) => [
        p.nomor,
        tanggalJam(p.tanggal),
        p.supplierNama,
        p.item.length,
        p.item.reduce((a, b) => a + b.qty, 0),
        p.total,
        p.petugas,
      ]),
      [`Riwayat Pembelian — ${tersaring.length} PO`, `Diekspor ${tanggalJam(new Date())}`],
    )
    toast.sukses('Data pembelian diekspor ke CSV')
  }

  return (
    <>
      <div className="grid-stat">
        <Stat
          utama
          label="Total belanja ke supplier"
          ikon="uang"
          nilai={rupiah(totalBelanja)}
          kaki={`${angka(pembelian.length)} PO tercatat`}
        />
        <Stat
          label="Unit masuk via PO"
          ikon="masuk"
          nilai={angka(totalUnit)}
          kaki="menambah stok otomatis"
        />
        <Stat
          label="Supplier aktif"
          ikon="toko"
          nilai={angka(supplier.length)}
          kaki="di master supplier"
        />
        <Stat
          label="Rata-rata per PO"
          ikon="bagan"
          nilai={rupiah(pembelian.length ? totalBelanja / pembelian.length : 0)}
          kaki="nilai pembelian"
        />
      </div>

      <div className="info-box info-box-hijau">
        <Icon nama="centang-bulat" ukuran={16} />
        <span>
          Menyimpan PO langsung <b>menambah stok</b> tiap produk dan{' '}
          <b>memperbarui harga beli</b> ke rata-rata tertimbang — tercatat di mutasi
          stok dan riwayat harga.
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
            placeholder="Cari no. PO, supplier, atau produk…"
            className="isi"
            style={{ minWidth: 200 }}
          />
          <select
            className="sel"
            style={{ width: 'auto', minWidth: 170 }}
            value={supPilih}
            onChange={(e) => {
              setSupPilih(e.target.value)
              setHalaman(1)
            }}
            aria-label="Saring supplier"
          >
            <option value="semua">Semua supplier</option>
            {supplier.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
          <div className="row g6 kanan">
            <button type="button" className="btn" onClick={eksporCsv}>
              <Icon nama="unduh" ukuran={15} />
              <span className="hanya-desktop">Ekspor</span>
            </button>
            <button
              type="button"
              className="btn btn-primer"
              onClick={() => setFormBuka(true)}
            >
              <Icon nama="tambah" ukuran={15} />
              Buat Pembelian
            </button>
          </div>
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="masuk"
            judul={pembelian.length ? 'Tidak ada PO yang cocok' : 'Belum ada pembelian'}
            pesan={
              pembelian.length
                ? 'Ubah kata kunci atau saringan supplier.'
                : 'Catat pembelian pertama agar stok bertambah dan harga beli terlacak.'
            }
            aksi={
              pembelian.length ? null : (
                <button
                  type="button"
                  className="btn btn-primer"
                  onClick={() => setFormBuka(true)}
                >
                  <Icon nama="tambah" ukuran={15} />
                  Buat Pembelian Pertama
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
                    <th>No. PO</th>
                    <th>Tanggal</th>
                    <th>Supplier</th>
                    <th className="kanan-teks">Item</th>
                    <th className="kanan-teks">Total</th>
                    <th>Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setDetail(p)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setDetail(p)
                      }}
                    >
                      <td className="sel-utama num sm">{p.nomor}</td>
                      <td>
                        <div className="sm num">{tanggal(p.tanggal)}</div>
                        <div className="sel-sub">{waktuRelatif(p.tanggal)}</div>
                      </td>
                      <td className="sm">{p.supplierNama}</td>
                      <td className="kanan-teks">
                        <span className="num">{angka(p.item.length)}</span>
                        <div className="sel-sub num">
                          {angka(p.item.reduce((a, b) => a + b.qty, 0))} unit
                        </div>
                      </td>
                      <td className="kanan-teks rp tebal">{rupiah(p.total)}</td>
                      <td className="sm muted">{p.petugas}</td>
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
                  onClick={() => setDetail(p)}
                >
                  <div>
                    <div className="daftar-nama num">{p.nomor}</div>
                    <div className="daftar-meta">
                      {p.supplierNama} • {tanggal(p.tanggal)}
                    </div>
                  </div>
                  <div>
                    <div className="daftar-nilai">{rupiahSingkat(p.total)}</div>
                    <div className="daftar-meta daftar-kanan-bawah num">
                      {angka(p.item.length)} jenis
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

      <ModalFormPO
        buka={formBuka}
        tutup={() => setFormBuka(false)}
        onSimpan={async (data) => {
          let po = null
          try {
            po = await aksi.simpanPembelian(data)
          } catch (e) {
            toast.galat(e?.message || 'Gagal menyimpan pembelian')
            return
          }
          if (po) {
            const sup = supplier.find((s) => s.id === po.supplierId) || null
            try {
              await unduhPoPdfMalas(po, pengaturan, sup)
            } catch {
              toast.galat('PO tersimpan, tetapi PDF gagal dibuat')
              setFormBuka(false)
              return
            }
            toast.sukses(
              `${po.nomor} tersimpan — PDF otomatis terunduh, stok +${angka(
                po.item.reduce((a, b) => a + b.qty, 0),
              )} unit, harga beli diperbarui`,
            )
            setFormBuka(false)
          } else {
            toast.galat('Lengkapi supplier dan minimal 1 baris barang')
          }
        }}
      />

      <Modal
        buka={!!detail}
        tutup={() => setDetail(null)}
        judul={detail ? `PO ${detail.nomor}` : ''}
        keterangan={
          detail
            ? `${detail.supplierNama} • ${tanggalJam(detail.tanggal)} • ${detail.petugas}`
            : ''
        }
        ukuran="lg"
        kaki={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => cetakElemen(acuanCetak.current, 'lembar', `PO ${detail?.nomor || ''}`)}
            >
              <Icon nama="cetak" ukuran={15} />
              Cetak
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const sup = supplier.find((s) => s.id === detail.supplierId) || null
                try {
                  await unduhPoPdfMalas(detail, pengaturan, sup)
                  toast.sukses(`PDF ${detail.nomor} terunduh`)
                } catch {
                  toast.galat('PDF gagal dibuat')
                }
              }}
            >
              <Icon nama="unduh" ukuran={15} />
              Unduh PDF
            </button>
            <button
              type="button"
              className="btn btn-primer kanan"
              onClick={() => setDetail(null)}
            >
              Tutup
            </button>
          </>
        }
      >
        {detail ? (
          <div className="dok-po-panggung">
            <PoDokumen
              po={detail}
              pengaturan={pengaturan}
              supplier={supplier.find((s) => s.id === detail.supplierId) || null}
              ref={acuanCetak}
            />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

/* ------------------------------ Form PO -------------------------------- */

function ModalFormPO({ buka, tutup, onSimpan }) {
  const { produk, supplier } = useStatus()

  const [supplierId, setSupplierId] = useState('')
  const [baris, setBaris] = useState([{ produkId: '', qty: '', hargaBeli: '' }])
  const [keterangan, setKeterangan] = useState('')

  const produkAktif = useMemo(
    () => produk.filter((p) => p.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [produk],
  )

  // Setel ulang tiap dibuka
  const [siap, setSiap] = useState(false)
  if (buka && !siap) {
    setSiap(true)
    setSupplierId(supplier[0]?.id || '')
    setBaris([{ produkId: '', qty: '', hargaBeli: '' }])
    setKeterangan('')
  }
  if (!buka && siap) setSiap(false)

  const petaProduk = useMemo(() => new Map(produk.map((p) => [p.id, p])), [produk])

  const pilihProduk = (indeks, produkId) => {
    const p = petaProduk.get(produkId)
    setBaris((daftar) =>
      daftar.map((b, i) =>
        i === indeks
          ? { ...b, produkId, hargaBeli: p ? p.hargaBeli : b.hargaBeli }
          : b,
      ),
    )
  }

  const total = baris.reduce(
    (a, b) => a + (Number(b.qty) || 0) * (Number(b.hargaBeli) || 0),
    0,
  )
  const valid =
    supplierId &&
    baris.some((b) => b.produkId && Number(b.qty) > 0)

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Buat Pembelian (PO)"
      keterangan="Stok bertambah & harga beli diperbarui saat disimpan"
      ukuran="lg"
      kaki={
        <>
          <button type="button" className="btn" onClick={tutup}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primer kanan"
            disabled={!valid}
            onClick={() =>
              onSimpan({
                supplierId,
                item: baris
                  .filter((b) => b.produkId && Number(b.qty) > 0)
                  .map((b) => ({
                    produkId: b.produkId,
                    qty: Number(b.qty),
                    hargaBeli: Number(b.hargaBeli) || 0,
                  })),
                keterangan,
              })
            }
          >
            <Icon nama="simpan" ukuran={15} />
            Simpan PO • {rupiah(total)}
          </button>
        </>
      }
    >
      <div className="col g14">
        <div className="form-grid">
          <Bidang
            label="Supplier"
            wajib
            penuh
            petunjuk={
              supplier.length
                ? undefined
                : 'Belum ada supplier — daftarkan dulu di tab Master Supplier'
            }
          >
            <select
              className="sel"
              data-fokus-awal
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— pilih supplier —</option>
              {supplier.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </Bidang>
          <Bidang label="Keterangan" penuh petunjuk="Opsional, mis. no. faktur supplier">
            <input
              className="inp"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="mis. Faktur F-8821, tempo 7 hari"
            />
          </Bidang>
        </div>

        <div className="col g8">
          {baris.map((b, i) => {
            const p = petaProduk.get(b.produkId)
            return (
              <div className="po-baris" key={i}>
                <select
                  className="sel isi"
                  value={b.produkId}
                  onChange={(e) => pilihProduk(i, e.target.value)}
                  aria-label={`Produk baris ${i + 1}`}
                >
                  <option value="">— pilih produk —</option>
                  {produkAktif.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nama} (stok {x.stok})
                    </option>
                  ))}
                </select>
                <div style={{ width: 110, flex: 'none' }}>
                  <InpAngka
                    nilai={b.qty}
                    onUbah={(v) => setBaris((d) => d.map((r, j) => (j === i ? { ...r, qty: v } : r)))}
                    akhiran={p?.satuan || 'qty'}
                    placeholder="0"
                  />
                </div>
                <div style={{ width: 160, flex: 'none' }}>
                  <InpRupiah
                    nilai={b.hargaBeli}
                    onUbah={(v) => setBaris((d) => d.map((r, j) => (j === i ? { ...r, hargaBeli: v } : r)))}
                    placeholder="Harga beli"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-hantu btn-sm btn-ikon"
                  onClick={() =>
                    setBaris((d) => (d.length <= 1 ? d : d.filter((_, j) => j !== i)))
                  }
                  aria-label={`Hapus baris ${i + 1}`}
                  style={{ flex: 'none' }}
                >
                  <Icon nama="sampah" ukuran={14} />
                </button>
              </div>
            )
          })}
        </div>

        <div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setBaris((d) => [...d, { produkId: '', qty: '', hargaBeli: '' }])}
          >
            <Icon nama="tambah" ukuran={14} />
            Tambah baris
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------------------- Master supplier --------------------------- */

function TabSupplier() {
  const { supplier, pembelian } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [cari, setCari] = useState('')
  const [modal, setModal] = useState(false)
  const [sedangUbah, setSedangUbah] = useState(null)
  const [form, setForm] = useState(FORM_SUP_KOSONG)
  const [galat, setGalat] = useState({})
  const [akanHapus, setAkanHapus] = useState(null)

  const statSup = useMemo(() => {
    const peta = new Map()
    pembelian.forEach((po) => {
      const kunci = po.supplierId || po.supplierNama
      const s = peta.get(kunci) || { po: 0, total: 0 }
      s.po += 1
      s.total += po.total
      peta.set(kunci, s)
    })
    return peta
  }, [pembelian])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return supplier.filter((s) => {
      if (!q) return true
      return (
        s.nama.toLowerCase().includes(q) ||
        (s.telepon || '').toLowerCase().includes(q)
      )
    })
  }, [supplier, cari])

  function bukaTambah() {
    setSedangUbah(null)
    setForm(FORM_SUP_KOSONG)
    setGalat({})
    setModal(true)
  }

  function bukaUbah(s) {
    setSedangUbah(s)
    setForm({ nama: s.nama, telepon: s.telepon || '', alamat: s.alamat || '', catatan: s.catatan || '' })
    setGalat({})
    setModal(true)
  }

  async function simpan() {
    const g = {}
    if (!form.nama.trim()) g.nama = 'Nama supplier wajib diisi'
    setGalat(g)
    if (Object.keys(g).length) return
    try {
      if (sedangUbah) {
        await aksi.ubahSupplier(sedangUbah.id, form)
        toast.sukses('Supplier diperbarui')
      } else {
        await aksi.tambahSupplier(form)
        toast.sukses(`Supplier "${form.nama.trim()}" ditambahkan`)
      }
      setModal(false)
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan supplier')
    }
  }

  return (
    <>
      <Kartu rapat>
        <div
          className="alat-baris"
          style={{ padding: 12, borderBottom: '1px solid var(--line)' }}
        >
          <KotakCari
            nilai={cari}
            onUbah={setCari}
            placeholder="Cari supplier…"
            className="isi"
            style={{ minWidth: 200 }}
          />
          <button type="button" className="btn btn-primer kanan" onClick={bukaTambah}>
            <Icon nama="tambah" ukuran={15} />
            Tambah Supplier
          </button>
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="toko"
            judul="Belum ada supplier"
            pesan="Daftarkan pemasok agar pembelian tercatat rapi per supplier."
            aksi={
              supplier.length ? null : (
                <button type="button" className="btn btn-primer" onClick={bukaTambah}>
                  <Icon nama="tambah" ukuran={15} />
                  Tambah Supplier
                </button>
              )
            }
          />
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Kontak</th>
                  <th className="kanan-teks">PO</th>
                  <th className="kanan-teks">Total belanja</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {tersaring.map((s) => {
                  const st = statSup.get(s.id) || statSup.get(s.nama) || { po: 0, total: 0 }
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="sel-utama">{s.nama}</div>
                        <div className="sel-sub">{s.alamat || s.catatan || '—'}</div>
                      </td>
                      <td className="sm num muted">{s.telepon || '—'}</td>
                      <td className="kanan-teks num tebal">{angka(st.po)}</td>
                      <td className="kanan-teks rp">{rupiah(st.total)}</td>
                      <td>
                        <div className="sel-aksi">
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={() => bukaUbah(s)}
                            aria-label={`Ubah ${s.nama}`}
                          >
                            <Icon nama="ubah" ukuran={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={() => setAkanHapus(s)}
                            aria-label={`Hapus ${s.nama}`}
                          >
                            <Icon nama="sampah" ukuran={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>

      <Modal
        buka={modal}
        tutup={() => setModal(false)}
        judul={sedangUbah ? 'Ubah Supplier' : 'Tambah Supplier'}
        ukuran="sm"
        kaki={
          <>
            <button type="button" className="btn" onClick={() => setModal(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-primer kanan" onClick={simpan}>
              <Icon nama="simpan" ukuran={15} />
              {sedangUbah ? 'Simpan Perubahan' : 'Simpan Supplier'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Bidang label="Nama supplier" wajib galat={galat.nama} penuh>
            <input
              className="inp"
              data-fokus-awal
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Toko Grosir Amanah"
              aria-invalid={!!galat.nama}
            />
          </Bidang>
          <Bidang label="Telepon" penuh>
            <input
              className="inp"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="022-xxxxxxx / 08xx"
            />
          </Bidang>
          <Bidang label="Alamat" penuh>
            <textarea
              className="area"
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            />
          </Bidang>
          <Bidang label="Catatan" penuh>
            <input
              className="inp"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="mis. tempo 7 hari, khusus sembako"
            />
          </Bidang>
        </div>
      </Modal>

      <Konfirmasi
        buka={!!akanHapus}
        tutup={() => setAkanHapus(null)}
        judul="Hapus supplier?"
        bahaya
        labelSetuju="Hapus supplier"
        pesan={`"${akanHapus?.nama}" akan dihapus dari master. Riwayat PO yang sudah tercatat tetap tersimpan.`}
        onSetuju={async () => {
          try {
            await aksi.hapusSupplier(akanHapus.id)
            toast.info(`Supplier "${akanHapus.nama}" dihapus`)
          } catch (e) {
            toast.galat(e?.message || 'Gagal menghapus supplier')
          }
          setAkanHapus(null)
        }}
      />
    </>
  )
}

/* ----------------------------- Riwayat harga ---------------------------- */

function TabHarga() {
  const { produk, pembelian } = useStatus()
  const [produkId, setProdukId] = useState('')
  const [cari, setCari] = useState('')

  const daftarProduk = useMemo(
    () =>
      produk
        .filter((p) => {
          const q = cari.trim().toLowerCase()
          if (!q) return true
          return p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        })
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
        .slice(0, 80),
    [produk, cari],
  )

  const terpilih = produk.find((p) => p.id === produkId) || null
  const riwayat = useMemo(
    () => (produkId ? riwayatHargaBeli(pembelian, produkId) : []),
    [pembelian, produkId],
  )

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <Kartu judul="Pilih produk" rapat>
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <KotakCari nilai={cari} onUbah={setCari} placeholder="Cari produk…" />
        </div>
        <div className="tabel-bungkus" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="tabel tabel-klik">
            <tbody>
              {daftarProduk.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setProdukId(p.id)}
                  style={p.id === produkId ? { background: 'var(--g-50)' } : undefined}
                >
                  <td>
                    <div className="sel-utama sm">{p.nama}</div>
                    <div className="sel-sub num">{p.sku}</div>
                  </td>
                  <td className="kanan-teks">
                    <div className="rp sm tebal">{rupiah(p.hargaBeli)}</div>
                    <div className="sel-sub">stok {angka(p.stok)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>

      <Kartu
        judul={terpilih ? `Riwayat harga — ${terpilih.nama}` : 'Riwayat harga beli'}
        sub={
          terpilih
            ? `Harga beli saat ini ${rupiah(terpilih.hargaBeli)} • harga jual ${rupiah(terpilih.hargaJual)}`
            : 'Pilih produk di sebelah kiri'
        }
        rapat
      >
        {!terpilih ? (
          <Kosong ikon="riwayat" judul="Belum ada produk dipilih" />
        ) : riwayat.length === 0 ? (
          <Kosong
            ikon="riwayat"
            judul="Belum ada riwayat pembelian"
            pesan="Buat PO di tab Pembelian — setiap pembelian tercatat di sini sebagai jejak harga."
          />
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. PO</th>
                  <th>Supplier</th>
                  <th className="kanan-teks">Qty</th>
                  <th className="kanan-teks">Harga beli</th>
                  <th className="kanan-teks">Tren</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r, i) => {
                  const sebelum = riwayat[i + 1]?.hargaBeli
                  const selisih = sebelum == null ? 0 : r.hargaBeli - sebelum
                  return (
                    <tr key={`${r.nomor}-${i}`}>
                      <td className="sm num">{tanggal(r.tanggal)}</td>
                      <td className="num sm">{r.nomor}</td>
                      <td className="sm">{r.supplier}</td>
                      <td className="kanan-teks num">{angka(r.qty)}</td>
                      <td className="kanan-teks rp tebal">{rupiah(r.hargaBeli)}</td>
                      <td className="kanan-teks">
                        {sebelum == null ? (
                          <Lencana warna="netral">awal</Lencana>
                        ) : selisih > 0 ? (
                          <span className="turun num sm">▲ {rupiahSingkat(selisih)}</span>
                        ) : selisih < 0 ? (
                          <span className="naik num sm">▼ {rupiahSingkat(-selisih)}</span>
                        ) : (
                          <span className="tersier">=</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>
    </div>
  )
}
