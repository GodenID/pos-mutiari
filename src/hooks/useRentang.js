/* Status periode laporan: pintasan ("7 hari", "Bulan ini") + rentang manual */

import { useCallback, useMemo, useState } from 'react'

import {
  akhirBulan,
  awalBulan,
  awalHari,
  labelRentang,
  tambahBulan,
  tambahHari,
} from '../lib/format.js'

export const PRESET = [
  { id: 'hari-ini', nama: 'Hari ini' },
  { id: 'kemarin', nama: 'Kemarin' },
  { id: '7hari', nama: '7 hari' },
  { id: '30hari', nama: '30 hari' },
  { id: 'bulan-ini', nama: 'Bulan ini' },
  { id: 'bulan-lalu', nama: 'Bulan lalu' },
  { id: 'pilih', nama: 'Pilih tanggal' },
]

export function rentangDariPreset(preset, acuan = new Date()) {
  const hariIni = awalHari(acuan)
  switch (preset) {
    case 'kemarin': {
      const k = tambahHari(hariIni, -1)
      return { dari: k, sampai: k }
    }
    case '7hari':
      return { dari: tambahHari(hariIni, -6), sampai: hariIni }
    case '30hari':
      return { dari: tambahHari(hariIni, -29), sampai: hariIni }
    case 'bulan-ini':
      return { dari: awalBulan(hariIni), sampai: hariIni }
    case 'bulan-lalu': {
      const awal = tambahBulan(hariIni, -1)
      return { dari: awal, sampai: awalHari(akhirBulan(awal)) }
    }
    case 'hari-ini':
    default:
      return { dari: hariIni, sampai: hariIni }
  }
}

export default function useRentang(presetAwal = '7hari') {
  const [preset, setPreset] = useState(presetAwal)
  const [manual, setManual] = useState(() => rentangDariPreset(presetAwal))

  const rentang = useMemo(
    () => (preset === 'pilih' ? manual : rentangDariPreset(preset)),
    [preset, manual],
  )

  const setDari = useCallback((tgl) => {
    setPreset('pilih')
    setManual((m) => ({ dari: tgl, sampai: m.sampai < tgl ? tgl : m.sampai }))
  }, [])

  const setSampai = useCallback((tgl) => {
    setPreset('pilih')
    setManual((m) => ({ dari: m.dari > tgl ? tgl : m.dari, sampai: tgl }))
  }, [])

  return {
    preset,
    setPreset,
    dari: rentang.dari,
    sampai: rentang.sampai,
    setDari,
    setSampai,
    label: labelRentang(rentang.dari, rentang.sampai),
  }
}
