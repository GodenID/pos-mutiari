/* =========================================================================
   Produk — daftar barang, harga, margin, dan kategori
   ========================================================================= */

import { useMemo, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import Modal, { Konfirmasi } from '../components/Modal.jsx'
import {
  BatangStok,
  Bidang,
  InpAngka,
  InpRupiah,
  InfoBox,
  Kartu,
  Kosong,
  KotakCari,
  Lencana,
  LencanaStok,
  Paginasi,
  Sakelar,
  Segmen,
  Stat,
  ThUrut,
} from '../components/UI.jsx'
import { useAksi, useStatus, useToast } from '../store/konteks.js'
import { api } from '../lib/api.js'
import { marginProduk, nilaiPersediaan, statusStok } from '../lib/analitik.js'
import { SATUAN } from '../data/seed.js'
import { angka, keAngka, persen, rupiah, rupiahSingkat, tanggalJam } from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'
import {
  bacaFileProduk,
  unduhTemplateCsv,
  unduhTemplateExcel,
  validasiBarisImpor,
} from '../lib/impor.js'

const PER_HALAMAN = 12

const SARINGAN = [
  { id: 'semua', nama: 'Semua' },
  { id: 'aktif', nama: 'Dijual' },
  { id: 'nonaktif', nama: 'Nonaktif' },
  { id: 'menipis', nama: 'Perlu restok' },
]

const FORM_KOSONG = {
  nama: '',
  sku: '',
  kategori: '',
  satuan: 'pcs',
  hargaBeli: '',
  hargaJual: '',
  stok: '',
  stokMin: '',
  aktif: true,
  gambarUrl: '',
  gambarKey: '',
}

export default function Produk() {
  const { produk, kategori, satuan } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const daftarSatuan = (satuan?.length ? satuan.map((s) => s.nama) : SATUAN)

  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState('semua')
  const [katPilih, setKatPilih] = useState('semua')
  const [urut, setUrut] = useState({ kunci: 'nama', arah: 'naik' })
  const [halaman, setHalaman] = useState(1)

  const [modal, setModal] = useState(null) // 'form' | 'kategori' | 'satuan'
  const [imporBuka, setImporBuka] = useState(false)
  const [sedangUbah, setSedangUbah] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [galat, setGalat] = useState({})
  const [akanHapus, setAkanHapus] = useState(null)
  const [unggahFoto, setUnggahFoto] = useState(false)
  const [cropFile, setCropFile] = useState(null) // { file, url } — dipilih, belum diunggah

  function pilihFoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.galat('Format foto harus JPG, PNG, atau WebP')
      return
    }
    setCropFile({ file, url: URL.createObjectURL(file) })
  }

  function tutupCrop() {
    if (cropFile?.url) URL.revokeObjectURL(cropFile.url)
    setCropFile(null)
  }

  async function unggahHasilCrop(file) {
    if (file.size > 2 * 1024 * 1024) {
      toast.galat('Hasil potongan melebihi 2 MB — coba lagi')
      return
    }
    tutupCrop()
    setUnggahFoto(true)
    try {
      const pre = await api.presignUnggah(file.name, file.type, file.size)
      await api.unggahKeS3(pre.uploadUrl, file)
      setForm((f) => ({ ...f, gambarUrl: pre.publicUrl, gambarKey: pre.key }))
      toast.sukses('Foto terunggah — jangan lupa Simpan Produk')
    } catch (err) {
      toast.galat(err?.message || 'Gagal mengunggah foto')
    } finally {
      setUnggahFoto(false)
    }
  }

  const persediaan = useMemo(() => nilaiPersediaan(produk), [produk])
  const jumlahRestok = useMemo(
    () => produk.filter((p) => p.aktif !== false && statusStok(p) !== 'aman').length,
    [produk],
  )

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    let hasil = produk.filter((p) => {
      if (q && !p.nama.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
        return false
      }
      if (katPilih !== 'semua' && p.kategori !== katPilih) return false
      if (saring === 'aktif' && p.aktif === false) return false
      if (saring === 'nonaktif' && p.aktif !== false) return false
      if (saring === 'menipis' && statusStok(p) === 'aman') return false
      return true
    })

    const arah = urut.arah === 'naik' ? 1 : -1
    hasil = [...hasil].sort((a, b) => {
      switch (urut.kunci) {
        case 'kategori':
          return a.kategori.localeCompare(b.kategori, 'id') * arah
        case 'hargaJual':
          return (a.hargaJual - b.hargaJual) * arah
        case 'stok':
          return (a.stok - b.stok) * arah
        case 'margin':
          return (marginProduk(a) - marginProduk(b)) * arah
        case 'nilai':
          return (a.hargaBeli * a.stok - b.hargaBeli * b.stok) * arah
        default:
          return a.nama.localeCompare(b.nama, 'id') * arah
      }
    })
    return hasil
  }, [produk, cari, katPilih, saring, urut])

  const halamanAman = Math.min(
    halaman,
    Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN)),
  )
  const tampil = tersaring.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  )

  const gantiUrut = (kunci) => {
    setUrut((u) =>
      u.kunci === kunci
        ? { kunci, arah: u.arah === 'naik' ? 'turun' : 'naik' }
        : { kunci, arah: kunci === 'nama' || kunci === 'kategori' ? 'naik' : 'turun' },
    )
  }

  /* ------------------------------ Form ------------------------------ */

  function bukaTambah() {
    setSedangUbah(null)
    setForm({
      ...FORM_KOSONG,
      kategori: kategori[0]?.nama || '',
      satuan: satuan?.[0]?.nama || 'pcs',
    })
    setGalat({})
    setModal('form')
  }

  function bukaUbah(p) {
    setSedangUbah(p)
    setForm({
      nama: p.nama,
      sku: p.sku,
      kategori: p.kategori,
      satuan: p.satuan,
      hargaBeli: p.hargaBeli,
      hargaJual: p.hargaJual,
      stok: p.stok,
      stokMin: p.stokMin,
      aktif: p.aktif !== false,
      gambarUrl: p.gambarUrl || '',
      gambarKey: p.gambarKey || '',
    })
    setGalat({})
    setModal('form')
  }

  function validasi() {
    const g = {}
    if (!form.nama.trim()) g.nama = 'Nama produk wajib diisi'
    if (!form.kategori) g.kategori = 'Pilih kategori'
    if (!form.hargaJual || Number(form.hargaJual) <= 0) {
      g.hargaJual = 'Harga jual harus lebih dari 0'
    }
    if (
      form.hargaBeli !== '' &&
      Number(form.hargaBeli) > Number(form.hargaJual || 0)
    ) {
      g.hargaBeli = 'Harga beli melebihi harga jual — margin akan negatif'
    }
    const skuBersih = form.sku.trim()
    if (skuBersih) {
      const bentrok = produk.find(
        (p) => p.sku === skuBersih && p.id !== sedangUbah?.id,
      )
      if (bentrok) g.sku = `Barcode sudah dipakai produk "${bentrok.nama}"`
    }
    setGalat(g)
    return Object.keys(g).filter((k) => k !== 'hargaBeli').length === 0
  }

  async function simpan() {
    if (!validasi()) return
    const data = {
      ...form,
      hargaBeli: Number(form.hargaBeli) || 0,
      hargaJual: Number(form.hargaJual) || 0,
      stok: form.stok === '' ? 0 : Number(form.stok),
      stokMin: form.stokMin === '' ? 0 : Number(form.stokMin),
    }
    try {
      if (sedangUbah) {
        await aksi.ubahProduk(sedangUbah.id, data)
        toast.sukses(`Produk "${data.nama}" diperbarui`)
      } else {
        await aksi.tambahProduk(data)
        toast.sukses(`Produk "${data.nama}" ditambahkan`)
      }
      setModal(null)
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan produk')
    }
  }

  function eksporCsv() {
    unduhCsv(
      `produk_${stempelFile()}`,
      [
        'Barcode/SKU',
        'Nama Produk',
        'Kategori',
        'Satuan',
        'Harga Beli',
        'Harga Jual',
        'Margin %',
        'Stok',
        'Stok Minimum',
        'Nilai Modal',
        'Status',
      ],
      tersaring.map((p) => [
        p.sku,
        p.nama,
        p.kategori,
        p.satuan,
        p.hargaBeli,
        p.hargaJual,
        Number(marginProduk(p).toFixed(1)),
        p.stok,
        p.stokMin,
        p.hargaBeli * p.stok,
        p.aktif === false ? 'Nonaktif' : 'Dijual',
      ]),
      [`Daftar Produk — ${tersaring.length} data`, `Diekspor ${tanggalJam(new Date())}`],
    )
    toast.sukses('Data produk diekspor ke CSV')
  }

  const marginForm =
    form.hargaJual > 0
      ? ((Number(form.hargaJual) - Number(form.hargaBeli || 0)) /
          Number(form.hargaJual)) *
        100
      : 0

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Produk</h1>
          <p>
            {angka(produk.length)} produk terdaftar • nilai persediaan{' '}
            {rupiah(persediaan.modal)}
          </p>
        </div>
        <div className="row g6 wrap">
          <button type="button" className="btn" onClick={() => setModal('kategori')}>
            <Icon nama="label" ukuran={15} />
            Kategori
          </button>
          <button type="button" className="btn" onClick={() => setImporBuka(true)}>
            <Icon nama="masuk" ukuran={15} />
            <span className="hanya-desktop">Impor</span>
          </button>
          <button type="button" className="btn" onClick={eksporCsv}>
            <Icon nama="unduh" ukuran={15} />
            <span className="hanya-desktop">Ekspor CSV</span>
          </button>
          <button type="button" className="btn btn-primer" onClick={bukaTambah}>
            <Icon nama="tambah" ukuran={15} />
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="grid-stat">
        <Stat
          label="Total SKU"
          ikon="kotak"
          nilai={angka(persediaan.sku)}
          kaki={`${angka(produk.filter((p) => p.aktif !== false).length)} aktif dijual`}
        />
        <Stat
          label="Unit di gudang"
          ikon="gudang"
          nilai={angka(persediaan.unit)}
          kaki="seluruh satuan produk"
        />
        <Stat
          label="Nilai modal"
          ikon="dompet"
          nilai={rupiah(persediaan.modal)}
          kaki={`potensi jual ${rupiahSingkat(persediaan.jual)}`}
        />
        <Stat
          label="Perlu restok"
          ikon="peringatan"
          nilai={angka(jumlahRestok)}
          kaki="stok habis atau di bawah minimum"
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
            placeholder="Cari nama produk atau barcode…"
            className="isi"
            style={{ minWidth: 200 }}
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
            label="Saring status"
            opsi={SARINGAN}
            nilai={saring}
            onUbah={(v) => {
              setSaring(v)
              setHalaman(1)
            }}
          />
        </div>

        {tersaring.length === 0 ? (
          <Kosong
            ikon="kotak"
            judul={produk.length ? 'Tidak ada produk yang cocok' : 'Belum ada produk'}
            pesan={
              produk.length
                ? 'Ubah kata kunci atau saringan untuk melihat produk lain.'
                : 'Mulai dengan menambahkan produk pertama Anda.'
            }
            aksi={
              produk.length ? null : (
                <button type="button" className="btn btn-primer" onClick={bukaTambah}>
                  <Icon nama="tambah" ukuran={15} />
                  Tambah Produk
                </button>
              )
            }
          />
        ) : (
          <>
            {/* -------------------- Tabel (desktop) -------------------- */}
            <div className="tabel-bungkus tabel-responsif">
              <table className="tabel">
                <thead>
                  <tr>
                    <ThUrut kunci="nama" urut={urut} onUrut={gantiUrut}>
                      Produk
                    </ThUrut>
                    <ThUrut kunci="kategori" urut={urut} onUrut={gantiUrut}>
                      Kategori
                    </ThUrut>
                    <ThUrut kunci="hargaJual" urut={urut} onUrut={gantiUrut} kanan>
                      Harga jual
                    </ThUrut>
                    <th className="kanan-teks">Harga beli</th>
                    <ThUrut kunci="margin" urut={urut} onUrut={gantiUrut} kanan>
                      Margin
                    </ThUrut>
                    <ThUrut kunci="stok" urut={urut} onUrut={gantiUrut}>
                      Stok
                    </ThUrut>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="row g6" style={{ alignItems: 'center' }}>
                          {p.gambarUrl ? (
                            <img
                              src={p.gambarUrl}
                              alt=""
                              loading="lazy"
                              className="produk-thumb"
                            />
                          ) : null}
                          <div>
                            <div className="row g6">
                              <span className="sel-utama">{p.nama}</span>
                              {p.aktif === false ? (
                                <Lencana warna="netral">Nonaktif</Lencana>
                              ) : null}
                            </div>
                            <div className="sel-sub num">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sm">{p.kategori}</span>
                        <div className="sel-sub">per {p.satuan}</div>
                      </td>
                      <td className="kanan-teks rp tebal">{rupiah(p.hargaJual)}</td>
                      <td className="kanan-teks rp muted">{rupiah(p.hargaBeli)}</td>
                      <td className="kanan-teks">
                        <span
                          className={`rp ${marginProduk(p) < 0 ? 'turun' : 'naik'}`}
                        >
                          {persen(marginProduk(p), 1)}
                        </span>
                        <div className="sel-sub rp">
                          {rupiah(p.hargaJual - p.hargaBeli)}
                        </div>
                      </td>
                      <td>
                        <div className="row g6">
                          <span className="num tebal">{angka(p.stok)}</span>
                          <LencanaStok produk={p} ringkas />
                        </div>
                        <div style={{ marginTop: 5 }}>
                          <BatangStok produk={p} />
                        </div>
                      </td>
                      <td>
                        <div className="sel-aksi">
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={() => bukaUbah(p)}
                            aria-label={`Ubah ${p.nama}`}
                            title="Ubah produk"
                          >
                            <Icon nama="ubah" ukuran={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={async () => {
                              try {
                                await aksi.setAktifProduk(p.id, p.aktif === false)
                                toast.info(
                                  `${p.nama} ${
                                    p.aktif === false ? 'diaktifkan' : 'dinonaktifkan'
                                  }`,
                                )
                              } catch (e) {
                                toast.galat(e?.message || 'Gagal mengubah status')
                              }
                            }}
                            aria-label={`${
                              p.aktif === false ? 'Aktifkan' : 'Nonaktifkan'
                            } ${p.nama}`}
                            title={
                              p.aktif === false
                                ? 'Aktifkan (tampil di kasir)'
                                : 'Nonaktifkan (sembunyikan dari kasir)'
                            }
                          >
                            <Icon nama={p.aktif === false ? 'mata' : 'batal'} ukuran={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ikon btn-hantu"
                            onClick={() => setAkanHapus(p)}
                            aria-label={`Hapus ${p.nama}`}
                            title="Hapus produk"
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

            {/* -------------------- Kartu (mobile) --------------------- */}
            <div className="kartu-daftar">
              {tampil.map((p) => (
                <button
                  type="button"
                  className="daftar-item"
                  key={p.id}
                  onClick={() => bukaUbah(p)}
                >
                  <div>
                    <div className="row g6" style={{ alignItems: 'center' }}>
                      {p.gambarUrl ? (
                        <img
                          src={p.gambarUrl}
                          alt=""
                          loading="lazy"
                          className="produk-thumb"
                        />
                      ) : null}
                      <div className="daftar-nama">{p.nama}</div>
                    </div>
                    <div className="daftar-meta num">
                      {p.sku} • {p.kategori}
                    </div>
                    <div className="row g6" style={{ marginTop: 5 }}>
                      <LencanaStok produk={p} ringkas />
                      <span className="xs tersier num">
                        stok {angka(p.stok)} {p.satuan}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="daftar-nilai">{rupiah(p.hargaJual)}</div>
                    <div className="daftar-meta daftar-kanan-bawah">
                      margin {persen(marginProduk(p), 0)}
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

      {/* ========================= Modal produk ========================= */}
      <Modal
        buka={modal === 'form'}
        tutup={() => setModal(null)}
        judul={sedangUbah ? 'Ubah Produk' : 'Tambah Produk'}
        keterangan={
          sedangUbah
            ? `Terakhir diperbarui ${tanggalJam(sedangUbah.updatedAt || new Date())}`
            : 'Isi data barang yang akan dijual di kasir'
        }
        ukuran="md"
        kaki={
          <>
            <button type="button" className="btn" onClick={() => setModal(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-primer kanan" onClick={simpan}>
              <Icon nama="simpan" ukuran={15} />
              {sedangUbah ? 'Simpan Perubahan' : 'Simpan Produk'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Bidang label="Nama produk" wajib galat={galat.nama} penuh>
            <input
              className="inp"
              data-fokus-awal
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Indomie Goreng"
              aria-invalid={!!galat.nama}
            />
          </Bidang>

          <Bidang
            label="Barcode / SKU"
            galat={galat.sku}
            petunjuk="Kosongkan untuk dibuat otomatis"
          >
            <input
              className="inp inp-num"
              style={{ textAlign: 'left' }}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="8998866101011"
              aria-invalid={!!galat.sku}
            />
          </Bidang>

          <Bidang label="Satuan">
            <div className="row g6">
              <select
                className="sel isi"
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
              >
                {!daftarSatuan.includes(form.satuan) && form.satuan ? (
                  <option value={form.satuan}>{form.satuan}</option>
                ) : null}
                {daftarSatuan.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                onClick={() => setModal('satuan')}
                title="Kelola satuan"
              >
                <Icon nama="tambah" ukuran={14} />
              </button>
            </div>
          </Bidang>

          <Bidang label="Kategori" wajib galat={galat.kategori} penuh>
            <div className="row g6">
              <select
                className="sel isi"
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              >
                <option value="">— pilih kategori —</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.nama}>
                    {k.nama}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                onClick={() => setModal('kategori')}
                title="Kelola kategori"
              >
                <Icon nama="tambah" ukuran={14} />
              </button>
            </div>
          </Bidang>

          <Bidang
            label="Foto produk"
            penuh
            petunjuk="JPG / PNG / WebP, maksimal 2 MB — tersimpan di penyimpanan S3 toko"
          >
            <PemilihFoto
              nilai={form.gambarUrl}
              sibuk={unggahFoto}
              onPilih={pilihFoto}
              onHapus={() => setForm((f) => ({ ...f, gambarUrl: '', gambarKey: '' }))}
            />
          </Bidang>

          <Bidang label="Harga beli (modal)" galat={galat.hargaBeli}>
            <InpRupiah
              nilai={form.hargaBeli}
              onUbah={(v) => setForm({ ...form, hargaBeli: v })}
            />
          </Bidang>

          <Bidang
            label="Harga jual"
            wajib
            galat={galat.hargaJual}
            petunjuk={
              form.hargaJual > 0
                ? `Margin ${persen(marginForm, 1)} • laba ${rupiah(
                    Number(form.hargaJual) - Number(form.hargaBeli || 0),
                  )}/${form.satuan}`
                : undefined
            }
          >
            <InpRupiah
              nilai={form.hargaJual}
              onUbah={(v) => setForm({ ...form, hargaJual: v })}
            />
          </Bidang>

          <Bidang
            label={sedangUbah ? 'Stok saat ini' : 'Stok awal'}
            petunjuk={
              sedangUbah
                ? 'Perubahan tercatat sebagai penyesuaian stok'
                : 'Tercatat sebagai barang masuk'
            }
          >
            <InpAngka
              nilai={form.stok}
              onUbah={(v) => setForm({ ...form, stok: v })}
              akhiran={form.satuan}
            />
          </Bidang>

          <Bidang
            label="Stok minimum"
            petunjuk="Batas peringatan restok"
          >
            <InpAngka
              nilai={form.stokMin}
              onUbah={(v) => setForm({ ...form, stokMin: v })}
              akhiran={form.satuan}
            />
          </Bidang>

          <div className="rentang-penuh">
            <Sakelar
              label="Dijual di kasir"
              keterangan="Nonaktifkan untuk menyembunyikan produk dari halaman Kasir tanpa menghapusnya"
              checked={form.aktif}
              onChange={(v) => setForm({ ...form, aktif: v })}
            />
          </div>
        </div>
      </Modal>

      {/* ======================== Modal kategori ======================== */}
      <ModalKategori buka={modal === 'kategori'} tutup={() => setModal(null)} />

      {/* ========================= Modal satuan ========================= */}
      <ModalSatuan buka={modal === 'satuan'} tutup={() => setModal(null)} />

      {/* ========================= Modal crop foto ======================== */}
      <ModalCropFoto
        buka={!!cropFile}
        berkas={cropFile}
        tutup={tutupCrop}
        onHasil={unggahHasilCrop}
      />

      {imporBuka ? <ModalImpor tutup={() => setImporBuka(false)} /> : null}

      {/* ========================= Hapus produk ======================== */}
      <Konfirmasi
        buka={!!akanHapus}
        tutup={() => setAkanHapus(null)}
        judul="Hapus produk?"
        bahaya
        labelSetuju="Hapus produk"
        pesan={`Produk "${akanHapus?.nama}" akan dihapus dari daftar. Riwayat transaksi yang sudah terjadi tetap tersimpan. Tindakan ini tidak dapat dibatalkan.`}
        onSetuju={async () => {
          try {
            await aksi.hapusProduk(akanHapus.id)
            toast.info(`Produk "${akanHapus.nama}" dihapus`)
          } catch (e) {
            toast.galat(e?.message || 'Gagal menghapus produk')
          }
          setAkanHapus(null)
        }}
      />
    </div>
  )
}

/* -------------------------------- Impor --------------------------------- */

const BATAS_PRATINJAU = 100

function ModalImpor({ tutup }) {
  const { produk, kategori, satuan } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [namaBerkas, setNamaBerkas] = useState('')
  const [baris, setBaris] = useState(null)
  const [galatFile, setGalatFile] = useState('')
  const [membaca, setMembaca] = useState(false)
  const [mengimpor, setMengimpor] = useState(false)

  async function pilih(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMembaca(true)
    setGalatFile('')
    setBaris(null)
    const hasil = await bacaFileProduk(file)
    setMembaca(false)
    if (!hasil.ok) {
      setGalatFile(hasil.galat)
      return
    }
    setNamaBerkas(file.name)
    setBaris(validasiBarisImpor(hasil.baris, produk))
  }

  const valid = (baris || []).filter((b) => b.ok)
  const bermasalah = (baris || []).filter((b) => !b.ok)
  const kategoriBaru = [
    ...new Set(
      valid
        .map((b) => b.data.kategori)
        .filter((k) => !kategori.some((c) => c.nama.toLowerCase() === k.toLowerCase())),
    ),
  ]

  async function impor() {
    if (!valid.length || mengimpor) return
    setMengimpor(true)
    try {
      for (const nama of kategoriBaru) {
        try {
          await aksi.tambahKategori(nama)
        } catch {
          /* sudah ada di server */
        }
      }
      const satuanAda = new Set((satuan || []).map((s) => s.nama.toLowerCase()))
      const satuanBaru = [
        ...new Set(
          valid.map((b) => b.data.satuan).filter((s) => s && !satuanAda.has(s.toLowerCase())),
        ),
      ]
      for (const nama of satuanBaru) {
        try {
          await aksi.tambahSatuan(nama)
        } catch {
          /* sudah ada di server */
        }
      }
      let ok = 0
      let gagal = 0
      for (const b of valid) {
        try {
          await aksi.tambahProduk({ ...b.data })
          ok += 1
        } catch {
          gagal += 1
        }
      }
      if (ok > 0) {
        toast.sukses(
          `${angka(ok)} produk diimpor` +
            (kategoriBaru.length ? `, ${angka(kategoriBaru.length)} kategori baru dibuat` : '') +
            (satuanBaru.length ? `, ${angka(satuanBaru.length)} satuan baru dibuat` : '') +
            (bermasalah.length ? ` — ${angka(bermasalah.length)} baris dilewati` : '') +
            (gagal ? ` — ${angka(gagal)} gagal tersimpan` : ''),
        )
        tutup()
      } else {
        toast.galat('Tidak ada produk yang berhasil diimpor — periksa koneksi server')
      }
    } finally {
      setMengimpor(false)
    }
  }

  return (
    <Modal
      buka
      tutup={tutup}
      judul="Impor Produk"
      keterangan="Unggah CSV atau Excel (.csv, .xls, .xlsx) — maksimal 2.000 baris"
      ukuran="md"
      kaki={
        <>
          <span className="xs muted isi">
            {baris
              ? `${angka(valid.length)} valid • ${angka(bermasalah.length)} bermasalah`
              : 'Belum ada berkas dipilih'}
          </span>
          <button type="button" className="btn" onClick={tutup}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primer"
            onClick={impor}
            disabled={!valid.length || mengimpor}
          >
            <Icon nama="simpan" ukuran={15} />
            {mengimpor ? 'Mengimpor…' : `Impor ${angka(valid.length)} produk`}
          </button>
        </>
      }
    >
      <div className="col g12">
        <div className="row g6 wrap">
          <span className="xs muted">Belum punya formatnya?</span>
          <button type="button" className="btn btn-sm" onClick={unduhTemplateCsv}>
            <Icon nama="unduh" ukuran={13} />
            Template CSV
          </button>
          <button type="button" className="btn btn-sm" onClick={() => unduhTemplateExcel()}>
            <Icon nama="unduh" ukuran={13} />
            Template Excel
          </button>
        </div>

        <label className="btn btn-blok" style={{ height: 44 }}>
          <Icon nama="masuk" ukuran={15} />
          {membaca ? 'Membaca berkas…' : namaBerkas || 'Pilih berkas CSV / Excel'}
          <input
            type="file"
            className="sr-only"
            accept=".csv,.xls,.xlsx"
            onChange={pilih}
            disabled={membaca}
          />
        </label>

        {galatFile ? (
          <div className="info-box info-box-merah" role="alert">
            <Icon nama="peringatan" ukuran={16} />
            <span>{galatFile}</span>
          </div>
        ) : null}

        {kategoriBaru.length > 0 ? (
          <InfoBox warna="netral" ikon="label">
            Kategori baru akan dibuat otomatis: <b>{kategoriBaru.join(', ')}</b>
          </InfoBox>
        ) : null}

        {baris ? (
          <div className="tabel-bungkus" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="tabel">
              <thead>
                <tr>
                  <th title="Nomor baris di berkas">Brs</th>
                  <th>Nama produk</th>
                  <th className="kanan-teks">Harga jual</th>
                  <th className="kanan-teks">Stok</th>
                  <th>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {baris.slice(0, BATAS_PRATINJAU).map((b) => (
                  <tr key={b.no}>
                    <td className="num muted">{b.no}</td>
                    <td>
                      <div className="sel-utama">{b.mentah.nama || <span className="tersier">—</span>}</div>
                      <div className="sel-sub num">{b.mentah.sku || 'SKU otomatis'}</div>
                    </td>
                    <td className="kanan-teks rp">{rupiah(keAngka(b.mentah.hargaJual))}</td>
                    <td className="kanan-teks num">{b.mentah.stok || '0'}</td>
                    <td>
                      {b.ok ? (
                        <Lencana warna="hijau">Valid</Lencana>
                      ) : (
                        <span className="xs" style={{ color: 'var(--danger)' }}>
                          {b.galat.join('; ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {baris.length > BATAS_PRATINJAU ? (
              <p className="xs muted" style={{ padding: '8px 12px' }}>
                Menampilkan {BATAS_PRATINJAU} dari {angka(baris.length)} baris — semuanya tetap diproses.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

/* ------------------------------- Kategori -------------------------------- */

function ModalKategori({ buka, tutup }) {
  const { kategori, produk } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [baru, setBaru] = useState('')
  const [ubahId, setUbahId] = useState(null)
  const [ubahNama, setUbahNama] = useState('')

  const hitungProduk = (nama) => produk.filter((p) => p.kategori === nama).length

  const tambah = async () => {
    const nama = baru.trim()
    if (!nama) return
    if (kategori.some((k) => k.nama.toLowerCase() === nama.toLowerCase())) {
      toast.galat('Kategori dengan nama itu sudah ada')
      return
    }
    try {
      await aksi.tambahKategori(nama)
      toast.sukses(`Kategori "${nama}" ditambahkan`)
      setBaru('')
    } catch (e) {
      toast.galat(e?.message || 'Gagal menambah kategori')
    }
  }

  const simpanUbah = async (k) => {
    if (!ubahNama.trim()) return
    try {
      await aksi.ubahKategori(k.id, ubahNama, k.nama)
      setUbahId(null)
      toast.sukses('Kategori diperbarui')
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan kategori')
    }
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Kelola Kategori"
      keterangan="Kategori memudahkan penyaringan produk di kasir dan laporan."
      ukuran="sm"
      kaki={
        <button type="button" className="btn kanan" onClick={tutup}>
          Selesai
        </button>
      }
    >
      <div className="col g12">
        <div className="row g6">
          <input
            className="inp isi"
            data-fokus-awal
            value={baru}
            onChange={(e) => setBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tambah()
              }
            }}
            placeholder="Nama kategori baru"
          />
          <button type="button" className="btn btn-primer" onClick={tambah}>
            <Icon nama="tambah" ukuran={15} />
            Tambah
          </button>
        </div>

        <div className="kartu" style={{ overflow: 'hidden' }}>
          {kategori.length === 0 ? (
            <Kosong ikon="label" judul="Belum ada kategori" />
          ) : (
            kategori.map((k) => (
              <div
                key={k.id}
                className="row g6"
                style={{
                  padding: '9px 11px',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                {ubahId === k.id ? (
                  <>
                    <input
                      className="inp isi"
                      value={ubahNama}
                      onChange={(e) => setUbahNama(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          simpanUbah(k)
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primer"
                      onClick={() => simpanUbah(k)}
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setUbahId(null)}
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <div className="isi">
                      <div className="sm tebal">{k.nama}</div>
                      <div className="xs tersier num">
                        {angka(hitungProduk(k.nama))} produk
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ikon btn-hantu"
                      onClick={() => {
                        setUbahId(k.id)
                        setUbahNama(k.nama)
                      }}
                      aria-label={`Ubah nama ${k.nama}`}
                    >
                      <Icon nama="ubah" ukuran={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ikon btn-hantu"
                      onClick={async () => {
                        try {
                          await aksi.hapusKategori(k.id, k.nama)
                          toast.info(
                            `Kategori "${k.nama}" dihapus. Produk dipindah ke "Lain-lain".`,
                          )
                        } catch (e) {
                          toast.galat(e?.message || 'Gagal menghapus kategori')
                        }
                      }}
                      aria-label={`Hapus kategori ${k.nama}`}
                    >
                      <Icon nama="sampah" ukuran={14} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

/* -------------------------------- Satuan --------------------------------- */

function ModalSatuan({ buka, tutup }) {
  const { satuan, produk } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [baru, setBaru] = useState('')
  const [ubahId, setUbahId] = useState(null)
  const [ubahNama, setUbahNama] = useState('')

  const hitungPakai = (nama) => produk.filter((p) => p.satuan === nama).length

  const tambah = async () => {
    const nama = baru.trim()
    if (!nama) return
    if (satuan.some((s) => s.nama.toLowerCase() === nama.toLowerCase())) {
      toast.galat('Satuan dengan nama itu sudah ada')
      return
    }
    try {
      await aksi.tambahSatuan(nama)
      toast.sukses(`Satuan "${nama}" ditambahkan`)
      setBaru('')
    } catch (e) {
      toast.galat(e?.message || 'Gagal menambah satuan')
    }
  }

  const simpanUbah = async (s) => {
    if (!ubahNama.trim()) return
    try {
      await aksi.ubahSatuan(s.id, ubahNama)
      setUbahId(null)
      toast.sukses('Satuan diperbarui — produk terkait ikut berubah')
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan satuan')
    }
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Kelola Satuan"
      keterangan="Satuan dipakai di form produk, mis. pcs, liter, dus. Satuan yang masih dipakai produk tidak bisa dihapus."
      ukuran="sm"
      kaki={
        <button type="button" className="btn kanan" onClick={tutup}>
          Selesai
        </button>
      }
    >
      <div className="col g12">
        <div className="row g6">
          <input
            className="inp isi"
            data-fokus-awal
            value={baru}
            onChange={(e) => setBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tambah()
              }
            }}
            placeholder="Satuan baru, mis. liter"
            maxLength={24}
          />
          <button type="button" className="btn btn-primer" onClick={tambah}>
            <Icon nama="tambah" ukuran={15} />
            Tambah
          </button>
        </div>

        <div className="kartu" style={{ overflow: 'hidden' }}>
          {satuan.length === 0 ? (
            <Kosong ikon="kotak" judul="Belum ada satuan" />
          ) : (
            satuan.map((s) => (
              <div
                key={s.id}
                className="row g6"
                style={{
                  padding: '9px 11px',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                {ubahId === s.id ? (
                  <>
                    <input
                      className="inp isi"
                      value={ubahNama}
                      maxLength={24}
                      onChange={(e) => setUbahNama(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          simpanUbah(s)
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primer"
                      onClick={() => simpanUbah(s)}
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setUbahId(null)}
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <div className="isi">
                      <div className="sm tebal">{s.nama}</div>
                      <div className="xs tersier num">
                        {angka(hitungPakai(s.nama))} produk memakai
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ikon btn-hantu"
                      onClick={() => {
                        setUbahId(s.id)
                        setUbahNama(s.nama)
                      }}
                      aria-label={`Ubah nama ${s.nama}`}
                    >
                      <Icon nama="ubah" ukuran={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ikon btn-hantu"
                      onClick={async () => {
                        try {
                          await aksi.hapusSatuan(s.id)
                          toast.info(`Satuan "${s.nama}" dihapus`)
                        } catch (e) {
                          toast.galat(e?.message || 'Gagal menghapus satuan')
                        }
                      }}
                      aria-label={`Hapus satuan ${s.nama}`}
                    >
                      <Icon nama="sampah" ukuran={14} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------- Foto produk ------------------------------ */

function PemilihFoto({ nilai, sibuk, onPilih, onHapus }) {
  return (
    <div className="foto-pemilih">
      {nilai ? (
        <div className="col g8">
          <img src={nilai} alt="Foto produk" className="foto-pratinjau" loading="lazy" />
          <div className="row g6 wrap">
            <label className="btn btn-sm">
              <Icon nama="ubah" ukuran={13} />
              {sibuk ? 'Mengunggah…' : 'Ganti foto'}
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPilih}
                disabled={sibuk}
              />
            </label>
            <button type="button" className="btn btn-sm" onClick={onHapus} disabled={sibuk}>
              <Icon nama="sampah" ukuran={13} />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <label className="btn foto-pilih">
          <Icon nama="tambah" ukuran={15} />
          {sibuk ? 'Mengunggah…' : 'Pilih foto produk'}
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPilih}
            disabled={sibuk}
          />
        </label>
      )}
    </div>
  )
}

/* --------------------------- Crop foto produk ---------------------------- */
/* Geser gambar untuk mengatur posisi, slider untuk zoom. Hasil 1:1 800px. */

function ModalCropFoto({ buka, berkas, tutup, onHasil }) {
  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Atur Foto Produk"
      keterangan="Geser foto untuk mengatur posisi, gunakan slider untuk memperbesar"
      ukuran="sm"
      kaki={
        <button type="button" className="btn kanan" onClick={tutup}>
          Batal
        </button>
      }
    >
      {buka && berkas?.url ? <CropIsi key={berkas.url} url={berkas.url} onHasil={onHasil} /> : null}
    </Modal>
  )
}

/* Isi crop — di-remount tiap berkas baru (key) sehingga state selalu segar. */

function CropIsi({ url, onHasil }) {
  const kotakRef = useRef(null)
  const imgRef = useRef(null)
  const seret = useRef(null)
  const lebarRef = useRef(260)

  const [alam, setAlam] = useState({ w: 0, h: 0 })
  const [skalaDasar, setSkalaDasar] = useState(1)
  const [skala, setSkala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [proses, setProses] = useState(false)

  const lebar = () => lebarRef.current || 260
  const jepit = (v, min, maks) => Math.min(maks, Math.max(min, v))

  function ukur() {
    if (kotakRef.current?.clientWidth) lebarRef.current = kotakRef.current.clientWidth
  }

  function jepitPos(x, y, s) {
    const k = lebar()
    const lw = alam.w * s
    const lh = alam.h * s
    return {
      x: jepit(x, -Math.max(0, (lw - k) / 2), Math.max(0, (lw - k) / 2)),
      y: jepit(y, -Math.max(0, (lh - k) / 2), Math.max(0, (lh - k) / 2)),
    }
  }

  function saatMuat() {
    const img = imgRef.current
    if (!img) return
    ukur()
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return
    setAlam({ w, h })
    const dasar = Math.max(lebar() / w, lebar() / h)
    setSkalaDasar(dasar)
    setSkala(dasar)
    setPos({ x: 0, y: 0 })
  }

  function mulaiSeret(e) {
    if (!alam.w) return
    e.preventDefault()
    seret.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* abaikan */
    }
  }

  function gerakSeret(e) {
    const s = seret.current
    if (!s) return
    const r = kotakRef.current?.getBoundingClientRect()
    const f = r && r.width ? lebar() / r.width : 1
    setPos(jepitPos(s.px + (e.clientX - s.x) * f, s.py + (e.clientY - s.y) * f, skala))
  }

  function lepasSeret() {
    seret.current = null
  }

  function ubahZoom(nilai) {
    const s = jepit(Number(nilai) || skalaDasar, skalaDasar, skalaDasar * 3)
    setSkala(s)
    setPos((p) => jepitPos(p.x, p.y, s))
  }

  async function hasilkan() {
    const img = imgRef.current
    if (!img || !alam.w || proses) return
    setProses(true)
    try {
      const SISI = 800
      const k = lebar()
      const lebarTampil = alam.w * skala
      const tinggiTampil = alam.h * skala
      const sx = ((lebarTampil - k) / 2 - pos.x) / skala
      const sy = ((tinggiTampil - k) / 2 - pos.y) / skala
      const ss = k / skala
      const kanvas = document.createElement('canvas')
      kanvas.width = SISI
      kanvas.height = SISI
      kanvas.getContext('2d').drawImage(img, sx, sy, ss, ss, 0, 0, SISI, SISI)
      const blob = await new Promise((res) => kanvas.toBlob(res, 'image/jpeg', 0.85))
      if (!blob) throw new Error('Gagal memotong gambar')
      await onHasil(new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="col g12">
      <div ref={kotakRef} className="crop-kotak">
        <img
          ref={imgRef}
          src={url}
          alt="Pratinjau potongan foto"
          className="crop-gambar"
          style={{
            width: Math.round(alam.w * skala) || 'auto',
            height: Math.round(alam.h * skala) || 'auto',
            transform: `translate(${pos.x}px, ${pos.y}px)`,
          }}
          onLoad={saatMuat}
          onPointerDown={mulaiSeret}
          onPointerMove={gerakSeret}
          onPointerUp={lepasSeret}
          onPointerCancel={lepasSeret}
          draggable={false}
        />
        <div className="crop-bingkai" />
      </div>
      <div className="row g6" style={{ alignItems: 'center' }}>
        <Icon nama="cari" ukuran={14} />
        <input
          type="range"
          className="crop-zoom isi"
          min={skalaDasar}
          max={skalaDasar * 3}
          step={0.01}
          value={skala}
          onChange={(e) => ubahZoom(e.target.value)}
          aria-label="Zoom foto"
        />
      </div>
      <p className="xs muted">Hasil akhir persegi 800 × 800 piksel.</p>
      <button
        type="button"
        className="btn btn-primer btn-blok"
        onClick={hasilkan}
        disabled={proses || !alam.w}
      >
        <Icon nama="simpan" ukuran={15} />
        {proses ? 'Memproses…' : 'Potong & Upload'}
      </button>
    </div>
  )
}
