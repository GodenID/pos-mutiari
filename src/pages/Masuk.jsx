/* =========================================================================
   Masuk — gerbang login sebelum memakai POS. Kata sandi ter-hash,
   sesi tersimpan per tab peramban (ditutup = keluar otomatis).
   Desain: konsol operasional — kartu ledger yang sama bahasanya
   dengan seluruh aplikasi. Tanpa hero marketing, tanpa dekorasi.
   ========================================================================= */

import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import Icon from '../components/Icon.jsx'
import { useAksi, useSesi, useStatus, useToast } from '../store/konteks.js'

const DEMO = [
  { peran: 'Admin', username: 'admin', sandi: 'admin123' },
  { peran: 'Kasir', username: 'kasir', sandi: 'kasir123' },
]

function tanggalHariIni() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Masuk() {
  const { pengguna } = useSesi()
  const { pengaturan } = useStatus()
  const aksi = useAksi()
  const toast = useToast()
  const navigasi = useNavigate()
  const lokasi = useLocation()

  const [username, setUsername] = useState('')
  const [sandi, setSandi] = useState('')
  const [tampil, setTampil] = useState(false)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [capsAktif, setCapsAktif] = useState(false)

  if (pengguna) {
    const tujuan = lokasi.state?.dari || '/'
    return <Navigate to={tujuan} replace />
  }

  function cekCaps(e) {
    try {
      setCapsAktif(!!e.getModifierState?.('CapsLock'))
    } catch {
      /* abaikan */
    }
  }

  function isiDemo(akun) {
    if (sibuk) return
    setGalat('')
    setUsername(akun.username)
    setSandi(akun.sandi)
    document.getElementById('masuk-sandi')?.focus()
  }

  async function kirim(e) {
    e.preventDefault()
    if (sibuk) return
    if (!username.trim() || !sandi) {
      setGalat('Isi username dan kata sandi terlebih dahulu.')
      return
    }
    setGalat('')
    setSibuk(true)
    const hasil = await aksi.masuk(username, sandi)
    setSibuk(false)
    if (hasil.ok) {
      toast.sukses(`Selamat bertugas, ${hasil.pengguna.nama}`)
      navigasi(lokasi.state?.dari || '/', { replace: true })
    } else {
      setGalat(hasil.galat)
    }
  }

  const namaToko = pengaturan.namaToko || 'Mutiari Garden'

  return (
    <div className="masuk-latar">
      <div className="masuk-kolom">
        <form className="masuk-kartu" onSubmit={kirim} noValidate>
          <div className="masuk-kepala">
            <span className="brand-mark" aria-hidden="true">
              <Icon nama="toko" ukuran={16} />
            </span>
            <div className="isi">
              <div className="masuk-nama">{namaToko}</div>
              <div className="xs muted">Point of Sale</div>
            </div>
            <span className="masuk-tanggal num" title={tanggalHariIni()}>
              {tanggalHariIni()}
            </span>
          </div>

          <div className="masuk-judul">
            <h1>Masuk</h1>
            <p className="sm muted">Masuk untuk membuka shift kasir hari ini.</p>
          </div>

          <div className="col g12">
            <div className="bidang">
              <label htmlFor="masuk-username">Username</label>
              <input
                id="masuk-username"
                className="inp"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mis. kasir01"
                autoComplete="username"
                autoFocus
                disabled={sibuk}
                aria-invalid={!!galat}
              />
            </div>

            <div className="bidang">
              <label htmlFor="masuk-sandi">Kata sandi</label>
              <div className="masuk-sandi">
                <input
                  id="masuk-sandi"
                  className="inp isi"
                  style={{ border: 0 }}
                  type={tampil ? 'text' : 'password'}
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                  onKeyUp={cekCaps}
                  onKeyDown={cekCaps}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={sibuk}
                  aria-invalid={!!galat}
                  aria-describedby={capsAktif ? 'caps-peringatan' : undefined}
                />
                <button
                  type="button"
                  className="btn btn-hantu btn-sm btn-ikon"
                  onClick={() => setTampil((t) => !t)}
                  aria-label={tampil ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  title={tampil ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  tabIndex={-1}
                >
                  <Icon nama={tampil ? 'batal' : 'mata'} ukuran={15} />
                </button>
              </div>
              {capsAktif ? (
                <span id="caps-peringatan" className="masuk-caps" role="status">
                  <Icon nama="peringatan" ukuran={13} />
                  Caps Lock aktif.
                </span>
              ) : null}
            </div>

            {galat ? (
              <div className="info-box info-box-merah" role="alert">
                <Icon nama="peringatan" ukuran={16} />
                <span>{galat}</span>
              </div>
            ) : null}

            <button type="submit" className="btn btn-primer btn-lg btn-blok" disabled={sibuk}>
              {sibuk ? 'Memeriksa…' : 'Masuk'}
            </button>
          </div>

          <div className="masuk-demo">
            <div className="masuk-demo-kepala">
              <span className="label">Akun bawaan</span>
              <span className="xs tersier">klik Isi untuk memakai</span>
            </div>
            {DEMO.map((a) => (
              <div key={a.peran} className="masuk-demo-baris">
                <span className="masuk-demo-peran">{a.peran}</span>
                <span className="masuk-demo-kredensial num">
                  {a.username} / {a.sandi}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => isiDemo(a)}
                  disabled={sibuk}
                >
                  Isi
                </button>
              </div>
            ))}
          </div>

          <p className="masuk-catatan xs muted">
            Sesi terkunci per tab — menutup tab berarti keluar. Ganti sandi bawaan
            di Pengaturan → Pengguna setelah masuk.
          </p>
        </form>
        <p className="masuk-kaki xs tersier">Tersambung ke server toko — data tersimpan terpusat.</p>
      </div>
    </div>
  )
}
