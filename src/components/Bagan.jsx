/* Bagan sederhana berbasis div — cukup untuk data harian/jam
   tanpa menambah pustaka bagan.                                            */

import { angka, rupiah, rupiahSingkat } from '../lib/format.js'
import { Kosong } from './UI.jsx'

/**
 * @param {{data: Array<{label:string, nilai:number, judul?:string, sub?:string}>,
 *          format?: (n:number)=>string, tinggi?: number}} props
 */
export function BaganBatang({ data, format = rupiah, ariaLabel }) {
  const maks = Math.max(...data.map((d) => d.nilai), 1)
  const semuaNol = data.every((d) => d.nilai === 0)

  if (!data.length) {
    return <Kosong ikon="bagan" judul="Belum ada data" />
  }

  return (
    <div className="bagan" role="img" aria-label={ariaLabel}>
      {data.map((d) => {
        const tinggi = semuaNol ? 0 : (d.nilai / maks) * 100
        const puncak = !semuaNol && d.nilai === maks
        return (
          <div
            key={d.label + d.judul}
            className={`bagan-kolom ${puncak ? 'puncak' : ''}`}
            tabIndex={0}
          >
            <span className="bagan-tip">
              {d.judul ? `${d.judul} — ` : ''}
              {format(d.nilai)}
              {d.sub ? ` • ${d.sub}` : ''}
            </span>
            <div
              className="bagan-batang"
              style={{ height: `calc(${Math.max(tinggi, 0)}% - 20px)` }}
            />
            <span className="bagan-label">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Daftar peringkat dengan jalur proporsi.
 * @param {{data: Array<{id:string, nama:string, nilai:number, sub?:string}>}} props
 */
export function Peringkat({ data, format = angka, kosongPesan }) {
  if (!data.length) {
    return (
      <Kosong
        ikon="label"
        judul="Belum ada penjualan"
        pesan={kosongPesan || 'Data akan muncul setelah ada transaksi pada periode ini.'}
      />
    )
  }
  const maks = Math.max(...data.map((d) => d.nilai), 1)
  return (
    <div className="peringkat">
      {data.map((d, i) => (
        <div className="peringkat-baris" key={d.id}>
          <span className="peringkat-no">{i + 1}</span>
          <div>
            <div className="peringkat-nama trunc">{d.nama}</div>
            {d.sub ? <div className="xs tersier num">{d.sub}</div> : null}
            <div className="peringkat-jalur">
              <i style={{ width: `${Math.max(3, (d.nilai / maks) * 100)}%` }} />
            </div>
          </div>
          <span className="rp tebal sm">{format(d.nilai)}</span>
        </div>
      ))}
    </div>
  )
}

/** Baris porsi (mis. metode pembayaran) */
export function PorsiBaris({ nama, nilai, porsi, sub }) {
  return (
    <div className="peringkat-baris" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
      <div>
        <div className="row antara g10">
          <span className="peringkat-nama">{nama}</span>
          <span className="xs muted num">{porsi.toFixed(0)}%</span>
        </div>
        <div className="peringkat-jalur">
          <i style={{ width: `${Math.max(2, porsi)}%` }} />
        </div>
        {sub ? <div className="xs tersier" style={{ marginTop: 3 }}>{sub}</div> : null}
      </div>
      <span className="rp tebal sm">{rupiahSingkat(nilai)}</span>
    </div>
  )
}
