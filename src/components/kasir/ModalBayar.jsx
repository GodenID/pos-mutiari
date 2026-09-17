/* Langkah pembayaran: pilih pelanggan, bayar tunai / split payment,
   hitung kembalian. Nama pelanggan baru otomatis masuk master Pelanggan. */

import { useEffect, useMemo, useState } from 'react'

import Icon from '../Icon.jsx'
import Modal from '../Modal.jsx'
import { Bidang, InpRupiah, Kbd } from '../UI.jsx'
import { useAksi, useStatus } from '../../store/konteks.js'
import { METODE_BAYAR } from '../../data/seed.js'
import gambarQris from '../../assets/qris.jpg'
import { angka, rupiah, rupiahSingkat, terbilang } from '../../lib/format.js'

const IKON_METODE = { uang: 'uang', qr: 'qr', kartu: 'kartu', transfer: 'transfer' }

/** Nominal cepat yang wajar untuk nilai transaksi tertentu */
function nominalCepat(total) {
  const bulat = (n, k) => Math.ceil(n / k) * k
  const calon = [
    bulat(total, 1000),
    bulat(total, 5000),
    bulat(total, 10000),
    bulat(total, 50000),
    50000,
    100000,
    150000,
    200000,
  ]
  return [...new Set(calon)]
    .filter((n) => n >= total && n > 0)
    .sort((a, b) => a - b)
    .slice(0, 5)
}

export default function ModalBayar({ buka, tutup, hitungan, onSelesai }) {
  const {
    subtotal = 0,
    subtotalBruto,
    diskonItem = 0,
    diskon = 0,
    pajak = 0,
    pajakPersen = 0,
    total = 0,
    jumlahItem = 0,
  } = hitungan || {}

  const { pelanggan: masterPelanggan } = useStatus()
  const aksi = useAksi()

  const [baris, setBaris] = useState([{ metode: 'tunai', jumlah: 0 }])
  const [pelangganId, setPelangganId] = useState('')
  const [cariPlg, setCariPlg] = useState('')
  const [daftarPlg, setDaftarPlg] = useState(false)
  const [telpBaru, setTelpBaru] = useState('')
  const [catatan, setCatatan] = useState('')
  const [qrisOk, setQrisOk] = useState(false)

  useEffect(() => {
    if (buka) {
      setBaris([{ metode: 'tunai', jumlah: total }])
      setPelangganId('')
      setCariPlg('')
      setDaftarPlg(false)
      setTelpBaru('')
      setCatatan('')
      setQrisOk(false)
    }
  }, [buka, total])

  const cepat = useMemo(() => nominalCepat(total), [total])

  const saranPlg = useMemo(() => {
    const q = cariPlg.trim().toLowerCase()
    const daftar = q
      ? masterPelanggan.filter(
          (p) =>
            p.nama.toLowerCase().includes(q) ||
            (p.telepon || '').toLowerCase().includes(q),
        )
      : masterPelanggan
    return daftar.slice(0, 6)
  }, [masterPelanggan, cariPlg])

  const pelangganTerpilih = pelangganId
    ? masterPelanggan.find((p) => p.id === pelangganId)
    : null
  const namaPlgBaru = !pelangganId && cariPlg.trim()
  const adaBarisTunai = baris.some((b) => b.metode === 'tunai')
  const adaQris = baris.some((b) => b.metode === 'qris')
  const nominalQris = baris
    .filter((b) => b.metode === 'qris')
    .reduce((a, b) => a + (Number(b.jumlah) || 0), 0)

  /* ------------------------- Baris pembayaran ------------------------- */

  const totalBayar = baris.reduce((a, b) => a + (Number(b.jumlah) || 0), 0)
  const kembalian = totalBayar - total
  const kurang = totalBayar < total
  const barisRusak = baris.some((b) => !(Number(b.jumlah) > 0))
  // QR statis: wajib konfirmasi manual dana masuk sebelum selesaikan
  const qrisBelumOk = adaQris && !qrisOk
  const belumBisaKirim = kurang || barisRusak || qrisBelumOk

  const ubahMetode = (indeks, metode) =>
    setBaris((daftar) => daftar.map((b, i) => (i === indeks ? { ...b, metode } : b)))

  const ubahJumlah = (indeks, jumlah) =>
    setBaris((daftar) =>
      daftar.map((b, i) => (i === indeks ? { ...b, jumlah: jumlah === '' ? '' : jumlah } : b)),
    )

  const tambahBaris = () => {
    const dipakai = new Set(baris.map((b) => b.metode))
    const bebas = METODE_BAYAR.find((m) => !dipakai.has(m.id))
    if (!bebas && baris.length >= 4) return
    const sisa = Math.max(0, total - totalBayar)
    setBaris((daftar) => [
      ...daftar,
      { metode: (bebas || METODE_BAYAR[0]).id, jumlah: sisa },
    ])
  }

  const hapusBaris = (indeks) =>
    setBaris((daftar) => (daftar.length <= 1 ? daftar : daftar.filter((_, i) => i !== indeks)))

  /** Isi baris tunai pertama agar total pembayaran menjadi nominal n */
  const isiTunai = (n) =>
    setBaris((daftar) => {
      const idx = daftar.findIndex((b) => b.metode === 'tunai')
      if (idx < 0) return [{ metode: 'tunai', jumlah: n }, ...daftar]
      const lain = daftar.reduce(
        (a, b, i) => (i === idx ? a : a + (Number(b.jumlah) || 0)),
        0,
      )
      return daftar.map((b, i) =>
        i === idx ? { ...b, jumlah: Math.max(0, n - lain) } : b,
      )
    })

  const kirim = () => {
    if (belumBisaKirim) return
    let idPlg = pelangganId
    let namaPlg = pelangganTerpilih?.nama || ''
    if (!idPlg && cariPlg.trim()) {
      // Samakan dengan master bila ada; sonst buat baru (ikut nomor telepon)
      const cocok = masterPelanggan.find(
        (p) => p.nama.toLowerCase() === cariPlg.trim().toLowerCase(),
      )
      if (cocok) {
        idPlg = cocok.id
        namaPlg = cocok.nama
      } else {
        const baru = aksi.tambahPelanggan({
          nama: cariPlg.trim(),
          telepon: telpBaru.trim(),
        })
        if (baru) {
          idPlg = baru.id
          namaPlg = baru.nama
        } else {
          namaPlg = cariPlg.trim()
        }
      }
    }
    onSelesai({
      pembayaran: baris.map((b) => ({ metode: b.metode, jumlah: Number(b.jumlah) || 0 })),
      pelanggan: namaPlg,
      pelangganId: idPlg,
      catatan,
    })
  }

  useEffect(() => {
    if (!buka) return undefined
    const tangani = (e) => {
      if (e.key === 'F9' && !belumBisaKirim) {
        e.preventDefault()
        kirim()
      }
    }
    window.addEventListener('keydown', tangani)
    return () => window.removeEventListener('keydown', tangani)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka, belumBisaKirim, baris, pelangganId, cariPlg, telpBaru, catatan, qrisOk])

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul="Pembayaran"
      keterangan={`${angka(jumlahItem)} item • ${rupiah(total)}`}
      ukuran="md"
      kaki={
        <>
          <button type="button" className="btn" onClick={tutup}>
            Kembali
          </button>
          <button
            type="button"
            className="btn btn-primer kanan"
            onClick={kirim}
            disabled={belumBisaKirim}
          >
            <Icon nama="centang" ukuran={15} />
            Selesaikan Pembayaran
            <Kbd>F9</Kbd>
          </button>
        </>
      }
    >
      <div className="col g16">
        {/* Rincian tagihan */}
        <div>
          <dl className="rincian">
            <div className="rincian-baris">
              <dt>Subtotal ({angka(jumlahItem)} item)</dt>
              <dd>{rupiah(subtotalBruto ?? subtotal + diskonItem)}</dd>
            </div>
            {diskonItem > 0 ? (
              <div className="rincian-baris">
                <dt>Diskon item</dt>
                <dd className="turun">-{rupiah(diskonItem)}</dd>
              </div>
            ) : null}
            {diskon > 0 ? (
              <div className="rincian-baris">
                <dt>Diskon nota</dt>
                <dd className="turun">-{rupiah(diskon)}</dd>
              </div>
            ) : null}
            {pajak > 0 ? (
              <div className="rincian-baris">
                <dt>PPN {pajakPersen}%</dt>
                <dd>{rupiah(pajak)}</dd>
              </div>
            ) : null}
            <div className="rincian-baris rincian-total">
              <dt>Total tagihan</dt>
              <dd>{rupiah(total)}</dd>
            </div>
          </dl>
        </div>

        {/* Pelanggan */}
        <div className="bidang">
          <label>Pelanggan</label>
          {pelangganTerpilih ? (
            <div className="plg-dipilih">
              <span className="avatar">{pelangganTerpilih.nama.slice(0, 2).toUpperCase()}</span>
              <div className="isi">
                <div className="sm tebal">{pelangganTerpilih.nama}</div>
                {pelangganTerpilih.telepon ? (
                  <div className="xs muted num">{pelangganTerpilih.telepon}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setPelangganId('')
                  setCariPlg('')
                }}
              >
                Ganti
              </button>
            </div>
          ) : (
            <>
              <div className="cari">
                <Icon nama="cari" ukuran={15} />
                <input
                  type="search"
                  className="inp"
                  value={cariPlg}
                  onChange={(e) => {
                    setCariPlg(e.target.value)
                    setDaftarPlg(true)
                  }}
                  onFocus={() => setDaftarPlg(true)}
                  placeholder="Ketik nama — pilih dari daftar atau buat baru…"
                  aria-label="Nama pelanggan"
                />
                {cariPlg ? (
                  <button
                    type="button"
                    className="cari-bersih"
                    onClick={() => setCariPlg('')}
                    aria-label="Hapus nama pelanggan"
                  >
                    <Icon nama="tutup" ukuran={13} />
                  </button>
                ) : null}
              </div>
              {daftarPlg ? (
                <div className="plg-saran">
                  {saranPlg.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="plg-saran-baris"
                      onClick={() => {
                        setPelangganId(p.id)
                        setCariPlg('')
                        setDaftarPlg(false)
                      }}
                    >
                      <span className="isi">
                        <span className="sm tebal">{p.nama}</span>
                        {p.telepon ? (
                          <span className="xs muted num"> • {p.telepon}</span>
                        ) : null}
                      </span>
                      <Icon nama="kanan" ukuran={13} />
                    </button>
                  ))}
                  {namaPlgBaru ? (
                    <div className="plg-baru">
                      <div className="xs muted">
                        Pelanggan baru “<b>{cariPlg.trim()}</b>” akan disimpan otomatis
                        ke master Pelanggan.
                      </div>
                      <input
                        className="inp"
                        value={telpBaru}
                        onChange={(e) => setTelpBaru(e.target.value)}
                        placeholder="No. telepon (opsional)"
                        aria-label="Telepon pelanggan baru"
                      />
                    </div>
                  ) : null}
                  {!saranPlg.length && !namaPlgBaru ? (
                    <div className="xs muted" style={{ padding: '6px 2px' }}>
                      Belum ada pelanggan tersimpan.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Baris pembayaran (split) */}
        <div className="bidang">
          <label>
            Pembayaran
            {baris.length > 1 ? ` — ${baris.length} metode (gabungan)` : ''}
          </label>
          <div className="col g8">
            {baris.map((b, i) => (
              <div className="bayar-baris" key={i}>
                <select
                  className="sel"
                  style={{ width: 132, flex: 'none' }}
                  value={b.metode}
                  onChange={(e) => ubahMetode(i, e.target.value)}
                  aria-label={`Metode pembayaran ${i + 1}`}
                >
                  {METODE_BAYAR.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama}
                    </option>
                  ))}
                </select>
                <InpRupiah
                  nilai={b.jumlah}
                  onUbah={(v) => ubahJumlah(i, v === '' ? '' : v)}
                  aria-label={`Jumlah pembayaran ${i + 1}`}
                />
                {baris.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn-hantu btn-sm btn-ikon"
                    onClick={() => hapusBaris(i)}
                    aria-label={`Hapus baris pembayaran ${i + 1}`}
                    style={{ flex: 'none' }}
                  >
                    <Icon nama="sampah" ukuran={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {baris.length < METODE_BAYAR.length ? (
            <button type="button" className="btn btn-sm" onClick={tambahBaris} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Icon nama="tambah" ukuran={14} />
              Split payment (gabung metode)
            </button>
          ) : null}
        </div>

        {/* Uang cepat + kembalian */}
        {adaBarisTunai ? (
          <div className="col g10">
            <div className="uang-cepat">
              <button type="button" onClick={() => isiTunai(total)}>
                Uang pas
              </button>
              {cepat
                .filter((n) => n !== total)
                .slice(0, 5)
                .map((n) => (
                  <button key={n} type="button" onClick={() => isiTunai(n)}>
                    {rupiahSingkat(n)}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="info-box info-box-hijau">
            <Icon nama="centang-bulat" ukuran={16} />
            <span>
              Tagihan <b>{rupiah(total)}</b> dibayar tanpa tunai. Pastikan bukti
              transaksi dari mesin/aplikasi sudah berhasil sebelum menyelesaikan.
            </span>
          </div>
        )}

        {/* Panel QRIS statis toko */}
        {adaQris ? (
          <div className="qris-panel">
            <img
              src={gambarQris}
              alt="Kode QRIS toko untuk pembayaran"
              className="qris-gambar"
            />
            <div className="isi col g6">
              <div className="label" style={{ color: 'var(--g-700)' }}>
                Pindai untuk bayar QRIS
              </div>
              <div className="qris-nominal">{rupiah(nominalQris)}</div>
              <div className="xs muted">
                Minta pembeli mengetik nominal di atas pada aplikasi
                pembayarannya, karena QR ini statis (tanpa nominal otomatis).
              </div>
              <label className="centang">
                <input
                  type="checkbox"
                  checked={qrisOk}
                  onChange={(e) => setQrisOk(e.target.checked)}
                />
                Dana sudah masuk / bukti bayar sudah dicek
              </label>
            </div>
          </div>
        ) : null}

        <div className={`kembalian-kotak ${kurang ? 'kurang' : ''}`}>
          <span className="label" style={{ color: 'inherit' }}>
            {kurang ? 'Masih kurang' : baris.length > 1 ? 'Kembalian (total gabungan)' : 'Kembalian'}
          </span>
          <b>{rupiah(Math.abs(kembalian))}</b>
        </div>
        {baris.length > 1 && !kurang ? (
          <div className="xs muted">
            Dibayar {rupiah(totalBayar)} ={' '}
            {baris
              .map(
                (b) =>
                  `${METODE_BAYAR.find((m) => m.id === b.metode)?.nama} ${rupiahSingkat(b.jumlah)}`,
              )
              .join(' + ')}
          </div>
        ) : null}

        <div className="xs tersier" style={{ textTransform: 'capitalize' }}>
          {terbilang(total)}
        </div>

        {/* Catatan */}
        <div className="form-grid">
          <Bidang label="Catatan" petunjuk="Opsional" penuh>
            <input
              className="inp"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. titip, ambil besok"
            />
          </Bidang>
        </div>

        {/* Ikon metode (legenda visual) */}
        <div className="row g6">
          {METODE_BAYAR.map((m) => (
            <span key={m.id} className="xs muted row g4">
              <Icon nama={IKON_METODE[m.ikon]} ukuran={14} />
              {m.nama}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  )
}
