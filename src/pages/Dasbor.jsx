/* =========================================================================
   Dasbor — ringkasan operasional: apa yang terjadi hari ini dan
   apa yang perlu ditindak sekarang (stok kritis).
   ========================================================================= */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import Icon from '../components/Icon.jsx'
import { BaganBatang, Peringkat } from '../components/Bagan.jsx'
import {
  Kartu,
  Kosong,
  Lencana,
  LencanaMetode,
  Stat,
} from '../components/UI.jsx'
import { useStatus } from '../store/konteks.js'
import {
  dalamRentang,
  delta,
  deretHarian,
  nilaiPersediaan,
  produkTerlaris,
  ringkas,
  stokKritis,
} from '../lib/analitik.js'
import {
  angka,
  awalBulan,
  hariPendek,
  jam,
  rupiah,
  rupiahSingkat,
  tambahHari,
  tanggal,
} from '../lib/format.js'

export default function Dasbor() {
  const { transaksi, produk, pengaturan } = useStatus()

  const data = useMemo(() => {
    const hariIni = new Date()
    const kemarin = tambahHari(hariIni, -1)

    const trxHariIni = dalamRentang(transaksi, hariIni, hariIni)
    const trxKemarin = dalamRentang(transaksi, kemarin, kemarin)
    const trxBulanIni = dalamRentang(transaksi, awalBulan(hariIni), hariIni)
    const trx30 = dalamRentang(transaksi, tambahHari(hariIni, -29), hariIni)

    const rHariIni = ringkas(trxHariIni)
    const rKemarin = ringkas(trxKemarin)
    const rBulan = ringkas(trxBulanIni)

    return {
      rHariIni,
      rKemarin,
      rBulan,
      deret: deretHarian(transaksi, tambahHari(hariIni, -6), hariIni),
      terlaris: produkTerlaris(trx30, 5),
      persediaan: nilaiPersediaan(produk),
      kritis: stokKritis(produk),
      terakhir: transaksi.slice(0, 7),
    }
  }, [transaksi, produk])

  const { rHariIni, rKemarin, rBulan, deret, terlaris, persediaan, kritis, terakhir } =
    data

  const perluPerhatian = [...kritis.habis, ...kritis.menipis].slice(0, 6)
  const totalKritis = kritis.habis.length + kritis.menipis.length

  if (!produk.length) {
    return (
      <div className="halaman">
        <Kartu>
          <Kosong
            ikon="kotak"
            judul="Belum ada produk"
            pesan="Tambahkan produk terlebih dahulu agar kasir, stok, dan laporan bisa berjalan."
            aksi={
              <Link to="/produk" className="btn btn-primer">
                <Icon nama="tambah" ukuran={15} />
                Tambah produk pertama
              </Link>
            }
          />
        </Kartu>
      </div>
    )
  }

  return (
    <div className="halaman">
      <div className="halaman-kepala">
        <div className="isi">
          <h1>Selamat bertugas, {pengaturan.kasir?.split(' ')[0] || 'Kasir'}</h1>
          <p>
            {pengaturan.namaToko} • {tanggal(new Date())}
          </p>
        </div>
        <Link to="/kasir" className="btn btn-primer">
          <Icon nama="kasir" ukuran={15} />
          Mulai Transaksi
        </Link>
      </div>

      {/* --------------------------- Angka utama --------------------------- */}
      <div className="grid-stat">
        <Stat
          utama
          label="Penjualan hari ini"
          ikon="uang"
          nilai={rupiah(rHariIni.omzet)}
          perubahan={delta(rHariIni.omzet, rKemarin.omzet)}
          kaki={`vs kemarin ${rupiahSingkat(rKemarin.omzet)}`}
        />
        <Stat
          label="Transaksi"
          ikon="struk"
          nilai={angka(rHariIni.jumlahTransaksi)}
          perubahan={delta(rHariIni.jumlahTransaksi, rKemarin.jumlahTransaksi)}
          kaki={`rata-rata ${rupiahSingkat(rHariIni.rataPerTransaksi)}/nota`}
        />
        <Stat
          label="Item terjual"
          ikon="kotak"
          nilai={angka(rHariIni.itemTerjual)}
          perubahan={delta(rHariIni.itemTerjual, rKemarin.itemTerjual)}
          kaki={`${rHariIni.rataItemPerTransaksi.toFixed(1)} item/nota`}
        />
        <Stat
          label="Laba kotor hari ini"
          ikon="naik"
          nilai={rupiah(rHariIni.labaKotor)}
          perubahan={delta(rHariIni.labaKotor, rKemarin.labaKotor)}
          kaki={`margin ${rHariIni.marginPersen.toFixed(1)}%`}
        />
      </div>

      {/* ----------------------- Kolom utama + samping --------------------- */}
      <div className="grid-dash">
        <div className="col g16">
          <Kartu
            judul="Penjualan 7 hari terakhir"
            sub={`Total ${rupiah(deret.reduce((a, d) => a + d.omzet, 0))}`}
            aksi={
              <Link to="/laporan" className="btn btn-sm">
                Laporan lengkap
                <Icon nama="kanan" ukuran={13} />
              </Link>
            }
          >
            <BaganBatang
              ariaLabel="Grafik penjualan tujuh hari terakhir"
              data={deret.map((d) => ({
                label: hariPendek(d.tanggal),
                judul: tanggal(d.tanggal),
                nilai: d.omzet,
                sub: `${angka(d.transaksi)} transaksi`,
              }))}
              format={rupiah}
            />
          </Kartu>

          <Kartu
            judul="Transaksi terakhir"
            rapat
            aksi={
              <Link to="/penjualan" className="btn btn-sm">
                Lihat semua
                <Icon nama="kanan" ukuran={13} />
              </Link>
            }
          >
            {terakhir.length === 0 ? (
              <Kosong
                ikon="struk"
                judul="Belum ada transaksi"
                pesan="Transaksi yang dibuat di halaman Kasir akan tampil di sini."
              />
            ) : (
              <div className="tabel-bungkus">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th>No. Nota</th>
                      <th className="hanya-desktop">Waktu</th>
                      <th>Item</th>
                      <th className="hanya-desktop">Metode</th>
                      <th className="kanan-teks">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terakhir.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="sel-utama num sm">{t.nomor}</div>
                          <div className="sel-sub hanya-mobile">{jam(t.tanggal)}</div>
                          {t.status === 'void' ? (
                            <div style={{ marginTop: 3 }}>
                              <Lencana warna="merah">Dibatalkan</Lencana>
                            </div>
                          ) : null}
                        </td>
                        <td className="hanya-desktop num muted">{jam(t.tanggal)}</td>
                        <td>
                          <span className="num">{angka(t.item.length)}</span>
                          <span className="muted xs"> jenis</span>
                        </td>
                        <td className="hanya-desktop">
                          <LencanaMetode metode={t.metode} />
                        </td>
                        <td className="kanan-teks">
                          <span
                            className="rp tebal"
                            style={
                              t.status === 'void'
                                ? { textDecoration: 'line-through', opacity: 0.5 }
                                : undefined
                            }
                          >
                            {rupiah(t.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Kartu>
        </div>

        <div className="col g16">
          {/* Panel tindakan: paling penting untuk operasional harian */}
          <Kartu
            judul="Perlu segera ditangani"
            sub={
              totalKritis
                ? `${kritis.habis.length} habis • ${kritis.menipis.length} menipis`
                : 'Semua stok dalam batas aman'
            }
            ikon={totalKritis ? 'peringatan' : 'centang-bulat'}
            rapat
            aksi={
              totalKritis ? (
                <Link to="/stok" className="btn btn-sm btn-lunak">
                  Kelola stok
                </Link>
              ) : null
            }
          >
            {totalKritis === 0 ? (
              <div style={{ padding: '18px 14px' }}>
                <div className="info-box info-box-hijau">
                  <Icon nama="centang-bulat" ukuran={16} />
                  <span>
                    Tidak ada produk di bawah stok minimum. Persediaan aman untuk
                    operasional hari ini.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="peringkat">
                  {perluPerhatian.map((p) => (
                    <div className="peringkat-baris" key={p.id}>
                      <span className="peringkat-no">
                        <Icon
                          nama="peringatan"
                          ukuran={13}
                          className={p.stok <= 0 ? 'turun' : ''}
                        />
                      </span>
                      <div>
                        <div className="peringkat-nama trunc">{p.nama}</div>
                        <div className="xs tersier num">
                          sisa {angka(p.stok)} {p.satuan} • min {angka(p.stokMin)}
                        </div>
                      </div>
                      <Lencana warna={p.stok <= 0 ? 'merah' : 'kuning'} titik>
                        {p.stok <= 0 ? 'Habis' : 'Menipis'}
                      </Lencana>
                    </div>
                  ))}
                </div>
                {totalKritis > perluPerhatian.length ? (
                  <div
                    className="xs muted"
                    style={{ padding: '9px 14px', borderTop: '1px solid var(--line)' }}
                  >
                    +{totalKritis - perluPerhatian.length} produk lain perlu diperiksa
                  </div>
                ) : null}
              </>
            )}
          </Kartu>

          <Kartu judul="Produk terlaris" sub="30 hari terakhir" rapat>
            <Peringkat
              data={terlaris.map((p) => ({
                id: p.produkId,
                nama: p.nama,
                nilai: p.qty,
                sub: `${rupiahSingkat(p.omzet)} • laba ${rupiahSingkat(p.laba)}`,
              }))}
              format={(n) => `${angka(n)} terjual`}
            />
          </Kartu>

          <Kartu judul="Posisi bulan ini" ikon="kalender">
            <dl className="rincian">
              <div className="rincian-baris">
                <dt>Omzet</dt>
                <dd>{rupiah(rBulan.omzet)}</dd>
              </div>
              <div className="rincian-baris">
                <dt>Jumlah transaksi</dt>
                <dd>{angka(rBulan.jumlahTransaksi)}</dd>
              </div>
              <div className="rincian-baris">
                <dt>Laba kotor</dt>
                <dd className="naik">{rupiah(rBulan.labaKotor)}</dd>
              </div>
              <div className="rincian-baris">
                <dt>Nilai persediaan (modal)</dt>
                <dd>{rupiah(persediaan.modal)}</dd>
              </div>
              <div className="rincian-baris rincian-total">
                <dt>Rata-rata per nota</dt>
                <dd>{rupiah(rBulan.rataPerTransaksi)}</dd>
              </div>
            </dl>
          </Kartu>
        </div>
      </div>
    </div>
  )
}
