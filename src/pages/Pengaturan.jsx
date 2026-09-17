/* =========================================================================
   Pengaturan — identitas toko, pajak, format struk, dan pengelolaan data
   ========================================================================= */

import { useMemo, useState } from 'react'

import Icon from '../components/Icon.jsx'
import Modal, { Konfirmasi } from '../components/Modal.jsx'
import Struk from '../components/Struk.jsx'
import {
  Bidang,
  InpAngka,
  Kartu,
  Kosong,
  Lencana,
  Sakelar,
  Segmen,
} from '../components/UI.jsx'
import { useAksi, useSesi, useStatus, useToast } from '../store/konteks.js'
import { PENGATURAN_AWAL } from '../data/seed.js'
import { labelPeran } from '../lib/auth.js'
import { angka, rupiah, tanggalJam } from '../lib/format.js'
import { nilaiPersediaan } from '../lib/analitik.js'

export default function Pengaturan() {
  const { pengaturan, produk, transaksi, mutasi, kategori, pelanggan, supplier, pembelian } =
    useStatus()
  const aksi = useAksi()
  const toast = useToast()

  const [form, setForm] = useState(pengaturan)
  const [konfirmasi, setKonfirmasi] = useState(null) // 'demo' | 'kosong'
  const [formPengguna, setFormPengguna] = useState(false)
  const [penggunaUbah, setPenggunaUbah] = useState(null)
  const [integrasiAktif, setIntegrasiAktif] = useState(null) // 'accurate' | 'jurnal' | null

  const penggunaBaru = () => {
    setPenggunaUbah(null)
    setFormPengguna(true)
  }

  const berubah = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(pengaturan),
    [form, pengaturan],
  )

  const persediaan = useMemo(() => nilaiPersediaan(produk), [produk])

  const ubah = (kunci) => (nilai) => setForm((f) => ({ ...f, [kunci]: nilai }))

  const simpan = async () => {
    if (!form.namaToko.trim()) {
      toast.galat('Nama toko tidak boleh kosong')
      return
    }
    try {
      await aksi.simpanPengaturan({
        ...form,
        namaToko: form.namaToko.trim(),
        pajakPersen: Number(form.pajakPersen) || 0,
      })
      toast.sukses('Pengaturan disimpan')
    } catch (e) {
      toast.galat(e?.message || 'Gagal menyimpan pengaturan')
    }
  }

  /* Contoh transaksi untuk pratinjau struk */
  const contohStruk = useMemo(
    () => ({
      nomor: 'INV-20260916-0001',
      tanggal: new Date().toISOString(),
      kasir: form.kasir || 'Kasir',
      pelanggan: '',
      item: [
        {
          produkId: 'c1',
          sku: '8998866101011',
          nama: 'Indomie Goreng',
          satuan: 'pcs',
          harga: 3500,
          qty: 3,
          subtotal: 10500,
        },
        {
          produkId: 'c2',
          sku: '8991002101010',
          nama: 'Aqua Botol 600ml',
          satuan: 'botol',
          harga: 4000,
          qty: 2,
          subtotal: 8000,
        },
      ],
      subtotal: 18500,
      diskon: 500,
      pajakPersen: form.pajakAktif ? Number(form.pajakPersen) || 0 : 0,
      pajak: form.pajakAktif
        ? Math.round((18000 * (Number(form.pajakPersen) || 0)) / 100)
        : 0,
      total:
        18000 +
        (form.pajakAktif
          ? Math.round((18000 * (Number(form.pajakPersen) || 0)) / 100)
          : 0),
      metode: 'tunai',
      bayar: 25000,
      kembalian:
        25000 -
        (18000 +
          (form.pajakAktif
            ? Math.round((18000 * (Number(form.pajakPersen) || 0)) / 100)
            : 0)),
      status: 'selesai',
      catatan: '',
    }),
    [form.kasir, form.pajakAktif, form.pajakPersen],
  )

  return (
    <div className="halaman">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Pengaturan</h1>
          <p>Identitas toko, pajak, format struk, integrasi, dan data aplikasi</p>
        </div>
        <div className="row g6">
          {berubah ? (
            <button type="button" className="btn" onClick={() => setForm(pengaturan)}>
              Batalkan
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primer"
            onClick={simpan}
            disabled={!berubah}
          >
            <Icon nama="simpan" ukuran={15} />
            {berubah ? 'Simpan Perubahan' : 'Tersimpan'}
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="col g16">
          <Kartu judul="Identitas toko" ikon="toko">
            <div className="form-grid">
              <Bidang label="Nama toko" wajib penuh>
                <input
                  className="inp"
                  value={form.namaToko}
                  onChange={(e) => ubah('namaToko')(e.target.value)}
                  placeholder="mis. Toko Sejahtera Jaya"
                />
              </Bidang>
              <Bidang label="Alamat" penuh petunjuk="Tercetak pada bagian atas struk">
                <textarea
                  className="area"
                  value={form.alamat}
                  onChange={(e) => ubah('alamat')(e.target.value)}
                  rows={2}
                  placeholder="Jl. Merdeka No. 42, Bandung"
                />
              </Bidang>
              <Bidang label="Telepon">
                <input
                  className="inp"
                  value={form.telepon}
                  onChange={(e) => ubah('telepon')(e.target.value)}
                  placeholder="022-7301234"
                />
              </Bidang>
              <Bidang label="NPWP" petunjuk="Opsional">
                <input
                  className="inp inp-num"
                  style={{ textAlign: 'left' }}
                  value={form.npwp}
                  onChange={(e) => ubah('npwp')(e.target.value)}
                  placeholder="00.000.000.0-000.000"
                />
              </Bidang>
              <Bidang
                label="Nama kasir aktif"
                penuh
                petunjuk="Dipakai sebagai penanggung jawab transaksi & mutasi stok"
              >
                <input
                  className="inp"
                  value={form.kasir}
                  onChange={(e) => ubah('kasir')(e.target.value)}
                  placeholder="mis. Rina Marlina"
                />
              </Bidang>
            </div>
          </Kartu>

          <Kartu judul="Pajak" ikon="hitung">
            <div className="col g14">
              <Sakelar
                label="Kenakan PPN pada transaksi"
                keterangan="Bila aktif, pajak dihitung dari subtotal setelah diskon"
                checked={!!form.pajakAktif}
                onChange={ubah('pajakAktif')}
              />
              <Bidang
                label="Tarif pajak"
                petunjuk="Tarif PPN umum di Indonesia saat ini 11%"
              >
                <div style={{ maxWidth: 180 }}>
                  <InpAngka
                    nilai={form.pajakPersen}
                    onUbah={ubah('pajakPersen')}
                    akhiran="%"
                    disabled={!form.pajakAktif}
                  />
                </div>
              </Bidang>
              {form.pajakAktif ? (
                <div className="info-box info-box-netral">
                  <Icon nama="info" ukuran={16} />
                  <span>
                    Contoh: subtotal {rupiah(100000)} → pajak{' '}
                    <b>
                      {rupiah(
                        Math.round((100000 * (Number(form.pajakPersen) || 0)) / 100),
                      )}
                    </b>{' '}
                    → total{' '}
                    <b>
                      {rupiah(
                        100000 +
                          Math.round((100000 * (Number(form.pajakPersen) || 0)) / 100),
                      )}
                    </b>
                    .
                  </span>
                </div>
              ) : null}
            </div>
          </Kartu>

          <Kartu judul="Format struk" ikon="cetak">
            <div className="col g14">
              <Bidang label="Lebar kertas">
                <Segmen
                  label="Lebar kertas struk"
                  nilai={form.lebarStruk}
                  onUbah={ubah('lebarStruk')}
                  opsi={[
                    { id: '58mm', nama: '58 mm (termal kecil)' },
                    { id: '80mm', nama: '80 mm (termal besar)' },
                  ]}
                />
              </Bidang>
              <Bidang
                label="Catatan kaki struk"
                petunjuk="mis. ketentuan penukaran barang"
              >
                <textarea
                  className="area"
                  rows={2}
                  value={form.footerStruk}
                  onChange={(e) => ubah('footerStruk')(e.target.value)}
                />
              </Bidang>
              <Sakelar
                label="Cetak nilai dalam huruf (terbilang)"
                keterangan="Menampilkan total dalam kata, mis. “dua puluh lima ribu rupiah”"
                checked={!!form.tampilkanTerbilang}
                onChange={ubah('tampilkanTerbilang')}
              />
            </div>
          </Kartu>

          <Kartu judul="Operasional kasir" ikon="kasir">
            <div className="col g14">
              <Sakelar
                label="Bunyi saat pindai barcode"
                keterangan="Blip pendek tiap pindai berhasil, nada rendah bila gagal atau stok habis"
                checked={form.bunyiPindai !== false}
                onChange={ubah('bunyiPindai')}
              />
              <Sakelar
                label="Cetak struk otomatis setelah bayar"
                keterangan="Dialog cetak langsung terbuka tiap transaksi selesai — cocok untuk printer selalu siaga"
                checked={form.cetakOtomatis === true}
                onChange={ubah('cetakOtomatis')}
              />
            </div>
          </Kartu>

          <Kartu
            judul="Integrasi Akuntansi"
            ikon="transfer"
            sub="Kirim faktur penjualan ke pembukuan tanpa input ulang"
          >
            <KartuIntegrasi
              integrasi={form.integrasi || PENGATURAN_AWAL.integrasi}
              onKelola={(id) => setIntegrasiAktif(id)}
            />
          </Kartu>
        </div>

        <div className="col g16">
          <Kartu
            judul="Pratinjau struk"
            sub="Berubah mengikuti pengaturan di sebelah kiri"
          >
            <div className="struk-panggung" style={{ borderRadius: 'var(--r)' }}>
              <Struk transaksi={contohStruk} pengaturan={form} />
            </div>
          </Kartu>

          <Kartu judul="Data aplikasi" ikon="gudang">
            <div className="col g14">
              <div className="info-box info-box-netral">
                <Icon nama="info" ukuran={16} />
                <span>
                  Aplikasi ini berjalan sepenuhnya di peramban. Seluruh data disimpan
                  di <b>penyimpanan lokal</b> perangkat ini, tidak dikirim ke server
                  mana pun. Menghapus data peramban akan menghapus data toko.
                </span>
              </div>

              <dl className="rincian">
                <div className="rincian-baris">
                  <dt>Produk terdaftar</dt>
                  <dd>{angka(produk.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Kategori</dt>
                  <dd>{angka(kategori.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Transaksi tersimpan</dt>
                  <dd>{angka(transaksi.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Baris mutasi stok</dt>
                  <dd>{angka(mutasi.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Pelanggan terdaftar</dt>
                  <dd>{angka(pelanggan.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Supplier</dt>
                  <dd>{angka(supplier.length)}</dd>
                </div>
                <div className="rincian-baris">
                  <dt>Pesanan pembelian (PO)</dt>
                  <dd>{angka(pembelian.length)}</dd>
                </div>
                <div className="rincian-baris rincian-total">
                  <dt>Nilai persediaan</dt>
                  <dd>{rupiah(persediaan.modal)}</dd>
                </div>
              </dl>

              <div className="row g6 wrap">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setKonfirmasi('demo')}
                >
                  <Icon nama="muat-ulang" ukuran={15} />
                  Muat Ulang Data Demo
                </button>
                <button
                  type="button"
                  className="btn btn-bahaya"
                  onClick={() => setKonfirmasi('kosong')}
                >
                  <Icon nama="sampah" ukuran={15} />
                  Kosongkan Semua Data
                </button>
              </div>
            </div>
          </Kartu>

          <Kartu judul="Pintasan papan tuts di Kasir" ikon="papan-tuts">
            <dl className="rincian">
              {[
                ['F2', 'Fokus ke kolom pindai barcode'],
                ['F4', 'Fokus ke kolom cari produk'],
                ['F9', 'Buka pembayaran / selesaikan'],
                ['Esc', 'Tutup jendela dialog'],
              ].map(([tuts, arti]) => (
                <div className="rincian-baris" key={tuts}>
                  <dt>{arti}</dt>
                  <dd>
                    <kbd className="kbd">{tuts}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Kartu>

          <Kartu judul="Tentang aplikasi">
            <div className="col g10">
              <div className="row g10">
                <span className="brand-mark">
                  <Icon nama="toko" ukuran={16} />
                </span>
                <div className="isi">
                  <div className="tebal">{form.namaToko || 'Mutiari Garden'} — Point of Sale</div>
                  <div className="xs muted">
                    Versi 1.1 • antarmuka bahasa Indonesia
                  </div>
                </div>
                <Lencana warna="hijau">Frontend</Lencana>
              </div>
              <p className="sm muted">
                Dibangun dengan React + Vite. Format mata uang, tanggal, dan angka
                mengikuti kaidah Indonesia (Rp, pemisah ribuan titik, desimal koma).
                Terakhir dibuka {tanggalJam(new Date())}.
              </p>
            </div>
          </Kartu>
        </div>
      </div>

      <Kartu
        judul="Pengguna & Akses"
        ikon="pengguna"
        sub="Akun login kasir & admin — nama kasir aktif mengikuti siapa yang masuk"
        aksi={
          <button type="button" className="btn btn-sm btn-primer" onClick={() => penggunaBaru()}>
            <Icon nama="tambah" ukuran={14} />
            Tambah Pengguna
          </button>
        }
        rapat
      >
        <KartuPengguna
          bukaForm={formPengguna}
          setBukaForm={setFormPengguna}
          sedangUbah={penggunaUbah}
          setSedangUbah={setPenggunaUbah}
        />
      </Kartu>

      <ModalIntegrasi
        key={integrasiAktif || 'tutup'}
        penyediaId={integrasiAktif}
        integrasi={form.integrasi || PENGATURAN_AWAL.integrasi}
        tutup={() => setIntegrasiAktif(null)}
        onSimpan={(nilai) => {
          const baru = {
            ...(form.integrasi || PENGATURAN_AWAL.integrasi),
            [integrasiAktif]: nilai,
          }
          setForm((f) => ({ ...f, integrasi: baru }))
          aksi.simpanPengaturan({ ...form, integrasi: baru }).catch((e) => {
            toast.galat(e?.message || 'Gagal menyimpan konfigurasi')
          })
          toast.sukses('Konfigurasi integrasi disimpan')
          setIntegrasiAktif(null)
        }}
        onPutuskan={() => {
          const baru = {
            ...(form.integrasi || PENGATURAN_AWAL.integrasi),
            [integrasiAktif]: { ...PENGATURAN_AWAL.integrasi[integrasiAktif] },
          }
          setForm((f) => ({ ...f, integrasi: baru }))
          aksi.simpanPengaturan({ ...form, integrasi: baru }).catch(() => null)
          toast.info('Koneksi integrasi diputus')
          setIntegrasiAktif(null)
        }}
      />

      <Konfirmasi
        buka={konfirmasi === 'demo'}
        tutup={() => setKonfirmasi(null)}
        judul="Muat ulang data demo?"
        labelSetuju="Ya, muat data demo"
        pesan="Semua data saat ini akan diganti dengan data contoh (38 produk, kategori, satuan, supplier, pelanggan). Riwayat transaksi tidak ikut dibuat — dasbor mulai dari kosong. Tindakan ini tidak dapat dibatalkan."
        bahaya
        onSetuju={async () => {
          try {
            await aksi.muatDemo()
            setForm(PENGATURAN_AWAL)
            toast.sukses('Data demo dimuat ulang')
          } catch (e) {
            toast.galat(e?.message || 'Gagal memuat data demo')
          }
          setKonfirmasi(null)
        }}
      />

      <Konfirmasi
        buka={konfirmasi === 'kosong'}
        tutup={() => setKonfirmasi(null)}
        judul="Kosongkan semua data?"
        labelSetuju="Ya, kosongkan"
        pesan="Seluruh produk, transaksi, dan riwayat mutasi akan dihapus permanen. Anda akan mulai dari toko kosong. Tindakan ini tidak dapat dibatalkan."
        bahaya
        onSetuju={async () => {
          try {
            await aksi.kosongkanData()
            setForm(PENGATURAN_AWAL)
            toast.info('Semua data dikosongkan')
          } catch (e) {
            toast.galat(e?.message || 'Gagal mengosongkan data')
          }
          setKonfirmasi(null)
        }}
      />
    </div>
  )
}

/* ------------------------- Integrasi akuntansi -------------------------- */

const PENYEDIA = {
  accurate: {
    nama: 'Accurate Online',
    logo: '/logo-accurate.svg',
    deskripsi: 'Faktur penjualan, barang & stok via Accurate API (OAuth 2.0).',
    developerUrl: 'https://account.accurate.id/developer',
    docsUrl: 'https://accurate.id/api-integration',
    langkah: [
      'Buka Area Developer Accurate, daftar sebagai developer, lalu Tambah Aplikasi Baru (platform Website).',
      'Daftarkan URL OAuth Callback, lalu catat Client ID dan Client Secret.',
      'Isi kredensial di bawah lalu Simpan. Otorisasi OAuth aktif setelah layanan backend tersedia.',
    ],
    bidang: [
      { kunci: 'clientId', label: 'Client ID', placeholder: 'mis. 42f12a10-…' },
      { kunci: 'clientSecret', label: 'Client Secret', sandi: true, placeholder: '••••••••' },
      { kunci: 'redirectUri', label: 'URL OAuth Callback', placeholder: 'https://toko-anda.id/aol-callback' },
      { kunci: 'dbId', label: 'ID Database', petunjuk: 'Lihat di hasil API db-list Accurate', placeholder: 'mis. 1156' },
    ],
  },
  jurnal: {
    nama: 'Mekari Jurnal',
    logo: '/logo-mekari-jurnal.webp',
    deskripsi: 'Faktur penjualan via Jurnal API (HMAC-SHA256).',
    developerUrl: 'https://developers.mekari.com/',
    docsUrl: 'https://developers.mekari.com/docs/kb',
    langkah: [
      'Khusus peran Owner: di Jurnal buka API Credentials → Buka Mekari Developers → Create Application.',
      'Pilih Company, centang scope “Jurnal All”, lalu catat Client ID dan Client Secret.',
      'Isi kredensial di bawah lalu Simpan. Pengiriman otomatis aktif setelah layanan backend tersedia.',
    ],
    bidang: [
      { kunci: 'clientId', label: 'Client ID', placeholder: 'Client ID Mekari Developers' },
      { kunci: 'clientSecret', label: 'Client Secret', sandi: true, placeholder: '••••••••' },
      { kunci: 'perusahaan', label: 'Perusahaan', petunjuk: 'Nama company yang dipilih saat Create Application', placeholder: 'mis. PT Mutiari Garden' },
    ],
  },
}

const PENYEDIA_ID = Object.keys(PENYEDIA)

function sudahDikonfigurasi(nilai) {
  return !!(nilai && String(nilai.clientId || '').trim())
}

function KartuIntegrasi({ integrasi, onKelola }) {
  return (
    <div className="col g14">
      <div className="info-box info-box-netral">
        <Icon nama="info" ukuran={16} />
        <span>
          Setiap transaksi selesai dapat diteruskan sebagai faktur ke pembukuan.
          Otorisasi memakai akun resmi masing-masing platform — POS tidak pernah
          meminta kata sandi Accurate / Jurnal Anda.
        </span>
      </div>
      <div className="integrasi-daftar">
        {PENYEDIA_ID.map((id) => {
          const p = PENYEDIA[id]
          const dikonfigurasi = sudahDikonfigurasi(integrasi?.[id])
          return (
            <div key={id} className="integrasi-provider">
              <div className="isi">
                <div className="tebal sm">{p.nama}</div>
                <div className="xs muted">{p.deskripsi}</div>
              </div>
              <Lencana warna={dikonfigurasi ? 'kuning' : 'netral'} titik>
                {dikonfigurasi ? 'Dikonfigurasi' : 'Belum terhubung'}
              </Lencana>
              <button
                type="button"
                className="btn integrasi-btn"
                onClick={() => onKelola(id)}
                aria-label={`${dikonfigurasi ? 'Kelola' : 'Hubungkan ke'} ${p.nama}`}
              >
                <img src={p.logo} alt={`Logo ${p.nama}`} className="integrasi-logo" />
                {dikonfigurasi ? 'Kelola' : 'Hubungkan'}
              </button>
            </div>
          )
        })}
      </div>
      <p className="xs tersier" style={{ lineHeight: 1.55 }}>
        Batas wajar: Accurate membatasi pemanggilan API per aplikasi; Jurnal memberi
        2.000 panggilan/bulan & 40/menit pada paket dasar.
      </p>
    </div>
  )
}

function ModalIntegrasi({ penyediaId, integrasi, tutup, onSimpan, onPutuskan }) {
  const p = penyediaId ? PENYEDIA[penyediaId] : null
  const [draf, setDraf] = useState({ ...(penyediaId ? integrasi?.[penyediaId] : {}) })
  const dikonfigurasi = sudahDikonfigurasi(integrasi?.[penyediaId])

  const ubah = (kunci) => (e) => setDraf((d) => ({ ...d, [kunci]: e.target.value }))

  const simpan = () => {
    if (!String(draf.clientId || '').trim()) return
    onSimpan(draf)
  }

  return (
    <Modal
      buka={!!penyediaId}
      tutup={tutup}
      judul={p ? `Hubungkan ke ${p.nama}` : 'Hubungkan'}
      keterangan="Kredensial aplikasi dari developer portal masing-masing platform"
      ukuran="sm"
      kaki={
        <>
          {dikonfigurasi ? (
            <button type="button" className="btn btn-bahaya" onClick={onPutuskan}>
              Putuskan
            </button>
          ) : null}
          <button
            type="button"
            className="btn kanan"
            onClick={tutup}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primer"
            onClick={simpan}
            disabled={!String(draf?.clientId || '').trim()}
          >
            <Icon nama="simpan" ukuran={15} />
            Simpan konfigurasi
          </button>
        </>
      }
    >
      {p ? (
        <div className="col g14">
          <div className="row g10">
            <img src={p.logo} alt={`Logo ${p.nama}`} className="integrasi-logo-besar" />
          </div>
          <ol className="integrasi-langkah">
            {p.langkah.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="row g6 wrap">
            <a
              className="btn btn-sm"
              href={p.developerUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon nama="eksternal" ukuran={13} />
              Area Developer
            </a>
            <a className="btn btn-sm" href={p.docsUrl} target="_blank" rel="noreferrer">
              <Icon nama="eksternal" ukuran={13} />
              Dokumentasi API
            </a>
          </div>
          <div className="form-grid">
            {p.bidang.map((b) => (
              <Bidang key={b.kunci} label={b.label} penuh petunjuk={b.petunjuk}>
                <input
                  className={`inp ${b.sandi ? '' : 'num'}`}
                  style={b.sandi ? undefined : { textAlign: 'left' }}
                  type={b.sandi ? 'password' : 'text'}
                  data-fokus-awal={b.kunci === 'clientId' ? true : undefined}
                  value={draf?.[b.kunci] || ''}
                  onChange={ubah(b.kunci)}
                  placeholder={b.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Bidang>
            ))}
          </div>
          <div className="info-box info-box-kuning">
            <Icon nama="peringatan" ukuran={16} />
            <span>
              Client Secret tersimpan di peramban ini saja. Untuk operasional penuh
              (OAuth & kirim faktur otomatis), secret wajib pindah ke layanan backend
              agar tidak terbaca dari devtools.
            </span>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

/* --------------------------- Kelola pengguna ---------------------------- */

const PENGGUNA_KOSONG = { nama: '', username: '', peran: 'kasir', sandi: '' }

function KartuPengguna({ bukaForm, setBukaForm, sedangUbah, setSedangUbah }) {
  const { pengguna } = useStatus()
  const { pengguna: sesi } = useSesi()
  const aksi = useAksi()
  const toast = useToast()

  const [form, setForm] = useState(PENGGUNA_KOSONG)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [akanHapus, setAkanHapus] = useState(null)

  const bukaUbah = (u) => {
    setSedangUbah(u)
    setForm({ nama: u.nama, username: u.username, peran: u.peran, sandi: '' })
    setGalat('')
    setBukaForm(true)
  }

  const tutupForm = () => {
    setBukaForm(false)
    setSedangUbah(null)
    setForm(PENGGUNA_KOSONG)
    setGalat('')
  }

  async function simpan() {
    setSibuk(true)
    let hasil
    if (sedangUbah) {
      hasil = await aksi.ubahPengguna(sedangUbah.id, { nama: form.nama, peran: form.peran })
      if (hasil.ok && form.sandi) {
        hasil = await aksi.aturSandi(sedangUbah.id, form.sandi)
      }
    } else {
      hasil = await aksi.tambahPengguna(form)
    }
    setSibuk(false)
    if (!hasil.ok) {
      setGalat(hasil.galat)
      return
    }
    toast.sukses(
      sedangUbah
        ? `Pengguna "${form.nama.trim()}" diperbarui`
        : `Pengguna "${form.nama.trim()}" ditambahkan`,
    )
    tutupForm()
  }

  return (
    <>
      {pengguna.length === 0 ? (
        <Kosong ikon="pengguna" judul="Belum ada pengguna" />
      ) : (
        <div className="tabel-bungkus">
          <table className="tabel">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Peran</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {pengguna.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="sel-utama">
                      {u.nama}
                      {u.id === sesi?.id ? (
                        <span className="diskon-tag diskon-tag-hijau">Anda</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="num sm muted">{u.username}</td>
                  <td>
                    <Lencana warna={u.peran === 'admin' ? 'biru' : 'netral'}>
                      {labelPeran(u.peran)}
                    </Lencana>
                  </td>
                  <td>
                    <Lencana warna={u.aktif === false ? 'merah' : 'hijau'} titik>
                      {u.aktif === false ? 'Nonaktif' : 'Aktif'}
                    </Lencana>
                  </td>
                  <td>
                    <div className="sel-aksi">
                      <button
                        type="button"
                        className="btn btn-sm btn-ikon btn-hantu"
                        onClick={() => bukaUbah(u)}
                        aria-label={`Ubah ${u.nama}`}
                        title="Ubah nama / peran / sandi"
                      >
                        <Icon nama="ubah" ukuran={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ikon btn-hantu"
                        onClick={async () => {
                          const hasil = await aksi.setAktifPengguna(u.id, u.aktif === false)
                          if (!hasil.ok) toast.galat(hasil.galat)
                          else
                            toast.info(
                              `${u.nama} ${u.aktif === false ? 'diaktifkan' : 'dinonaktifkan'}`,
                            )
                        }}
                        aria-label={`${u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'} ${u.nama}`}
                        title={u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                      >
                        <Icon nama={u.aktif === false ? 'mata' : 'batal'} ukuran={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ikon btn-hantu"
                        onClick={() => setAkanHapus(u)}
                        aria-label={`Hapus ${u.nama}`}
                        title="Hapus pengguna"
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
      )}

      <Modal
        buka={bukaForm}
        tutup={tutupForm}
        judul={sedangUbah ? 'Ubah Pengguna' : 'Tambah Pengguna'}
        keterangan={
          sedangUbah
            ? 'Kosongkan kata sandi bila tidak ingin mengubahnya'
            : 'Peran kasir tidak bisa membuka Supplier & Pengaturan'
        }
        ukuran="sm"
        kaki={
          <>
            <button type="button" className="btn" onClick={tutupForm}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primer kanan"
              onClick={simpan}
              disabled={sibuk}
            >
              <Icon nama="simpan" ukuran={15} />
              {sibuk ? 'Menyimpan…' : sedangUbah ? 'Simpan Perubahan' : 'Simpan Pengguna'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Bidang label="Nama lengkap" wajib penuh>
            <input
              className="inp"
              data-fokus-awal
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Dewi Anggraeni"
            />
          </Bidang>
          <Bidang label="Username" wajib={!!sedangUbah === false} penuh petunjuk="Huruf kecil, tanpa spasi">
            <input
              className="inp"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="mis. dewi"
              disabled={!!sedangUbah}
            />
          </Bidang>
          <Bidang label="Peran" penuh>
            <select
              className="sel"
              value={form.peran}
              onChange={(e) => setForm({ ...form, peran: e.target.value })}
            >
              <option value="kasir">Kasir — jualan & stok harian</option>
              <option value="admin">Admin — semua akses</option>
            </select>
          </Bidang>
          <Bidang
            label={sedangUbah ? 'Kata sandi baru' : 'Kata sandi'}
            wajib={!sedangUbah}
            penuh
            petunjuk="Minimal 6 karakter"
          >
            <input
              className="inp"
              type="password"
              value={form.sandi}
              onChange={(e) => setForm({ ...form, sandi: e.target.value })}
              placeholder={sedangUbah ? '(tidak berubah)' : '••••••••'}
              autoComplete="new-password"
            />
          </Bidang>
          {galat ? (
            <div className="rentang-penuh">
              <div className="info-box info-box-merah">
                <Icon nama="peringatan" ukuran={16} />
                <span>{galat}</span>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Konfirmasi
        buka={!!akanHapus}
        tutup={() => setAkanHapus(null)}
        judul="Hapus pengguna?"
        bahaya
        labelSetuju="Hapus pengguna"
        pesan={`"${akanHapus?.nama}" (@${akanHapus?.username}) tidak bisa masuk lagi. Riwayat transaksi yang pernah dibuatnya tetap tersimpan.`}
        onSetuju={async () => {
          const hasil = await aksi.hapusPengguna(akanHapus.id, sesi?.id)
          if (!hasil.ok) toast.galat(hasil.galat)
          else toast.info(`Pengguna "${akanHapus.nama}" dihapus`)
          setAkanHapus(null)
        }}
      />
    </>
  )
}
