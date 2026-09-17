/* =========================================================================
   Kerangka aplikasi — sidebar (desktop), drawer + bilah bawah (mobile)
   ========================================================================= */

import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import Icon from './Icon.jsx'
import { useAksi, useSesi, useStatus, useToast } from '../store/konteks.js'
import { stokKritis } from '../lib/analitik.js'
import { hariPanjang, inisial, jam, tanggalSedang } from '../lib/format.js'

const MENU = [
  {
    grup: null,
    item: [
      { ke: '/', ikon: 'dasbor', nama: 'Dasbor', ujung: true },
      { ke: '/kasir', ikon: 'kasir', nama: 'Kasir' },
    ],
  },
  {
    grup: 'Bisnis',
    item: [
      { ke: '/pelanggan', ikon: 'orang', nama: 'Pelanggan' },
      { ke: '/supplier', ikon: 'truk', nama: 'Supplier & PO', admin: true },
    ],
  },
  {
    grup: 'Inventori',
    item: [
      { ke: '/produk', ikon: 'kotak', nama: 'Produk' },
      { ke: '/stok', ikon: 'gudang', nama: 'Stok & Mutasi', lonceng: 'stok' },
    ],
  },
  {
    grup: 'Riwayat & Analisis',
    item: [
      { ke: '/penjualan', ikon: 'struk', nama: 'Penjualan' },
      { ke: '/laporan', ikon: 'bagan', nama: 'Laporan' },
    ],
  },
  {
    grup: 'Sistem',
    item: [{ ke: '/pengaturan', ikon: 'roda', nama: 'Pengaturan', admin: true }],
  },
]

const BILAH_BAWAH = [
  { ke: '/', ikon: 'dasbor', nama: 'Dasbor', ujung: true },
  { ke: '/kasir', ikon: 'kasir', nama: 'Kasir' },
  { ke: '/produk', ikon: 'kotak', nama: 'Produk' },
  { ke: '/penjualan', ikon: 'struk', nama: 'Penjualan' },
  { ke: '/laporan', ikon: 'bagan', nama: 'Laporan' },
]

const HALAMAN = {
  '/': { judul: 'Dasbor', sub: 'Ringkasan operasional toko hari ini' },
  '/kasir': { judul: 'Kasir', sub: 'Buat transaksi penjualan baru' },
  '/pelanggan': { judul: 'Pelanggan', sub: 'Data pembeli dan riwayat belanja' },
  '/supplier': {
    judul: 'Supplier & Pembelian',
    sub: 'Pemasok, pesanan pembelian, dan riwayat harga',
  },
  '/produk': { judul: 'Produk', sub: 'Daftar barang, harga, dan kategori' },
  '/stok': { judul: 'Stok & Mutasi', sub: 'Persediaan, barang masuk/keluar, stok opname' },
  '/penjualan': { judul: 'Penjualan', sub: 'Riwayat transaksi dan struk' },
  '/laporan': { judul: 'Laporan', sub: 'Analisis penjualan, laba, dan persediaan' },
  '/pengaturan': { judul: 'Pengaturan', sub: 'Identitas toko, pajak, dan data' },
}

/* ------------------------------ Jam berjalan ----------------------------- */

function JamSekarang() {
  const [waktu, setWaktu] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setWaktu(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="jam-chip hanya-desktop" title={hariPanjang(waktu)}>
      <b>{jam(waktu)}</b>
      <span>
        {hariPanjang(waktu)}, {tanggalSedang(waktu)}
      </span>
    </div>
  )
}

/* -------------------------------- Sidebar -------------------------------- */

function IsiSidebar({ lonceng, pengaturan, admin, pengguna, onKeluar }) {
  const menuTampil = MENU.map((bagian) => ({
    ...bagian,
    item: bagian.item.filter((m) => !m.admin || admin),
  })).filter((bagian) => bagian.item.length > 0)

  return (
    <>
      <div className="brand">
        <span className="brand-mark">
          <Icon nama="toko" ukuran={16} tebal={1.9} />
        </span>
        <div className="isi">
          <div className="brand-nama trunc">{pengaturan.namaToko || 'Mutiari Garden'}</div>
          <div className="brand-sub">Point of Sale</div>
        </div>
      </div>

      <nav className="nav" aria-label="Menu utama">
        {menuTampil.map((bagian, i) => (
          <div key={bagian.grup || `grup-${i}`}>
            {bagian.grup ? <div className="nav-grup label">{bagian.grup}</div> : null}
            {bagian.item.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                end={m.ujung}
                className={({ isActive }) => `nav-item ${isActive ? 'aktif' : ''}`}
                title={m.nama}
              >
                <Icon nama={m.ikon} ukuran={16} />
                <span className="isi">{m.nama}</span>
                {m.lonceng === 'stok' && lonceng > 0 ? (
                  <span className="nav-lonceng" title={`${lonceng} produk perlu perhatian`}>
                    {lonceng}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-kaki">
        <div className="kasir-kartu">
          <span className="avatar">{inisial(pengguna?.nama || pengaturan.kasir)}</span>
          <div className="isi">
            <div className="sm tebal trunc">{pengguna?.nama || pengaturan.kasir || 'Kasir'}</div>
            <div className="xs muted trunc">
              {pengguna?.peran === 'admin' ? 'Admin' : 'Kasir'} • {pengaturan.namaToko}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-hantu btn-sm btn-ikon"
            onClick={onKeluar}
            aria-label="Keluar dari aplikasi"
            title="Keluar"
          >
            <Icon nama="panah-kanan" ukuran={15} />
          </button>
        </div>
      </div>
    </>
  )
}

/* --------------------------------- Shell --------------------------------- */

const KUNCI_CIUT = 'kasirku.v1.sidebarCiut'

function bacaCiut() {
  try {
    return localStorage.getItem(KUNCI_CIUT) === '1'
  } catch {
    return false
  }
}

export default function Layout({ children }) {
  const { produk, pengaturan } = useStatus()
  const { pengguna } = useSesi()
  const aksi = useAksi()
  const toast = useToast()
  const lokasi = useLocation()
  const navigasi = useNavigate()
  const [ciut, setCiut] = useState(bacaCiut)

  const admin = pengguna?.peran === 'admin'
  const kritis = stokKritis(produk)
  const lonceng = kritis.habis.length + kritis.menipis.length
  const meta = HALAMAN[lokasi.pathname] || { judul: 'Mutiari Garden', sub: '' }
  const halamanKasir = lokasi.pathname === '/kasir'

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_CIUT, ciut ? '1' : '0')
    } catch {
      /* diabaikan */
    }
  }, [ciut])

  const keluar = () => {
    aksi.keluar()
    toast.info(`Sampai jumpa, ${pengguna?.nama || 'Kasir'}`)
    navigasi('/masuk', { replace: true })
  }

  return (
    <div className={`shell ${ciut ? 'ciut' : ''}`}>
      <aside className="sidebar tanpa-cetak">
        <IsiSidebar
          lonceng={lonceng}
          pengaturan={pengaturan}
          admin={admin}
          pengguna={pengguna}
          onKeluar={keluar}
        />
      </aside>

      <div className="utama">
        <header className="topbar tanpa-cetak">
          <button
            type="button"
            className="btn btn-hantu btn-ikon hanya-desktop"
            onClick={() => setCiut((c) => !c)}
            aria-label={ciut ? 'Bentangkan panel samping' : 'Ciutkan panel samping'}
            title={ciut ? 'Bentangkan panel samping' : 'Ciutkan panel samping'}
            aria-pressed={ciut}
          >
            <Icon nama="panel" ukuran={18} />
          </button>

          <div className="isi">
            <div className="topbar-judul trunc">{meta.judul}</div>
            <div className="topbar-sub trunc hanya-desktop">{meta.sub}</div>
          </div>

          <div className="topbar-aksi">
            <JamSekarang />
            {!halamanKasir ? (
              <NavLink to="/kasir" className="btn btn-primer btn-sm">
                <Icon nama="kasir" ukuran={14} />
                <span className="hanya-desktop">Transaksi Baru</span>
                <span className="hanya-mobile">Kasir</span>
              </NavLink>
            ) : null}
          </div>
        </header>

        <main className={halamanKasir ? 'konten-rapat' : 'konten'}>{children}</main>
      </div>

      <nav className="bottomnav tanpa-cetak" aria-label="Navigasi cepat">
        {BILAH_BAWAH.map((m) => (
          <NavLink
            key={m.ke}
            to={m.ke}
            end={m.ujung}
            className={({ isActive }) => `bottomnav-item ${isActive ? 'aktif' : ''}`}
          >
            <Icon nama={m.ikon} ukuran={19} />
            {m.nama}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
