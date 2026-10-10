/* Notifikasi email transaksi via Resend (HTTP API, tanpa SMTP).
   Env:
     RESEND_API_KEY  = re_xxx (wajib, isi di Coolify)
     EMAIL_FROM      = "Mutiari Garden POS <kasir@domainmu.com>" (harus domain terverifikasi di Resend;
                       untuk coba-coba boleh "POS <onboarding@resend.dev>" tapi hanya bisa kirim ke email pemilik akun Resend)
     NOTIF_EMAIL_1 / NOTIF_EMAIL_2 = penerima bawaan (bisa juga diubah lewat halaman Pengaturan)
*/

const RESEND_URL = 'https://api.resend.com/emails'

const rupiah = (n) =>
  `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))}`

const ZONA = 'Asia/Jakarta'

function bagianWaktu(d) {
  const t = d instanceof Date ? d : new Date(d)
  const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: ZONA }).format(t)
  const tanggal = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA,
  }).format(t)
  const jam = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA,
  }).format(t).replace('.', ':')
  return { hari, tanggal, jam, lengkap: `${hari}, ${tanggal} • ${jam} WIB` }
}

/* Kompatibel: string ringkas "10 Okt 2026 • 14:30" */
export const tanggalJamID = (d) => {
  const b = bagianWaktu(d)
  return `${b.tanggal} • ${b.jam}`
}

const LABEL_METODE = { tunai: 'Tunai', qris: 'QRIS', debit: 'Kartu Debit', transfer: 'Transfer Bank' }
const labelMetode = (m) => LABEL_METODE[String(m || '').toLowerCase()] || String(m || 'Tunai')

const WARNA_METODE = {
  tunai: { bg: '#dcfce7', fg: '#166534', label: 'TUNAI' },
  qris: { bg: '#dbeafe', fg: '#1d4ed8', label: 'QRIS' },
  debit: { bg: '#fef3c7', fg: '#92400e', label: 'KARTU DEBIT' },
  transfer: { bg: '#e0e7ff', fg: '#4338ca', label: 'TRANSFER' },
}
const warnaMetode = (m) => WARNA_METODE[String(m || '').toLowerCase()] || WARNA_METODE.tunai

function emailValid(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())
}

export function daftarPenerimaNotif(pengaturan = {}) {
  const dariEnv = [process.env.NOTIF_EMAIL_1, process.env.NOTIF_EMAIL_2]
  const dariSetting = [pengaturan.emailNotif1, pengaturan.emailNotif2]
  const semua = [...dariSetting, ...dariEnv]
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(emailValid)
  return [...new Set(semua)].slice(0, 10)
}

export function notifAktif(pengaturan = {}) {
  if (pengaturan.emailNotifAktif === false) return false
  // default: aktif bila ada penerima + ada API key
  return true
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function susunEmailTransaksi(trx, pengaturan = {}) {
  const namaToko = pengaturan.namaToko || 'Mutiari Store'
  const alamatToko = pengaturan.alamat || ''
  const teleponToko = pengaturan.telepon || ''
  const w = bagianWaktu(trx.tanggal)
  const metodeUtama = trx.metode || trx.pembayaran?.[0]?.metode || 'tunai'
  const wm = warnaMetode(metodeUtama)
  const totalDiskon = (trx.diskonItem || 0) + (trx.diskon || 0)
  const jumlahItem = (trx.item || []).reduce((a, b) => a + (b.qty || 0), 0)

  const bayarRinci = (trx.pembayaran?.length ? trx.pembayaran : [{ metode: metodeUtama, jumlah: trx.bayar }])
    .map((p) => `${labelMetode(p.metode)} ${rupiah(p.jumlah)}`)
    .join(' + ')

  const barisItem = (trx.item || [])
    .map(
      (it, i) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2ee;font-size:12px;color:#94a3b8;vertical-align:top;width:28px;">${String(i + 1).padStart(2, '0')}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2ee;vertical-align:top;">
          <div style="font-size:13.5px;font-weight:600;color:#1a2e1f;">${esc(it.nama)}</div>
          <div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">${esc(it.sku || '-')}${it.satuan ? ` &nbsp;•&nbsp; per ${esc(it.satuan)}` : ''}</div>
        </td>
        <td align="center" style="padding:10px 8px;border-bottom:1px solid #eef2ee;font-size:13px;font-weight:700;color:#1a2e1f;vertical-align:top;white-space:nowrap;">${it.qty}×</td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid #eef2ee;font-size:12.5px;color:#64748b;vertical-align:top;white-space:nowrap;">${rupiah(it.harga)}</td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid #eef2ee;font-size:13px;font-weight:700;color:#1a2e1f;vertical-align:top;white-space:nowrap;">${rupiah(it.subtotal)}</td>
      </tr>`,
    )
    .join('')

  const subject = `[Mutiari Store POS] Transaksi ${trx.nomor} — ${rupiah(trx.total)}`

  const text = [
    `POINT OF SALE - MUTIARI STORE`,
    `Transaksi baru berhasil`,
    ``,
    `Nomor      : ${trx.nomor}`,
    `Hari       : ${w.hari}`,
    `Tanggal    : ${w.tanggal}`,
    `Jam        : ${w.jam} WIB`,
    `Kasir      : ${trx.kasir || '-'}`,
    `Pelanggan  : ${trx.pelanggan || '-'}`,
    `Pembayaran : ${bayarRinci}`,
    `Status     : LUNAS`,
    ``,
    `RINCIAN ITEM (${jumlahItem} pcs):`,
    ...(trx.item || []).map(
      (it, i) => `${i + 1}. ${it.nama} — ${it.qty} x ${rupiah(it.harga)} = ${rupiah(it.subtotal)}`,
    ),
    ``,
    `Subtotal : ${rupiah(trx.subtotal)}`,
    `Diskon   : ${rupiah(totalDiskon)}`,
    `Pajak    : ${rupiah(trx.pajak || 0)}`,
    `TOTAL    : ${rupiah(trx.total)}`,
    `Bayar    : ${rupiah(trx.bayar)} (${bayarRinci})`,
    `Kembalian: ${rupiah(trx.kembalian || 0)}`,
    ...(trx.catatan ? [`Catatan  : ${trx.catatan}`] : []),
    ``,
    `${namaToko}${alamatToko ? ` — ${alamatToko}` : ''}${teleponToko ? ` — ${teleponToko}` : ''}`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#eef3ee;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Transaksi ${esc(trx.nomor)} sebesar ${esc(rupiah(trx.total))} via ${esc(labelMetode(metodeUtama))} — ${esc(w.lengkap)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef3ee;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(20,83,45,.12);">

  <!-- garis emas -->
  <tr><td style="height:5px;background:#d9a441;font-size:0;">&nbsp;</td></tr>

  <!-- header brand -->
  <tr><td style="background:#14532d;padding:22px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:44px;height:44px;background:#ffffff;border-radius:12px;text-align:center;vertical-align:middle;">
            <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:800;color:#14532d;">M</span>
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;color:#ffffff;letter-spacing:2px;">MUTIARI STORE</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bbf7d0;letter-spacing:1.5px;margin-top:2px;">POINT OF SALE &bull; NOTIFIKASI TRANSAKSI</div>
          </td>
        </tr></table>
      </td>
      <td align="right" valign="middle">
        <span style="display:inline-block;font-family:Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:1px;color:#14532d;background:#bbf7d0;border-radius:20px;padding:7px 14px;">&#10003; LUNAS</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- hero total -->
  <tr><td style="background:#f0fdf4;padding:26px 28px 20px;text-align:center;border-bottom:1px solid #dcfce7;">
    <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;color:#16a34a;">TRANSAKSI BARU BERHASIL</div>
    <div style="font-family:Arial,sans-serif;font-size:34px;font-weight:800;color:#14532d;margin:8px 0 4px;">${esc(rupiah(trx.total))}</div>
    <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#334155;">${esc(trx.nomor)}</div>
    <div style="font-family:Arial,sans-serif;font-size:12.5px;color:#64748b;margin-top:4px;">${esc(w.hari)}, ${esc(w.tanggal)} &bull; Pukul ${esc(w.jam)} WIB &bull; ${jumlahItem} item</div>
  </td></tr>

  <!-- meta info -->
  <tr><td style="padding:20px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" valign="top" style="padding-right:8px;">
          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">KASIR</div>
          <div style="font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;color:#1a2e1f;margin-bottom:12px;">${esc(trx.kasir || '-')}</div>
          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">PELANGGAN</div>
          <div style="font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;color:#1a2e1f;margin-bottom:12px;">${esc(trx.pelanggan || 'Umum')}</div>
        </td>
        <td width="50%" valign="top" style="padding-left:8px;">
          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">PEMBAYARAN</div>
          <div style="margin-bottom:12px;"><span style="display:inline-block;font-family:Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.5px;color:${wm.fg};background:${wm.bg};border-radius:8px;padding:5px 11px;">${esc(wm.label)}</span></div>
          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">WAKTU</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a2e1f;margin-bottom:12px;">${esc(w.jam)} WIB</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- rincian item -->
  <tr><td style="padding:6px 28px 0;">
    <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#14532d;margin-bottom:8px;">RINCIAN ITEM</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5efe5;border-radius:10px;overflow:hidden;">
      <tr style="background:#14532d;">
        <td style="padding:9px 8px;font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:1px;color:#fff;" width="28">NO</td>
        <td style="padding:9px 8px;font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:1px;color:#fff;">ITEM</td>
        <td align="center" style="padding:9px 8px;font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:1px;color:#fff;">QTY</td>
        <td align="right" style="padding:9px 8px;font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:1px;color:#fff;">HARGA</td>
        <td align="right" style="padding:9px 8px;font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:1px;color:#fff;">SUBTOTAL</td>
      </tr>
      ${barisItem}
    </table>
  </td></tr>

  <!-- ringkasan -->
  <tr><td style="padding:16px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf8;border:1px solid #e5efe5;border-radius:10px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">
          <tr><td style="padding:3px 0;">Subtotal</td><td align="right" style="padding:3px 0;font-weight:600;color:#1a2e1f;">${esc(rupiah(trx.subtotal))}</td></tr>
          <tr><td style="padding:3px 0;">Diskon${trx.pajakPersen ? '' : ''}</td><td align="right" style="padding:3px 0;font-weight:600;color:#16a34a;">− ${esc(rupiah(totalDiskon))}</td></tr>
          <tr><td style="padding:3px 0;">Pajak${trx.pajakPersen ? ` (${trx.pajakPersen}%)` : ''}</td><td align="right" style="padding:3px 0;font-weight:600;color:#1a2e1f;">${esc(rupiah(trx.pajak || 0))}</td></tr>
          <tr><td colspan="2" style="padding:6px 0 0;"><div style="border-top:1px dashed #cbd5c9;font-size:0;">&nbsp;</div></td></tr>
          <tr><td style="padding:6px 0 0;font-weight:800;color:#14532d;font-size:14px;">TOTAL</td><td align="right" style="padding:6px 0 0;font-weight:800;color:#14532d;font-size:16px;">${esc(rupiah(trx.total))}</td></tr>
          <tr><td style="padding:3px 0;">Dibayar <span style="color:#94a3b8;">(${esc(bayarRinci)})</span></td><td align="right" style="padding:3px 0;font-weight:600;color:#1a2e1f;">${esc(rupiah(trx.bayar))}</td></tr>
          <tr><td style="padding:3px 0;">Kembalian</td><td align="right" style="padding:3px 0;font-weight:600;color:#1a2e1f;">${esc(rupiah(trx.kembalian || 0))}</td></tr>
        </table>
      </td></tr>
    </table>
    ${trx.catatan ? `<div style="font-family:Arial,sans-serif;font-size:12.5px;color:#64748b;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-top:12px;"><b>Catatan:</b> ${esc(trx.catatan)}</div>` : ''}
  </td></tr>

  <!-- footer -->
  <tr><td style="background:#1a2e1f;padding:20px 28px;margin-top:20px;">
    <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:800;color:#ffffff;letter-spacing:1px;">${esc(namaToko).toUpperCase()}</div>
    ${alamatToko ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#bbf7d0;margin-top:4px;">${esc(alamatToko)}</div>` : ''}
    ${teleponToko ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#bbf7d0;margin-top:2px;">Telp: ${esc(teleponToko)}</div>` : ''}
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#86a389;margin-top:12px;border-top:1px solid #2d4a33;padding-top:12px;">Email otomatis dari Point Of Sale Mutiari Store &bull; Jangan dibalas &bull; Dikirim ${esc(w.lengkap)}</div>
  </td></tr>

</table>
<div style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;margin-top:14px;">&copy; ${new Date().getFullYear()} Mutiari Store — Point Of Sale</div>
</td></tr></table></div></body></html>`

  return { subject, text, html }
}

export async function kirimEmailResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.EMAIL_FROM || 'POS <onboarding@resend.dev>'
  if (!apiKey) throw new Error('RESEND_API_KEY belum diisi di server')
  if (!to.length) throw new Error('Tidak ada alamat email penerima')
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Resend galat (${res.status})`)
  }
  return data
}

/** Kirim notifikasi transaksi — gagal kirim tidak boleh menggagalkan kasir (di-log saja). */
export async function kirimNotifTransaksi(db, trx) {
  try {
    const row = await db.setting.findUnique({ where: { id: 1 } }).catch(() => null)
    const pengaturan = row?.data || {}
    if (!notifAktif(pengaturan)) return { terkirim: false, alasan: 'nonaktif' }
    const to = daftarPenerimaNotif(pengaturan)
    if (!to.length) return { terkirim: false, alasan: 'tanpa-penerima' }
    if (!process.env.RESEND_API_KEY) return { terkirim: false, alasan: 'tanpa-api-key' }
    const { subject, text, html } = susunEmailTransaksi(trx, pengaturan)
    const hasil = await kirimEmailResend({ to, subject, text, html })
    return { terkirim: true, ke: to, id: hasil?.id }
  } catch (e) {
    console.error('[email-notif] gagal kirim:', e?.message || e)
    return { terkirim: false, alasan: e?.message || 'galat' }
  }
}
