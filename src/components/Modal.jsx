import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import Icon from './Icon.jsx'

/* Kunci gulir halaman dengan hitungan referensi.
   Diperlukan karena modal bisa bertumpuk (mis. rincian nota → konfirmasi
   pembatalan); tanpa hitungan, modal terdalam yang tertutup terakhir akan
   meninggalkan <body> dalam keadaan tidak bisa digulir.                    */
let jumlahKunci = 0

function kunciGulir() {
  jumlahKunci += 1
  if (jumlahKunci === 1) {
    document.body.dataset.gulirLama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}

function lepasGulir() {
  jumlahKunci = Math.max(0, jumlahKunci - 1)
  if (jumlahKunci === 0) {
    document.body.style.overflow = document.body.dataset.gulirLama || ''
    delete document.body.dataset.gulirLama
  }
}

/**
 * Dialog modal. Dipasang ke <body> lewat portal agar tidak terpengaruh
 * elemen bertransform (misalnya sheet keranjang di mobile).
 */
export default function Modal({
  buka,
  tutup,
  judul,
  keterangan,
  ukuran = '',
  kaki,
  children,
  tanpaTutup = false,
  kelasIsi = '',
}) {
  const kotak = useRef(null)
  const pemicuSebelumnya = useRef(null)

  const tanganiTuts = useCallback(
    (e) => {
      if (e.key === 'Escape' && !tanpaTutup) {
        e.stopPropagation()
        tutup()
        return
      }
      if (e.key !== 'Tab' || !kotak.current) return
      const fokusable = kotak.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!fokusable.length) return
      const pertama = fokusable[0]
      const terakhir = fokusable[fokusable.length - 1]
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault()
        terakhir.focus()
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault()
        pertama.focus()
      }
    },
    [tutup, tanpaTutup],
  )

  useEffect(() => {
    if (!buka) return undefined
    pemicuSebelumnya.current = document.activeElement
    kunciGulir()

    const t = setTimeout(() => {
      const target =
        kotak.current?.querySelector('[data-fokus-awal]') ||
        kotak.current?.querySelector(
          'input:not([type="hidden"]):not([disabled]), select, textarea, button',
        )
      target?.focus()
    }, 30)

    return () => {
      clearTimeout(t)
      lepasGulir()
      // Kembalikan fokus hanya bila pemicunya masih ada di halaman
      const pemicu = pemicuSebelumnya.current
      if (pemicu instanceof HTMLElement && document.contains(pemicu)) {
        pemicu.focus()
      }
    }
  }, [buka])

  if (!buka) return null

  return createPortal(
    <div
      className="modal-tirai tanpa-cetak"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !tanpaTutup) tutup()
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={`modal ${ukuran ? `modal-${ukuran}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof judul === 'string' ? judul : undefined}
        ref={kotak}
        onKeyDown={tanganiTuts}
      >
        {judul ? (
          <header className="modal-kepala">
            <div className="isi">
              <h2>{judul}</h2>
              {keterangan ? <p>{keterangan}</p> : null}
            </div>
            {!tanpaTutup ? (
              <button
                type="button"
                className="btn btn-hantu btn-ikon btn-sm"
                onClick={tutup}
                aria-label="Tutup"
              >
                <Icon nama="tutup" ukuran={15} />
              </button>
            ) : null}
          </header>
        ) : null}

        <div className={`modal-isi ${kelasIsi}`}>{children}</div>

        {kaki ? <footer className="modal-kaki">{kaki}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

/** Dialog konfirmasi untuk aksi yang sulit dibatalkan */
export function Konfirmasi({
  buka,
  tutup,
  onSetuju,
  judul = 'Konfirmasi',
  pesan,
  labelSetuju = 'Ya, lanjutkan',
  labelBatal = 'Batal',
  bahaya = false,
  children,
}) {
  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={judul}
      ukuran="sm"
      kaki={
        <>
          <button type="button" className="btn" onClick={tutup}>
            {labelBatal}
          </button>
          <button
            type="button"
            className={`btn kanan ${bahaya ? 'btn-bahaya-isi' : 'btn-primer'}`}
            onClick={() => {
              onSetuju()
              tutup()
            }}
          >
            {labelSetuju}
          </button>
        </>
      }
    >
      <div className={`info-box ${bahaya ? 'info-box-merah' : 'info-box-netral'}`}>
        <Icon nama={bahaya ? 'peringatan' : 'info'} ukuran={16} />
        <span>{pesan}</span>
      </div>
      {children}
    </Modal>
  )
}
