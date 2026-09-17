/* =========================================================================
   Komponen kecil yang dipakai berulang di seluruh halaman
   ========================================================================= */

import { useId } from 'react'

import Icon from './Icon.jsx'
import { angka, persen } from '../lib/format.js'
import { statusStok } from '../lib/analitik.js'
import { labelMetode } from '../data/seed.js'

/* --------------------------------- Kartu --------------------------------- */

export function Kartu({
  judul,
  sub,
  ikon,
  aksi,
  kaki,
  rapat = false,
  className = '',
  children,
}) {
  return (
    <section className={`kartu ${className}`}>
      {judul || aksi ? (
        <header className="kartu-kepala">
          {ikon ? <Icon nama={ikon} ukuran={16} className="tersier" /> : null}
          <div className="isi">
            <h3>{judul}</h3>
            {sub ? <div className="kartu-sub">{sub}</div> : null}
          </div>
          {aksi ? <div className="row g6">{aksi}</div> : null}
        </header>
      ) : null}
      <div className={rapat ? 'kartu-isi-rapat' : 'kartu-isi'}>{children}</div>
      {kaki ? <footer className="kartu-kaki">{kaki}</footer> : null}
    </section>
  )
}

/* ------------------------------ Kartu angka ------------------------------ */

export function Stat({ label, nilai, ikon, utama = false, kaki, perubahan }) {
  return (
    <article className={`stat ${utama ? 'stat-utama' : ''}`}>
      <div className="stat-kepala">
        {ikon ? <Icon nama={ikon} ukuran={15} /> : null}
        <span className="label" style={{ color: 'inherit' }}>
          {label}
        </span>
      </div>
      <div className="stat-nilai" title={typeof nilai === 'string' ? nilai : undefined}>
        {nilai}
      </div>
      {perubahan !== undefined || kaki ? (
        <div className="stat-kaki">
          {perubahan !== undefined ? <Perubahan nilai={perubahan} /> : null}
          {kaki ? <span>{kaki}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

export function Perubahan({ nilai, terbalik = false }) {
  if (nilai === null || nilai === undefined) {
    return <span className="delta tersier">baru</span>
  }
  const naik = nilai > 0
  const netral = Math.abs(nilai) < 0.05
  const baik = terbalik ? !naik : naik
  return (
    <span className={`delta ${netral ? 'tersier' : baik ? 'naik' : 'turun'}`}>
      {netral ? null : (
        <Icon nama={naik ? 'naik' : 'turun'} ukuran={12} tebal={2.1} />
      )}
      {netral ? '±0%' : `${naik ? '+' : ''}${persen(nilai, 1)}`}
    </span>
  )
}

/* -------------------------------- Lencana -------------------------------- */

export function Lencana({ warna = 'netral', titik = false, ikon, children }) {
  return (
    <span className={`lencana lencana-${warna}`}>
      {titik ? <i className="titik" /> : null}
      {ikon ? <Icon nama={ikon} ukuran={11} tebal={2.2} /> : null}
      {children}
    </span>
  )
}

export function LencanaStok({ produk, ringkas = false }) {
  const s = statusStok(produk)
  if (s === 'habis') {
    return (
      <Lencana warna="merah" titik>
        {ringkas ? 'Habis' : 'Stok habis'}
      </Lencana>
    )
  }
  if (s === 'menipis') {
    return (
      <Lencana warna="kuning" titik>
        {ringkas ? 'Menipis' : 'Perlu restok'}
      </Lencana>
    )
  }
  return (
    <Lencana warna="hijau" titik>
      Aman
    </Lencana>
  )
}

const WARNA_METODE = {
  tunai: 'hijau',
  qris: 'biru',
  debit: 'netral',
  transfer: 'netral',
}

export function LencanaMetode({ metode }) {
  return (
    <Lencana warna={WARNA_METODE[metode] || 'netral'}>{labelMetode(metode)}</Lencana>
  )
}

export function LencanaStatusTrx({ status }) {
  return status === 'void' ? (
    <Lencana warna="merah" ikon="batal">
      Dibatalkan
    </Lencana>
  ) : (
    <Lencana warna="hijau" ikon="centang">
      Selesai
    </Lencana>
  )
}

/* ------------------------------ Batang stok ------------------------------ */

export function BatangStok({ produk }) {
  const s = statusStok(produk)
  const acuan = Math.max(produk.stokMin * 3, produk.stok, 1)
  const lebar = Math.max(2, Math.min(100, (produk.stok / acuan) * 100))
  return (
    <div
      className={`stok-batang ${s === 'menipis' ? 'tipis' : ''} ${
        s === 'habis' ? 'habis' : ''
      }`}
      title={`Stok ${angka(produk.stok)} • minimum ${angka(produk.stokMin)}`}
    >
      <i style={{ width: `${produk.stok <= 0 ? 100 : lebar}%` }} />
    </div>
  )
}

/* ---------------------------- Keadaan kosong ----------------------------- */

export function Kosong({ ikon = 'kotak', judul, pesan, aksi }) {
  return (
    <div className="kosong">
      <div className="kosong-ikon">
        <Icon nama={ikon} ukuran={20} />
      </div>
      <h4>{judul}</h4>
      {pesan ? <p>{pesan}</p> : null}
      {aksi}
    </div>
  )
}

/* -------------------------------- Pencarian ------------------------------ */

export function KotakCari({
  nilai,
  onUbah,
  placeholder = 'Cari…',
  className = '',
  ...sisa
}) {
  return (
    <div className={`cari ${className}`}>
      <Icon nama="cari" ukuran={15} />
      <input
        type="search"
        className="inp"
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder={placeholder}
        {...sisa}
      />
      {nilai ? (
        <button
          type="button"
          className="cari-bersih"
          onClick={() => onUbah('')}
          aria-label="Hapus pencarian"
        >
          <Icon nama="tutup" ukuran={13} />
        </button>
      ) : null}
    </div>
  )
}

/* --------------------------------- Segmen -------------------------------- */

export function Segmen({ opsi, nilai, onUbah, label }) {
  return (
    <div className="segmen" role="group" aria-label={label}>
      {opsi.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={nilai === o.id}
          onClick={() => onUbah(o.id)}
        >
          {o.nama}
        </button>
      ))}
    </div>
  )
}

export function TabBar({ opsi, nilai, onUbah, label }) {
  return (
    <div className="tab-bar" role="tablist" aria-label={label}>
      {opsi.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          className="tab"
          aria-selected={nilai === o.id}
          onClick={() => onUbah(o.id)}
        >
          {o.nama}
          {o.hitung !== undefined ? (
            <span className="num tersier" style={{ marginLeft: 5 }}>
              {angka(o.hitung)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- Form ---------------------------------- */

export function Bidang({ label, petunjuk, galat, wajib, penuh, children }) {
  return (
    <div className={`bidang ${penuh ? 'rentang-penuh' : ''}`}>
      {label ? (
        <label>
          {label}
          {wajib ? <span style={{ color: 'var(--danger)' }}> *</span> : null}
        </label>
      ) : null}
      {children}
      {galat ? <span className="bidang-galat">{galat}</span> : null}
      {!galat && petunjuk ? <span className="bidang-petunjuk">{petunjuk}</span> : null}
    </div>
  )
}

/** Input rupiah dengan pemisah ribuan otomatis saat mengetik */
export function InpRupiah({ nilai, onUbah, className = '', ...sisa }) {
  return (
    <div className="inp-grup">
      <span className="inp-awalan">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        className={`inp inp-num ${className}`}
        value={nilai === '' || nilai === null ? '' : angka(nilai)}
        onChange={(e) => {
          const digit = e.target.value.replace(/[^\d]/g, '')
          onUbah(digit === '' ? '' : Number(digit))
        }}
        onFocus={(e) => e.target.select()}
        {...sisa}
      />
    </div>
  )
}

export function InpAngka({ nilai, onUbah, akhiran, className = '', ...sisa }) {
  return (
    <div className="inp-grup">
      <input
        type="text"
        inputMode="numeric"
        className={`inp inp-num ${className}`}
        value={nilai === '' || nilai === null ? '' : angka(nilai)}
        onChange={(e) => {
          const digit = e.target.value.replace(/[^\d]/g, '')
          onUbah(digit === '' ? '' : Number(digit))
        }}
        onFocus={(e) => e.target.select()}
        {...sisa}
      />
      {akhiran ? <span className="inp-akhiran">{akhiran}</span> : null}
    </div>
  )
}

export function Sakelar({ label, keterangan, checked, onChange, disabled }) {
  const id = useId()
  return (
    <div className="row g10">
      <label className="sakelar" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="sakelar-jalur" />
        <span className="col">
          <span className="tebal sm">{label}</span>
          {keterangan ? <span className="xs muted">{keterangan}</span> : null}
        </span>
      </label>
    </div>
  )
}

/* ------------------------------- Paginasi -------------------------------- */

export function Paginasi({ halaman, totalData, perHalaman, onUbah }) {
  const totalHalaman = Math.max(1, Math.ceil(totalData / perHalaman))
  if (totalData === 0) return null

  const awal = (halaman - 1) * perHalaman + 1
  const akhir = Math.min(halaman * perHalaman, totalData)

  const nomor = []
  const dari = Math.max(1, Math.min(halaman - 1, totalHalaman - 2))
  const sampai = Math.min(totalHalaman, dari + 2)
  for (let i = dari; i <= sampai; i += 1) nomor.push(i)

  return (
    <div className="paginasi">
      <span className="paginasi-info">
        Menampilkan <b className="num">{angka(awal)}</b>–
        <b className="num">{angka(akhir)}</b> dari{' '}
        <b className="num">{angka(totalData)}</b> data
      </span>
      <div className="paginasi-nomor kanan">
        <button
          type="button"
          className="pg"
          onClick={() => onUbah(halaman - 1)}
          disabled={halaman <= 1}
          aria-label="Halaman sebelumnya"
        >
          <Icon nama="kiri" ukuran={13} />
        </button>
        {dari > 1 ? (
          <>
            <button type="button" className="pg" onClick={() => onUbah(1)}>
              1
            </button>
            {dari > 2 ? <span className="pg" style={{ border: 0 }}>…</span> : null}
          </>
        ) : null}
        {nomor.map((n) => (
          <button
            key={n}
            type="button"
            className="pg"
            aria-current={n === halaman ? 'page' : undefined}
            onClick={() => onUbah(n)}
          >
            {n}
          </button>
        ))}
        {sampai < totalHalaman ? (
          <>
            {sampai < totalHalaman - 1 ? (
              <span className="pg" style={{ border: 0 }}>…</span>
            ) : null}
            <button type="button" className="pg" onClick={() => onUbah(totalHalaman)}>
              {totalHalaman}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="pg"
          onClick={() => onUbah(halaman + 1)}
          disabled={halaman >= totalHalaman}
          aria-label="Halaman berikutnya"
        >
          <Icon nama="kanan" ukuran={13} />
        </button>
      </div>
    </div>
  )
}

/* -------------------------------- Lain-lain ------------------------------ */

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>
}

export function InfoBox({ warna = 'netral', ikon, children }) {
  const bawaan = {
    merah: 'peringatan',
    kuning: 'peringatan',
    hijau: 'centang-bulat',
    netral: 'info',
  }
  return (
    <div className={`info-box info-box-${warna}`}>
      <Icon nama={ikon || bawaan[warna]} ukuran={16} />
      <div className="isi">{children}</div>
    </div>
  )
}

/** Sel judul kolom yang bisa diurutkan */
export function ThUrut({ children, kunci, urut, onUrut, kanan = false }) {
  const aktif = urut.kunci === kunci
  return (
    <th
      className={`urut ${kanan ? 'kanan-teks' : ''}`}
      onClick={() => onUrut(kunci)}
      aria-sort={aktif ? (urut.arah === 'naik' ? 'ascending' : 'descending') : 'none'}
    >
      {children}
      {aktif ? (
        <span className="panah">{urut.arah === 'naik' ? '↑' : '↓'}</span>
      ) : null}
    </th>
  )
}

/** Baris rincian label–nilai */
export function RincianBaris({ label, nilai, total = false }) {
  return (
    <div className={`rincian-baris ${total ? 'rincian-total' : ''}`}>
      <dt>{label}</dt>
      <dd>{nilai}</dd>
    </div>
  )
}
