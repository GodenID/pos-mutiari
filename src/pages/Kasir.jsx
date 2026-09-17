/* =========================================================================
   Kasir (POS) — tata letak dua panel: katalog di kiri, keranjang di kanan.
   Alur utama dirancang untuk papan tuts & pemindai barcode.
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import ModalBayar from '../components/kasir/ModalBayar.jsx'
import ModalStruk from '../components/kasir/ModalStruk.jsx'
import { Bidang, InpRupiah, Kbd, Kosong, Lencana } from '../components/UI.jsx'
import { useAksi, useStatus, useToast } from '../store/konteks.js'
import { statusStok } from '../lib/analitik.js'
import { angka, rupiah } from '../lib/format.js'
import { bunyikan } from '../lib/bunyi.js'

export default function Kasir() {
  const { produk, pengaturan } = useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [keranjang, setKeranjang] = useState([])
  const [cari, setCari] = useState('')
  const [kat, setKat] = useState('semua')
  const [scan, setScan] = useState('')
  const [diskonTipe, setDiskonTipe] = useState('rp')
  const [diskonInput, setDiskonInput] = useState('')
  const [sheetBuka, setSheetBuka] = useState(false)
  const [editBarisId, setEditBarisId] = useState(null) // baris yang dibuka editor harga/diskon
  const [modal, setModal] = useState(null) // 'bayar' | 'struk'
  const [trxSelesai, setTrxSelesai] = useState(null)

  const acuanScan = useRef(null)
  const acuanCari = useRef(null)

  const produkAktif = useMemo(
    () => produk.filter((p) => p.aktif !== false),
    [produk],
  )

  const petaProduk = useMemo(
    () => new Map(produk.map((p) => [p.id, p])),
    [produk],
  )

  const daftarKategori = useMemo(() => {
    const peta = new Map()
    produkAktif.forEach((p) => peta.set(p.kategori, (peta.get(p.kategori) || 0) + 1))
    return [...peta.entries()]
      .map(([nama, hitung]) => ({ nama, hitung }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [produkAktif])

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return produkAktif
      .filter((p) => (kat === 'semua' ? true : p.kategori === kat))
      .filter((p) =>
        !q ? true : p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const sa = statusStok(a) === 'habis' ? 1 : 0
        const sb = statusStok(b) === 'habis' ? 1 : 0
        if (sa !== sb) return sa - sb
        return a.nama.localeCompare(b.nama, 'id')
      })
  }, [produkAktif, kat, cari])

  /* ---------------------------- Hitungan ---------------------------- */

  const subtotalBruto = keranjang.reduce((a, i) => a + i.harga * i.qty, 0)
  const diskonItem = keranjang.reduce(
    (a, i) => a + Math.min(i.diskon || 0, i.harga * i.qty),
    0,
  )
  const subtotal = subtotalBruto - diskonItem
  const jumlahItem = keranjang.reduce((a, i) => a + i.qty, 0)

  const diskonNota = useMemo(() => {
    const n = Number(diskonInput) || 0
    if (diskonTipe === 'persen') {
      return Math.round((subtotal * Math.min(100, n)) / 100)
    }
    return Math.min(n, subtotal)
  }, [diskonInput, diskonTipe, subtotal])

  const pajakPersen = pengaturan.pajakAktif ? Number(pengaturan.pajakPersen) || 0 : 0
  const pajak = Math.round(((subtotal - diskonNota) * pajakPersen) / 100)
  const total = subtotal - diskonNota + pajak

  // diskon = potongan nota (kompatibel dengan ModalBayar lama)
  const hitungan = {
    subtotal,
    subtotalBruto,
    diskonItem,
    diskon: diskonNota,
    diskonNota,
    pajak,
    pajakPersen,
    total,
    jumlahItem,
  }

  const qtyDiKeranjang = (id) => keranjang.find((i) => i.produkId === id)?.qty || 0

  /* ------------------------------ Aksi ------------------------------ */

  function tambah(p, jumlah = 1) {
    if (!p) return false
    const sudah = qtyDiKeranjang(p.id)
    const qtyBaru = sudah + jumlah
    if (p.stok <= 0) {
      toast.galat(`${p.nama} — stok habis`)
      return false
    }
    if (qtyBaru > p.stok) {
      toast.galat(`Stok ${p.nama} tinggal ${angka(p.stok)} ${p.satuan}`)
      return false
    }
    setKeranjang((k) =>
      sudah
        ? k.map((i) => (i.produkId === p.id ? { ...i, qty: qtyBaru } : i))
        : [
            ...k,
            {
              produkId: p.id,
              sku: p.sku,
              nama: p.nama,
              satuan: p.satuan,
              harga: p.hargaJual,
              hargaNormal: p.hargaJual,
              hargaBeli: p.hargaBeli,
              qty: jumlah,
              diskon: 0,
            },
          ],
    )
    return true
  }

  function setQty(id, qty) {
    const p = petaProduk.get(id)
    const batas = p ? p.stok : qty
    if (qty <= 0) {
      setKeranjang((k) => k.filter((i) => i.produkId !== id))
      return
    }
    if (qty > batas) {
      toast.galat(`Stok ${p?.nama} tinggal ${angka(batas)} ${p?.satuan}`)
      setKeranjang((k) => k.map((i) => (i.produkId === id ? { ...i, qty: batas } : i)))
      return
    }
    setKeranjang((k) => k.map((i) => (i.produkId === id ? { ...i, qty } : i)))
  }

  function bersihkanKeranjang() {
    setKeranjang([])
    setDiskonInput('')
    setEditBarisId(null)
  }

  /** Ubah harga jual per baris (mis. harga grosir / penyesuaian) */
  function setHargaBaris(id, harga) {
    const nilai = Math.max(0, Number(harga) || 0)
    setKeranjang((k) =>
      k.map((i) => {
        if (i.produkId !== id) return i
        const batasDiskon = nilai * i.qty
        return {
          ...i,
          harga: nilai,
          diskon: Math.min(i.diskon || 0, batasDiskon),
        }
      }),
    )
  }

  /** Diskon Rp khusus satu baris, dibatasi maksimal harga × qty */
  function setDiskonBaris(id, diskon) {
    setKeranjang((k) =>
      k.map((i) => {
        if (i.produkId !== id) return i
        return {
          ...i,
          diskon: Math.max(0, Math.min(Number(diskon) || 0, i.harga * i.qty)),
        }
      }),
    )
  }

  const subtotalBaris = (i) => i.harga * i.qty - Math.min(i.diskon || 0, i.harga * i.qty)

  function prosesScan(e) {
    e.preventDefault()
    const kode = scan.trim()
    if (!kode) return
    const cocok =
      produkAktif.find((p) => p.sku.toLowerCase() === kode.toLowerCase()) ||
      produkAktif.filter((p) => p.sku.includes(kode))[0]
    if (cocok) {
      const ok = tambah(cocok)
      setScan('')
      bunyikan(ok ? 'sukses' : 'galat', pengaturan.bunyiPindai !== false)
    } else {
      toast.galat(`Barcode "${kode}" tidak ditemukan`)
      setScan('')
      bunyikan('galat', pengaturan.bunyiPindai !== false)
    }
  }

  function selesaikan(dataBayar) {
    const trx = aksi.simpanTransaksi({
      item: keranjang,
      diskonNota,
      pajakPersen,
      ...dataBayar,
    })
    setTrxSelesai(trx)
    setModal('struk')
    bersihkanKeranjang()
    setSheetBuka(false)
  }

  /* -------------------------- Pintasan tuts -------------------------- */

  useEffect(() => {
    const tangani = (e) => {
      if (modal) return
      const kunci = e.key
      if (kunci === 'F2') {
        e.preventDefault()
        acuanScan.current?.focus()
      } else if (kunci === 'F4') {
        e.preventDefault()
        acuanCari.current?.focus()
      } else if (kunci === 'F9') {
        e.preventDefault()
        if (keranjang.length) setModal('bayar')
        else toast.info('Keranjang masih kosong')
      }
    }
    window.addEventListener('keydown', tangani)
    return () => window.removeEventListener('keydown', tangani)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, keranjang, diskonNota])

  useEffect(() => {
    acuanScan.current?.focus()
  }, [])

  /* -------------------------------- UI ------------------------------- */

  return (
    <div className="pos">
      {/* ============================ Katalog ============================ */}
      <section className="pos-kiri">
        <div className="pos-alat tanpa-cetak">
          <div className="pos-scan">
            <form className="scan-kotak" onSubmit={prosesScan}>
              <Icon nama="barcode" ukuran={16} />
              <input
                ref={acuanScan}
                className="inp"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Pindai / ketik barcode"
                aria-label="Pindai barcode produk"
                autoComplete="off"
              />
            </form>

            <div className="cari pos-cari isi">
              <Icon nama="cari" ukuran={15} />
              <input
                ref={acuanCari}
                type="search"
                className="inp"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama produk…"
                aria-label="Cari produk"
              />
              {cari ? (
                <button
                  type="button"
                  className="cari-bersih"
                  onClick={() => setCari('')}
                  aria-label="Hapus pencarian"
                >
                  <Icon nama="tutup" ukuran={13} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="chip-baris">
            <button
              type="button"
              className="chip"
              aria-pressed={kat === 'semua'}
              onClick={() => setKat('semua')}
            >
              Semua
              <span className="chip-hitung">{angka(produkAktif.length)}</span>
            </button>
            {daftarKategori.map((k) => (
              <button
                key={k.nama}
                type="button"
                className="chip"
                aria-pressed={kat === k.nama}
                onClick={() => setKat(k.nama)}
              >
                {k.nama}
                <span className="chip-hitung">{angka(k.hitung)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pos-produk">
          {hasil.length === 0 ? (
            <Kosong
              ikon="cari"
              judul="Produk tidak ditemukan"
              pesan={
                produkAktif.length === 0
                  ? 'Belum ada produk aktif. Tambahkan produk di halaman Produk terlebih dahulu.'
                  : `Tidak ada produk yang cocok dengan "${cari}"${
                      kat !== 'semua' ? ` di kategori ${kat}` : ''
                    }.`
              }
              aksi={
                cari || kat !== 'semua' ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setCari('')
                      setKat('semua')
                    }}
                  >
                    Reset pencarian
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="produk-grid">
              {hasil.map((p) => {
                const diKeranjang = qtyDiKeranjang(p.id)
                const habis = p.stok <= 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`produk-kartu ${diKeranjang ? 'produk-terpilih' : ''}`}
                    onClick={() => tambah(p)}
                    disabled={habis}
                    title={habis ? 'Stok habis' : `Tambah ${p.nama} ke keranjang`}
                  >
                    {diKeranjang ? (
                      <span className="produk-hitung">{angka(diKeranjang)}</span>
                    ) : null}
                    <span className="produk-kat trunc">{p.kategori}</span>
                    <span className="produk-nama clamp2">{p.nama}</span>
                    <span className="produk-harga">{rupiah(p.hargaJual)}</span>
                    <span className="produk-kaki">
                      <span className="produk-stok">
                        {habis ? 'Habis' : `${angka(p.stok)} ${p.satuan}`}
                      </span>
                      {statusStok(p) === 'menipis' ? (
                        <Lencana warna="kuning">Menipis</Lencana>
                      ) : (
                        <span className="num tersier">{p.sku.slice(-4)}</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================== Keranjang =========================== */}
      {sheetBuka ? (
        <button
          type="button"
          className="keranjang-tirai hanya-mobile"
          aria-label="Tutup keranjang"
          onClick={() => setSheetBuka(false)}
        />
      ) : null}

      <aside className={`pos-kanan tanpa-cetak ${sheetBuka ? 'buka' : ''}`}>
        <header className="keranjang-kepala">
          <Icon nama="keranjang" ukuran={17} className="tersier" />
          <div className="isi">
            <div className="sm tebal">Keranjang</div>
            <div className="xs muted">
              {keranjang.length
                ? `${angka(keranjang.length)} jenis • ${angka(jumlahItem)} item`
                : 'Belum ada item'}
            </div>
          </div>
          {keranjang.length ? (
            <button
              type="button"
              className="btn btn-hantu btn-sm btn-ikon"
              onClick={bersihkanKeranjang}
              title="Kosongkan keranjang"
              aria-label="Kosongkan keranjang"
            >
              <Icon nama="kosong" ukuran={15} />
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-hantu btn-sm btn-ikon hanya-mobile"
            onClick={() => setSheetBuka(false)}
            aria-label="Tutup keranjang"
          >
            <Icon nama="tutup" ukuran={16} />
          </button>
        </header>

        <div className="keranjang-daftar">
          {keranjang.length === 0 ? (
            <Kosong
              ikon="keranjang"
              judul="Keranjang kosong"
              pesan="Pindai barcode atau klik produk di sebelah kiri untuk mulai menambahkan."
            />
          ) : (
            keranjang.map((i) => {
              const diskonBaris = Math.min(i.diskon || 0, i.harga * i.qty)
              const hargaUbah = i.harga !== (i.hargaNormal ?? i.harga)
              const labaBaris =
                (i.harga - (i.hargaBeli || 0)) * i.qty - diskonBaris
              const sedangUbah = editBarisId === i.produkId
              return (
              <div className="keranjang-item" key={i.produkId}>
                <div>
                  <div className="keranjang-nama">{i.nama}</div>
                  <div className="keranjang-meta">
                    {rupiah(i.harga)} / {i.satuan}
                    {hargaUbah ? (
                      <span className="diskon-tag" title={`Harga normal ${rupiah(i.hargaNormal)}`}>
                        harga ubah
                      </span>
                    ) : null}
                    {diskonBaris > 0 ? (
                      <span className="diskon-tag diskon-tag-hijau">
                        −{rupiah(diskonBaris)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className="keranjang-total"
                  style={diskonBaris > 0 || hargaUbah ? { color: 'var(--g-800)' } : undefined}
                >
                  {rupiah(subtotalBaris(i))}
                </div>

                <div className="keranjang-baris2">
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() => setQty(i.produkId, i.qty - 1)}
                      aria-label={`Kurangi ${i.nama}`}
                    >
                      <Icon nama="kurang" ukuran={14} />
                    </button>
                    <input
                      value={i.qty}
                      inputMode="numeric"
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, '')
                        setQty(i.produkId, v === '' ? 0 : Number(v))
                      }}
                      aria-label={`Jumlah ${i.nama}`}
                    />
                    <button
                      type="button"
                      onClick={() => setQty(i.produkId, i.qty + 1)}
                      disabled={i.qty >= (petaProduk.get(i.produkId)?.stok ?? 0)}
                      aria-label={`Tambah ${i.nama}`}
                    >
                      <Icon nama="tambah" ukuran={14} />
                    </button>
                  </div>
                  <span className="xs tersier isi">
                    sisa {angka(Math.max(0, (petaProduk.get(i.produkId)?.stok ?? 0) - i.qty))}
                  </span>
                  <button
                    type="button"
                    className="btn btn-hantu btn-sm btn-ikon"
                    onClick={() => setQty(i.produkId, 0)}
                    aria-label={`Hapus ${i.nama}`}
                  >
                    <Icon nama="sampah" ukuran={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-hantu btn-sm btn-ikon"
                    onClick={() => setEditBarisId(sedangUbah ? null : i.produkId)}
                    aria-label={`Ubah harga atau diskon ${i.nama}`}
                    title="Ubah harga / diskon baris"
                    aria-pressed={sedangUbah}
                  >
                    <Icon nama="ubah" ukuran={14} />
                  </button>
                </div>

                {sedangUbah ? (
                  <div className="baris-editor">
                    <div className="form-grid">
                      <Bidang label="Harga jual">
                        <InpRupiah
                          nilai={i.harga}
                          onUbah={(v) => setHargaBaris(i.produkId, v === '' ? 0 : v)}
                        />
                      </Bidang>
                      <Bidang label="Diskon baris">
                        <InpRupiah
                          nilai={i.diskon || ''}
                          onUbah={(v) => setDiskonBaris(i.produkId, v === '' ? 0 : v)}
                        />
                      </Bidang>
                    </div>
                    <div className="row g6" style={{ marginTop: 8 }}>
                      <span className="xs muted isi">
                        Laba baris{' '}
                        <b className={labaBaris < 0 ? 'turun' : 'naik'}>
                          {rupiah(labaBaris)}
                        </b>
                        {labaBaris < 0 ? ' — di bawah modal!' : ''}
                      </span>
                      {hargaUbah || diskonBaris > 0 ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setHargaBaris(i.produkId, i.hargaNormal ?? i.harga)
                            setDiskonBaris(i.produkId, 0)
                          }}
                        >
                          Reset
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm btn-primer"
                        onClick={() => setEditBarisId(null)}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              )
            })
          )}
        </div>

        <footer className="keranjang-kaki">
          <div className="diskon-baris">
            <span className="label" style={{ flex: 'none' }}>
              Diskon nota
            </span>
            <div className="segmen">
              <button
                type="button"
                aria-pressed={diskonTipe === 'rp'}
                onClick={() => setDiskonTipe('rp')}
              >
                Rp
              </button>
              <button
                type="button"
                aria-pressed={diskonTipe === 'persen'}
                onClick={() => setDiskonTipe('persen')}
              >
                %
              </button>
            </div>
            <input
              className="inp inp-num isi"
              inputMode="numeric"
              value={diskonInput}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, '')
                setDiskonInput(v === '' ? '' : Number(v))
              }}
              placeholder="0"
              aria-label="Nilai diskon"
              disabled={!keranjang.length}
            />
          </div>

          <dl className="rincian">
            <div className="rincian-baris">
              <dt>Subtotal</dt>
              <dd>{rupiah(subtotalBruto)}</dd>
            </div>
            {diskonItem > 0 ? (
              <div className="rincian-baris">
                <dt>Diskon item</dt>
                <dd className="turun">-{rupiah(diskonItem)}</dd>
              </div>
            ) : null}
            {diskonNota > 0 ? (
              <div className="rincian-baris">
                <dt>Diskon nota{diskonTipe === 'persen' ? ` (${diskonInput}%)` : ''}</dt>
                <dd className="turun">-{rupiah(diskonNota)}</dd>
              </div>
            ) : null}
            {pajakPersen > 0 ? (
              <div className="rincian-baris">
                <dt>PPN {pajakPersen}%</dt>
                <dd>{rupiah(pajak)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="total-besar">
            <span>Total</span>
            <b>{rupiah(total)}</b>
          </div>

          <div className="row g6">
            <button
              type="button"
              className="btn btn-primer btn-lg isi"
              onClick={() => setModal('bayar')}
              disabled={!keranjang.length}
            >
              <Icon nama="uang" ukuran={16} />
              Bayar
              <Kbd>F9</Kbd>
            </button>
          </div>

          <div className="pintasan-baris hanya-desktop">
            <span>
              <Kbd>F2</Kbd> pindai
            </span>
            <span>
              <Kbd>F4</Kbd> cari
            </span>
            <span>
              <Kbd>F9</Kbd> bayar
            </span>
          </div>
        </footer>
      </aside>

      {/* Tombol keranjang mengapung (mobile) */}
      {!sheetBuka && keranjang.length > 0 ? (
        <button
          type="button"
          className="keranjang-fab hanya-mobile"
          onClick={() => setSheetBuka(true)}
        >
          <Icon nama="keranjang" ukuran={18} />
          <span className="fab-jml">{angka(jumlahItem)}</span>
          <span className="tebal sm">Lihat keranjang</span>
          <span className="fab-total">{rupiah(total)}</span>
        </button>
      ) : null}

      {/* ============================ Modal ============================= */}
      <ModalBayar
        buka={modal === 'bayar'}
        tutup={() => setModal(null)}
        hitungan={hitungan}
        onSelesai={selesaikan}
      />

      <ModalStruk
        buka={modal === 'struk'}
        tutup={() => {
          setModal(null)
          setTrxSelesai(null)
          setTimeout(() => acuanScan.current?.focus(), 60)
        }}
        transaksi={trxSelesai}
        pengaturan={pengaturan}
        cetakOtomatis={pengaturan.cetakOtomatis === true}
      />
    </div>
  )
}
