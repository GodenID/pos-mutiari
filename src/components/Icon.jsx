/* =========================================================================
   Set ikon garis 24×24 — satu gaya untuk seluruh aplikasi.
   Tanpa emoji, tanpa campur beberapa gaya ikon.
   ========================================================================= */

const BENTUK = {
  dasbor: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
    </>
  ),
  kasir: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3.5h2.2l2.1 11.1a1.6 1.6 0 0 0 1.6 1.3h9.4a1.6 1.6 0 0 0 1.6-1.3l1.4-7.1H6" />
    </>
  ),
  kotak: (
    <>
      <path d="M20.5 7.8v8.4a1.7 1.7 0 0 1-.9 1.5l-6.8 3.7a1.7 1.7 0 0 1-1.6 0l-6.8-3.7a1.7 1.7 0 0 1-.9-1.5V7.8a1.7 1.7 0 0 1 .9-1.5l6.8-3.7a1.7 1.7 0 0 1 1.6 0l6.8 3.7a1.7 1.7 0 0 1 .9 1.5z" />
      <path d="M3.7 7 12 11.6 20.3 7M12 21V11.6" />
    </>
  ),
  gudang: (
    <>
      <path d="M12 2.6 21 7l-9 4.4L3 7z" />
      <path d="M3 12l9 4.4L21 12" />
      <path d="M3 17l9 4.4L21 17" />
    </>
  ),
  struk: (
    <>
      <path d="M6 2.5h12a1 1 0 0 1 1 1V21l-2.3-1.4-2.4 1.4-2.3-1.4L9.7 21l-2.4-1.4L5 21V3.5a1 1 0 0 1 1-1z" />
      <path d="M8.5 7h7M8.5 11h7M8.5 15h4" />
    </>
  ),
  bagan: (
    <>
      <path d="M3 21h18" />
      <rect x="4.5" y="12" width="4" height="6" rx="1" />
      <rect x="10.5" y="7.5" width="4" height="10.5" rx="1" />
      <rect x="16.5" y="4" width="4" height="14" rx="1" />
    </>
  ),
  roda: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.1 14.9a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  cari: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.9-4.9" />
    </>
  ),
  scan: (
    <>
      <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5A2.5 2.5 0 0 1 18.5 21H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
      <path d="M7 12h10" />
    </>
  ),
  barcode: (
    <>
      <path d="M3.5 6v12M6.5 6v12M10 6v12M13.5 6v8M17 6v12M20.5 6v12" />
    </>
  ),
  tambah: <path d="M12 5v14M5 12h14" />,
  kurang: <path d="M5 12h14" />,
  tutup: <path d="M18 6 6 18M6 6l12 12" />,
  centang: <path d="M20 6 9 17l-5-5" />,
  'centang-bulat': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.5 9.5" />
    </>
  ),
  peringatan: (
    <>
      <path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3l-7.8-13.5a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4.5M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  sampah: (
    <>
      <path d="M3.5 6.5h17M9 6.5V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2v2.3" />
      <path d="M5.5 6.5l.9 13a1.6 1.6 0 0 0 1.6 1.5h8a1.6 1.6 0 0 0 1.6-1.5l.9-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  ubah: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="M14.5 5.5l3 3" />
    </>
  ),
  kanan: <path d="m9 6 6 6-6 6" />,
  kiri: <path d="m15 6-6 6 6 6" />,
  bawah: <path d="m6 9 6 6 6-6" />,
  atas: <path d="m6 15 6-6 6 6" />,
  'panah-kanan': <path d="M4 12h15M13 6l6 6-6 6" />,
  cetak: (
    <>
      <path d="M6.5 9V3.5h11V9" />
      <path d="M6.5 17.5H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-1.5" />
      <rect x="6.5" y="14" width="11" height="7" rx="1" />
    </>
  ),
  unduh: (
    <>
      <path d="M12 3.5v11M7.5 10 12 14.5 16.5 10" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9.5 4v16" />
    </>
  ),
  truk: (
    <>
      <path d="M2.5 6.5h11V16H2.5zM13.5 10h4l3 3v3h-7z" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  orang: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  pengguna: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 6.1" />
    </>
  ),
  kalender: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  uang: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  kartu: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6.5 15h3" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <path d="M14 14h2.5M20 14v2.5M17 17h3.5M14 17.5V20M17 20.5h3.5" />
    </>
  ),
  transfer: (
    <>
      <path d="M3 8.5h14M13.5 5 17 8.5 13.5 12" />
      <path d="M21 15.5H7M10.5 12 7 15.5 10.5 19" />
    </>
  ),
  'muat-ulang': (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 4v5h-5" />
    </>
  ),
  saring: (
    <>
      <path d="M3.5 6.5h17M6.5 12h11M10 17.5h4" />
    </>
  ),
  label: (
    <>
      <path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1-.6-1.4V4.5a2 2 0 0 1 2-2h8.3a2 2 0 0 1 1.4.6l6.1 6.1a2 2 0 0 1 0 2.8z" />
      <path d="M7.5 7.5h.01" />
    </>
  ),
  naik: (
    <>
      <path d="M3.5 17 10 10.5l3.5 3.5L20.5 7" />
      <path d="M15.5 7h5v5" />
    </>
  ),
  turun: (
    <>
      <path d="M3.5 7 10 13.5l3.5-3.5L20.5 17" />
      <path d="M15.5 17h5v-5" />
    </>
  ),
  jam: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.5 2" />
    </>
  ),
  riwayat: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.3l3 1.8" />
    </>
  ),
  toko: (
    <>
      <path d="M3.5 9.5V20a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V9.5" />
      <path d="M2.5 9.5 4.8 4a1 1 0 0 1 .9-.6h12.6a1 1 0 0 1 .9.6l2.3 5.5z" />
      <path d="M9.5 21v-6.5h5V21" />
    </>
  ),
  simpan: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M7 3v5h8V3.5M7 15h10v6H7z" />
    </>
  ),
  mata: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  batal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  'papan-tuts': (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M18 13h.01M9.5 14.5h5" />
    </>
  ),
  masuk: (
    <>
      <path d="M12 3v11M7.5 9.5 12 14l4.5-4.5" />
      <path d="M4 18.5h16" />
    </>
  ),
  keluar: (
    <>
      <path d="M12 14V3M7.5 7.5 12 3l4.5 4.5" />
      <path d="M4 18.5h16" />
    </>
  ),
  sesuai: (
    <>
      <path d="M4 6.5h9M17 6.5h3M4 17.5h3M11 17.5h9M4 12h5M13 12h7" />
      <circle cx="15" cy="6.5" r="2" />
      <circle cx="9" cy="17.5" r="2" />
      <circle cx="11" cy="12" r="2" />
    </>
  ),
  keranjang: (
    <>
      <path d="M3 5.5h2l1.8 9.4a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
  kosong: (
    <>
      <path d="M4 7.5h16l-1.3 12.1a1.6 1.6 0 0 1-1.6 1.4H6.9a1.6 1.6 0 0 1-1.6-1.4z" />
      <path d="M9 4.5h6M10 11.5v5M14 11.5v5" />
    </>
  ),
  gunting: (
    <>
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M8 8l12 9M20 7 8 16" />
    </>
  ),
  hitung: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="2" />
      <path d="M8 6.5h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15v3M8 18.5h6" />
    </>
  ),
  kunci: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.2v2.1" />
    </>
  ),
  perisai: (
    <>
      <path d="M12 2.8 20 6v6c0 5-3.4 8.3-8 9.2C7.4 20.3 4 17 4 12V6z" />
      <path d="m9 11.8 2.2 2.2 4-4.2" />
    </>
  ),
  dompet: (
    <>
      <path d="M20 7.5H5.5A2.5 2.5 0 0 1 3 5v13a2.5 2.5 0 0 0 2.5 2.5H20a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1z" />
      <path d="M3 5a2.5 2.5 0 0 1 2.5-2.5H17V7.5" />
      <path d="M16.5 14h.01" />
    </>
  ),
  eksternal: (
    <>
      <path d="M15 4h5v5" />
      <path d="M20 4l-9 9" />
      <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
    </>
  ),
}

/**
 * @param {{nama:string, ukuran?:number, tebal?:number, className?:string}} props
 */
export default function Icon({ nama, ukuran = 17, tebal = 1.7, className }) {
  const bentuk = BENTUK[nama]
  if (!bentuk) return null
  return (
    <svg
      className={className}
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={tebal}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {bentuk}
    </svg>
  )
}
