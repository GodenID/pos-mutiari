/* =========================================================================
   Laporan — ringkasan periode, laba kotor, produk terlaris, dan persediaan.
   Semua tab bisa dicetak (lembar A4) dan diekspor ke CSV.
   ========================================================================= */

import { useMemo, useRef, useState } from 'react'

import Icon from '../components/Icon.jsx'
import { BaganBatang, Peringkat, PorsiBaris } from '../components/Bagan.jsx'
import RentangTanggal from '../components/RentangTanggal.jsx'
import useRentang from '../hooks/useRentang.js'
import { Kartu, Kosong, Lencana, Stat, TabBar } from '../components/UI.jsx'
import { useStatus, useToast } from '../store/konteks.js'
import {
  dalamRentang,
  delta,
  deretHarian,
  deretJam,
  marginProduk,
  nilaiPersediaan,
  perKasir,
  perKategori,
  perMetode,
  periodeSebelumnya,
  produkTerlaris,
  ringkas,
  statusStok,
} from '../lib/analitik.js'
import { labelMetode } from '../data/seed.js'
import { cetakElemen } from '../lib/cetak.js'
import {
  angka,
  desimal,
  hariPendek,
  persen,
  rupiah,
  rupiahSingkat,
  tanggal,
  tanggalJam,
} from '../lib/format.js'
import { stempelFile, unduhCsv } from '../lib/csv.js'

const TAB = [
  { id: 'ringkasan', nama: 'Ringkasan' },
  { id: 'laba', nama: 'Laba Kotor Harian' },
  { id: 'produk', nama: 'Produk Terlaris' },
  { id: 'stok', nama: 'Persediaan' },
]

export default function Laporan() {
  const { transaksi, produk, pengaturan, meta } = useStatus()
  const toast = useToast()

  const rentang = useRentang('30hari')
  const [tab, setTab] = useState('ringkasan')
  const acuanCetak = useRef(null)

  const data = useMemo(() => {
    const kini = dalamRentang(transaksi, rentang.dari, rentang.sampai)
    const lalu = periodeSebelumnya(rentang.dari, rentang.sampai)
    const sebelum = dalamRentang(transaksi, lalu.dari, lalu.sampai)

    const harian = deretHarian(transaksi, rentang.dari, rentang.sampai)

    // Rentang panjang dikelompokkan per minggu agar bagan tetap terbaca
    let bagan = harian.map((d) => ({
      label: hariPendek(d.tanggal),
      judul: tanggal(d.tanggal),
      nilai: d.omzet,
      sub: `${angka(d.transaksi)} transaksi`,
    }))

    if (harian.length > 31) {
      const kelompok = []
      for (let i = 0; i < harian.length; i += 7) {
        const potong = harian.slice(i, i + 7)
        kelompok.push({
          label: `${potong[0].tanggal.getDate()}/${potong[0].tanggal.getMonth() + 1}`,
          judul: `${tanggal(potong[0].tanggal)} – ${tanggal(
            potong[potong.length - 1].tanggal,
          )}`,
          nilai: potong.reduce((a, d) => a + d.omzet, 0),
          sub: `${angka(potong.reduce((a, d) => a + d.transaksi, 0))} transaksi`,
        })
      }
      bagan = kelompok
    }

    return {
      kini,
      rKini: ringkas(kini),
      rSebelum: ringkas(sebelum),
      labelSebelum: `${tanggal(lalu.dari)} – ${tanggal(lalu.sampai)}`,
      harian,
      bagan,
      jam: deretJam(kini),
      metode: perMetode(kini),
      kategori: perKategori(kini, produk),
      kasir: perKasir(kini),
      terlaris: produkTerlaris(kini, 0),
      persediaan: nilaiPersediaan(produk),
    }
  }, [transaksi, produk, rentang.dari, rentang.sampai])

  const judulTab = TAB.find((t) => t.id === tab)?.nama || 'Laporan'

  const cetak = () =>
    cetakElemen(
      acuanCetak.current,
      'lembar',
      `Laporan ${judulTab} — ${pengaturan.namaToko}`,
    )

  const ekspor = () => {
    if (tab === 'produk') {
      unduhCsv(
        `produk_terlaris_${stempelFile()}`,
        ['Peringkat', 'SKU', 'Produk', 'Qty Terjual', 'Omzet', 'Laba Kotor'],
        data.terlaris.map((p, i) => [i + 1, p.sku, p.nama, p.qty, p.omzet, p.laba]),
        [`Produk Terlaris — ${rentang.label}`, `Dicetak ${tanggalJam(new Date())}`],
      )
    } else if (tab === 'laba') {
      unduhCsv(
        `laba_kotor_${stempelFile()}`,
        ['Tanggal', 'Transaksi', 'Item Terjual', 'Omzet', 'Laba Kotor'],
        data.harian.map((d) => [
          tanggal(d.tanggal),
          d.transaksi,
          d.item,
          d.omzet,
          d.laba,
        ]),
        [`Laba Kotor Harian — ${rentang.label}`, `Dicetak ${tanggalJam(new Date())}`],
      )
    } else if (tab === 'stok') {
      unduhCsv(
        `persediaan_${stempelFile()}`,
        [
          'SKU',
          'Produk',
          'Kategori',
          'Stok',
          'Satuan',
          'Harga Beli',
          'Nilai Modal',
          'Harga Jual',
          'Nilai Jual',
          'Margin %',
          'Status',
        ],
        produk.map((p) => [
          p.sku,
          p.nama,
          p.kategori,
          p.stok,
          p.satuan,
          p.hargaBeli,
          p.hargaBeli * p.stok,
          p.hargaJual,
          p.hargaJual * p.stok,
          Number(marginProduk(p).toFixed(1)),
          { habis: 'Habis', menipis: 'Menipis', aman: 'Aman' }[statusStok(p)],
        ]),
        [
          `Laporan Persediaan — ${tanggal(new Date())}`,
          `Nilai modal ${rupiah(data.persediaan.modal)}`,
        ],
      )
    } else {
      unduhCsv(
        `ringkasan_penjualan_${stempelFile()}`,
        ['Tanggal', 'Transaksi', 'Item', 'Omzet', 'Laba Kotor'],
        data.harian.map((d) => [
          tanggal(d.tanggal),
          d.transaksi,
          d.item,
          d.omzet,
          d.laba,
        ]),
        [
          `Ringkasan Penjualan — ${rentang.label}`,
          `Omzet ${rupiah(data.rKini.omzet)} • Laba ${rupiah(data.rKini.labaKotor)}`,
          `Dicetak ${tanggalJam(new Date())}`,
        ],
      )
    }
    toast.sukses('Laporan diekspor ke CSV')
  }

  return (
    <div className="halaman halaman-lebar">
      <div className="halaman-kepala tanpa-cetak">
        <div className="isi">
          <h1>Laporan</h1>
          <p>
            {rentang.label} • dibandingkan dengan {data.labelSebelum}
          </p>
        </div>
        <div className="row g6">
          <button type="button" className="btn" onClick={cetak}>
            <Icon nama="cetak" ukuran={15} />
            <span className="hanya-desktop">Cetak</span>
          </button>
          <button type="button" className="btn btn-primer" onClick={ekspor}>
            <Icon nama="unduh" ukuran={15} />
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="tanpa-cetak">
        <RentangTanggal rentang={rentang} />

      {meta?.transaksi?.terpotong ? (
        <div className="info-box info-box-kuning tanpa-cetak">
          <Icon nama="peringatan" ukuran={16} />
          <span>
            Hanya {angka(transaksi.length)} dari {angka(meta.transaksi.total)} transaksi
            terbaru yang dimuat — angka periode lama bisa kurang lengkap.
          </span>
        </div>
      ) : null}
      </div>

      <div className="tanpa-cetak">
        <TabBar label="Jenis laporan" opsi={TAB} nilai={tab} onUbah={setTab} />
      </div>

      {/* Bagian yang dicetak */}
      <div ref={acuanCetak} className="col g16">
        <div className="cetak-kepala cetak-saja">
          <h1>
            {pengaturan.namaToko} — Laporan {judulTab}
          </h1>
          <p>
            Periode {rentang.label} • dicetak {tanggalJam(new Date())}
            {pengaturan.alamat ? ` • ${pengaturan.alamat}` : ''}
          </p>
        </div>

        {tab === 'ringkasan' ? <TabRingkasan data={data} /> : null}
        {tab === 'laba' ? <TabLaba data={data} /> : null}
        {tab === 'produk' ? <TabProduk data={data} rentang={rentang} /> : null}
        {tab === 'stok' ? <TabStok produk={produk} data={data} /> : null}
      </div>
    </div>
  )
}

/* =============================== Ringkasan =============================== */

function TabRingkasan({ data }) {
  const { rKini, rSebelum, bagan, jam, metode, kategori, kasir } = data

  const jamSibuk = [...jam].sort((a, b) => b.omzet - a.omzet)[0]
  const jamTampil = jam.filter((j) => j.jam >= 6 && j.jam <= 23)

  return (
    <>
      <div className="grid-stat">
        <Stat
          utama
          label="Omzet"
          ikon="uang"
          nilai={rupiah(rKini.omzet)}
          perubahan={delta(rKini.omzet, rSebelum.omzet)}
          kaki={`periode lalu ${rupiahSingkat(rSebelum.omzet)}`}
        />
        <Stat
          label="Laba kotor"
          ikon="naik"
          nilai={rupiah(rKini.labaKotor)}
          perubahan={delta(rKini.labaKotor, rSebelum.labaKotor)}
          kaki={`margin ${persen(rKini.marginPersen, 1)}`}
        />
        <Stat
          label="Transaksi"
          ikon="struk"
          nilai={angka(rKini.jumlahTransaksi)}
          perubahan={delta(rKini.jumlahTransaksi, rSebelum.jumlahTransaksi)}
          kaki={`${angka(rKini.itemTerjual)} item terjual`}
        />
        <Stat
          label="Rata-rata per nota"
          ikon="hitung"
          nilai={rupiah(rKini.rataPerTransaksi)}
          perubahan={delta(rKini.rataPerTransaksi, rSebelum.rataPerTransaksi)}
          kaki={`${desimal(rKini.rataItemPerTransaksi, 1)} item/nota`}
        />
      </div>

      <Kartu
        judul="Pergerakan omzet"
        sub={`Total ${rupiah(rKini.omzet)} • HPP ${rupiah(rKini.hpp)} • laba ${rupiah(
          rKini.labaKotor,
        )}`}
      >
        <BaganBatang data={bagan} format={rupiah} ariaLabel="Grafik omzet per periode" />
      </Kartu>

      <div className="grid-2">
        <Kartu judul="Metode pembayaran" rapat>
          {metode.length === 0 ? (
            <Kosong ikon="dompet" judul="Belum ada pembayaran" />
          ) : (
            <div className="peringkat">
              {metode.map((m) => (
                <PorsiBaris
                  key={m.metode}
                  nama={labelMetode(m.metode)}
                  nilai={m.omzet}
                  porsi={m.porsi}
                  sub={`${angka(m.transaksi)} transaksi`}
                />
              ))}
            </div>
          )}
        </Kartu>

        <Kartu judul="Penjualan per kategori" rapat>
          {kategori.length === 0 ? (
            <Kosong ikon="label" judul="Belum ada penjualan" />
          ) : (
            <div className="peringkat">
              {kategori.slice(0, 7).map((k) => (
                <PorsiBaris
                  key={k.kategori}
                  nama={k.kategori}
                  nilai={k.omzet}
                  porsi={k.porsi}
                  sub={`${angka(k.qty)} item • laba ${rupiahSingkat(k.laba)}`}
                />
              ))}
            </div>
          )}
        </Kartu>
      </div>

      <div className="grid-2">
        <Kartu
          judul="Jam tersibuk"
          sub={
            jamSibuk && jamSibuk.omzet > 0
              ? `Puncak pukul ${String(jamSibuk.jam).padStart(2, '0')}:00 — ${rupiah(
                  jamSibuk.omzet,
                )}`
              : 'Belum ada data'
          }
        >
          <BaganBatang
            data={jamTampil.map((j) => ({
              label: j.jam % 3 === 0 ? String(j.jam).padStart(2, '0') : '',
              judul: `Pukul ${String(j.jam).padStart(2, '0')}:00`,
              nilai: j.omzet,
              sub: `${angka(j.transaksi)} transaksi`,
            }))}
            format={rupiah}
            ariaLabel="Grafik omzet per jam"
          />
        </Kartu>

        <Kartu judul="Kinerja kasir" rapat>
          {kasir.length === 0 ? (
            <Kosong ikon="pengguna" judul="Belum ada transaksi" />
          ) : (
            <div className="tabel-bungkus">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Kasir</th>
                    <th className="kanan-teks">Transaksi</th>
                    <th className="kanan-teks">Omzet</th>
                    <th className="kanan-teks">Rata/nota</th>
                  </tr>
                </thead>
                <tbody>
                  {kasir.map((k) => (
                    <tr key={k.kasir}>
                      <td className="sel-utama">{k.kasir}</td>
                      <td className="kanan-teks num">{angka(k.transaksi)}</td>
                      <td className="kanan-teks rp tebal">{rupiah(k.omzet)}</td>
                      <td className="kanan-teks rp muted">
                        {rupiah(k.omzet / k.transaksi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kartu>
      </div>

      <Kartu judul="Rekap angka periode ini">
        <div className="grid-2" style={{ gap: 24 }}>
          <dl className="rincian">
            <div className="rincian-baris">
              <dt>Penjualan bruto (sebelum diskon)</dt>
              <dd>{rupiah(rKini.omzet + rKini.diskon - rKini.pajak)}</dd>
            </div>
            <div className="rincian-baris">
              <dt>Diskon diberikan</dt>
              <dd className="turun">-{rupiah(rKini.diskon)}</dd>
            </div>
            <div className="rincian-baris">
              <dt>Pajak dipungut</dt>
              <dd>{rupiah(rKini.pajak)}</dd>
            </div>
            <div className="rincian-baris rincian-total">
              <dt>Omzet bersih</dt>
              <dd>{rupiah(rKini.omzet)}</dd>
            </div>
          </dl>

          <dl className="rincian">
            <div className="rincian-baris">
              <dt>Harga pokok penjualan (HPP)</dt>
              <dd>{rupiah(rKini.hpp)}</dd>
            </div>
            <div className="rincian-baris">
              <dt>Jenis item terjual</dt>
              <dd>{angka(rKini.barisItem)}</dd>
            </div>
            <div className="rincian-baris">
              <dt>Nota dibatalkan</dt>
              <dd>{angka(rKini.dibatalkan)}</dd>
            </div>
            <div className="rincian-baris rincian-total">
              <dt>Laba kotor</dt>
              <dd className="naik">{rupiah(rKini.labaKotor)}</dd>
            </div>
          </dl>
        </div>
      </Kartu>
    </>
  )
}

/* ============================== Laba kotor =============================== */

function TabLaba({ data }) {
  const { harian, rKini } = data
  const adaData = harian.some((d) => d.transaksi > 0)

  return (
    <>
      <div className="grid-stat">
        <Stat utama label="Omzet" ikon="uang" nilai={rupiah(rKini.omzet)} />
        <Stat label="HPP (modal terjual)" ikon="kotak" nilai={rupiah(rKini.hpp)} />
        <Stat label="Laba kotor" ikon="naik" nilai={rupiah(rKini.labaKotor)} />
        <Stat
          label="Margin rata-rata"
          ikon="bagan"
          nilai={persen(rKini.marginPersen, 1)}
          kaki="laba kotor ÷ omzet"
        />
      </div>

      <Kartu judul="Rincian per hari" rapat>
        {!adaData ? (
          <Kosong
            ikon="bagan"
            judul="Belum ada transaksi pada periode ini"
            pesan="Pilih periode lain atau catat transaksi lewat halaman Kasir."
          />
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th className="kanan-teks">Transaksi</th>
                  <th className="kanan-teks">Item</th>
                  <th className="kanan-teks">Omzet</th>
                  <th className="kanan-teks">Laba kotor</th>
                  <th className="kanan-teks">Margin</th>
                </tr>
              </thead>
              <tbody>
                {harian
                  .slice()
                  .reverse()
                  .map((d) => (
                    <tr key={d.kunci}>
                      <td>
                        <div className="sel-utama sm">{tanggal(d.tanggal)}</div>
                        <div className="sel-sub">{hariPendek(d.tanggal)}</div>
                      </td>
                      <td className="kanan-teks num">{angka(d.transaksi)}</td>
                      <td className="kanan-teks num">{angka(d.item)}</td>
                      <td className="kanan-teks rp tebal">{rupiah(d.omzet)}</td>
                      <td className="kanan-teks rp">
                        <span className={d.laba > 0 ? 'naik' : 'tersier'}>
                          {rupiah(d.laba)}
                        </span>
                      </td>
                      <td className="kanan-teks num muted">
                        {d.omzet ? persen((d.laba / d.omzet) * 100, 1) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total periode</td>
                  <td className="kanan-teks num">{angka(rKini.jumlahTransaksi)}</td>
                  <td className="kanan-teks num">{angka(rKini.itemTerjual)}</td>
                  <td className="kanan-teks rp">{rupiah(rKini.omzet)}</td>
                  <td className="kanan-teks rp naik">{rupiah(rKini.labaKotor)}</td>
                  <td className="kanan-teks num">{persen(rKini.marginPersen, 1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Kartu>
    </>
  )
}

/* ============================ Produk terlaris ============================ */

function TabProduk({ data }) {
  const { terlaris } = data
  const totalQty = terlaris.reduce((a, p) => a + p.qty, 0)
  const totalOmzet = terlaris.reduce((a, p) => a + p.omzet, 0)
  const totalLaba = terlaris.reduce((a, p) => a + p.laba, 0)

  return (
    <>
      <div className="grid-2">
        <Kartu judul="10 produk paling banyak terjual" rapat>
          <Peringkat
            data={terlaris.slice(0, 10).map((p) => ({
              id: p.produkId,
              nama: p.nama,
              nilai: p.qty,
              sub: `${rupiahSingkat(p.omzet)} • laba ${rupiahSingkat(p.laba)}`,
            }))}
            format={(n) => `${angka(n)} terjual`}
          />
        </Kartu>

        <Kartu judul="10 penyumbang laba terbesar" rapat>
          <Peringkat
            data={[...terlaris]
              .sort((a, b) => b.laba - a.laba)
              .slice(0, 10)
              .map((p) => ({
                id: p.produkId,
                nama: p.nama,
                nilai: p.laba,
                sub: `${angka(p.qty)} terjual • omzet ${rupiahSingkat(p.omzet)}`,
              }))}
            format={rupiahSingkat}
          />
        </Kartu>
      </div>

      <Kartu judul="Semua produk terjual pada periode ini" rapat>
        {terlaris.length === 0 ? (
          <Kosong ikon="label" judul="Belum ada produk terjual" />
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Produk</th>
                  <th className="kanan-teks">Qty</th>
                  <th className="kanan-teks">Omzet</th>
                  <th className="kanan-teks">Laba kotor</th>
                  <th className="kanan-teks">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {terlaris.map((p, i) => (
                  <tr key={p.produkId}>
                    <td className="num tersier">{i + 1}</td>
                    <td>
                      <div className="sel-utama sm">{p.nama}</div>
                      <div className="sel-sub num">{p.sku}</div>
                    </td>
                    <td className="kanan-teks num tebal">{angka(p.qty)}</td>
                    <td className="kanan-teks rp">{rupiah(p.omzet)}</td>
                    <td className="kanan-teks rp naik">{rupiah(p.laba)}</td>
                    <td className="kanan-teks num muted">
                      {totalOmzet ? persen((p.omzet / totalOmzet) * 100, 1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total {angka(terlaris.length)} jenis produk</td>
                  <td className="kanan-teks num">{angka(totalQty)}</td>
                  <td className="kanan-teks rp">{rupiah(totalOmzet)}</td>
                  <td className="kanan-teks rp naik">{rupiah(totalLaba)}</td>
                  <td className="kanan-teks num">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Kartu>
    </>
  )
}

/* ============================== Persediaan =============================== */

function TabStok({ produk, data }) {
  const { persediaan } = data

  const perKat = useMemo(() => {
    const peta = new Map()
    produk.forEach((p) => {
      const s = peta.get(p.kategori) || {
        kategori: p.kategori,
        sku: 0,
        unit: 0,
        modal: 0,
        jual: 0,
      }
      s.sku += 1
      s.unit += p.stok
      s.modal += p.hargaBeli * p.stok
      s.jual += p.hargaJual * p.stok
      peta.set(p.kategori, s)
    })
    return [...peta.values()].sort((a, b) => b.modal - a.modal)
  }, [produk])

  const perluRestok = useMemo(
    () =>
      produk
        .filter((p) => statusStok(p) !== 'aman')
        .sort((a, b) => a.stok - b.stok),
    [produk],
  )

  const totalModal = persediaan.modal || 1

  return (
    <>
      <div className="grid-stat">
        <Stat
          utama
          label="Nilai persediaan (modal)"
          ikon="dompet"
          nilai={rupiah(persediaan.modal)}
          kaki={`${angka(persediaan.sku)} SKU • ${angka(persediaan.unit)} unit`}
        />
        <Stat
          label="Nilai jual persediaan"
          ikon="label"
          nilai={rupiah(persediaan.jual)}
          kaki="bila seluruh stok terjual"
        />
        <Stat
          label="Potensi laba"
          ikon="naik"
          nilai={rupiah(persediaan.potensiLaba)}
          kaki={`margin ${persen(
            persediaan.jual ? (persediaan.potensiLaba / persediaan.jual) * 100 : 0,
            1,
          )}`}
        />
        <Stat
          label="Perlu restok"
          ikon="peringatan"
          nilai={angka(perluRestok.length)}
          kaki="habis atau di bawah minimum"
        />
      </div>

      <div className="grid-2">
        <Kartu judul="Nilai persediaan per kategori" rapat>
          <div className="peringkat">
            {perKat.map((k) => (
              <PorsiBaris
                key={k.kategori}
                nama={k.kategori}
                nilai={k.modal}
                porsi={(k.modal / totalModal) * 100}
                sub={`${angka(k.sku)} SKU • ${angka(k.unit)} unit`}
              />
            ))}
          </div>
        </Kartu>

        <Kartu
          judul="Daftar perlu restok"
          sub={`${angka(perluRestok.length)} produk`}
          rapat
        >
          {perluRestok.length === 0 ? (
            <Kosong
              ikon="centang-bulat"
              judul="Semua stok aman"
              pesan="Tidak ada produk di bawah stok minimum."
            />
          ) : (
            <div className="tabel-bungkus" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th className="kanan-teks">Stok</th>
                    <th className="kanan-teks">Min</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {perluRestok.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="sel-utama sm">{p.nama}</div>
                        <div className="sel-sub">{p.kategori}</div>
                      </td>
                      <td className="kanan-teks num tebal">{angka(p.stok)}</td>
                      <td className="kanan-teks num muted">{angka(p.stokMin)}</td>
                      <td>
                        <Lencana warna={p.stok <= 0 ? 'merah' : 'kuning'} titik>
                          {p.stok <= 0 ? 'Habis' : 'Menipis'}
                        </Lencana>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kartu>
      </div>

      <Kartu judul="Rekap persediaan per kategori" rapat>
        <div className="tabel-bungkus">
          <table className="tabel">
            <thead>
              <tr>
                <th>Kategori</th>
                <th className="kanan-teks">SKU</th>
                <th className="kanan-teks">Unit</th>
                <th className="kanan-teks">Nilai modal</th>
                <th className="kanan-teks">Nilai jual</th>
                <th className="kanan-teks">Potensi laba</th>
              </tr>
            </thead>
            <tbody>
              {perKat.map((k) => (
                <tr key={k.kategori}>
                  <td className="sel-utama">{k.kategori}</td>
                  <td className="kanan-teks num">{angka(k.sku)}</td>
                  <td className="kanan-teks num">{angka(k.unit)}</td>
                  <td className="kanan-teks rp tebal">{rupiah(k.modal)}</td>
                  <td className="kanan-teks rp muted">{rupiah(k.jual)}</td>
                  <td className="kanan-teks rp naik">{rupiah(k.jual - k.modal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="kanan-teks num">{angka(persediaan.sku)}</td>
                <td className="kanan-teks num">{angka(persediaan.unit)}</td>
                <td className="kanan-teks rp">{rupiah(persediaan.modal)}</td>
                <td className="kanan-teks rp">{rupiah(persediaan.jual)}</td>
                <td className="kanan-teks rp naik">{rupiah(persediaan.potensiLaba)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Kartu>
    </>
  )
}
