/* Pemilih periode dengan pintasan yang biasa dipakai pemilik toko */

import Icon from './Icon.jsx'
import { PRESET } from '../hooks/useRentang.js'
import { dariKunci, kunciTanggal } from '../lib/format.js'

export default function RentangTanggal({ rentang, ringkas = false }) {
  const { preset, setPreset, dari, sampai, setDari, setSampai } = rentang
  const daftar = ringkas ? PRESET.filter((p) => p.id !== 'bulan-lalu') : PRESET

  return (
    <div className="periode-kotak">
      <Icon nama="kalender" ukuran={15} className="tersier" />
      <div className="chip-baris">
        {daftar.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={preset === p.id}
            onClick={() => setPreset(p.id)}
          >
            {p.nama}
          </button>
        ))}
      </div>
      {preset === 'pilih' ? (
        <div className="row g6">
          <input
            type="date"
            className="inp-tgl"
            value={kunciTanggal(dari)}
            max={kunciTanggal(sampai)}
            onChange={(e) => e.target.value && setDari(dariKunci(e.target.value))}
            aria-label="Tanggal mulai"
          />
          <span className="tersier xs">s.d.</span>
          <input
            type="date"
            className="inp-tgl"
            value={kunciTanggal(sampai)}
            min={kunciTanggal(dari)}
            max={kunciTanggal(new Date())}
            onChange={(e) => e.target.value && setSampai(dariKunci(e.target.value))}
            aria-label="Tanggal akhir"
          />
        </div>
      ) : null}
    </div>
  )
}
