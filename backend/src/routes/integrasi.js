import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db.js'
import { adminOnly, authRequired } from '../auth.js'
import { dekrip, enkrip } from '../lib/kripto.js'
import {
  authorizeUrl,
  dbList,
  formatTanggalAccurate,
  openDb,
  panggilData,
  pastikanSukses,
  segarkanToken,
  tukarKode,
} from '../lib/accurate.js'
import { jurnalPath, panggilJurnal } from '../lib/jurnal.js'

const app = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'ganti-di-coolify-min-32-karakter'
const PROVIDERS = ['accurate', 'jurnal']

function frontendBase() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '')
  const origins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*')
  return (origins[0] || '').replace(/\/$/, '')
}

function publik(rec) {
  const extra = rec?.extra || {}
  const cid = rec?.clientId || ''
  return {
    provider: rec?.provider || '',
    dikonfigurasi: !!cid,
    clientIdTampil: cid ? `${cid.slice(0, 4)}…${cid.slice(-4)}` : '',
    terhubung: rec?.status === 'terhubung',
    status: rec?.status || 'belum',
    redirectUri: extra.redirectUri || '',
    dbId: extra.dbId ? String(extra.dbId) : '',
    dbAlias: extra.dbAlias || '',
    perusahaan: extra.perusahaan || '',
    sandbox: !!extra.sandbox,
    lastCheck: rec?.lastCheck || null,
    lastError: rec?.lastError || '',
  }
}

async function ambil(provider) {
  return db.integration.findUnique({ where: { provider } })
}

/* ------------------------------ Accurate ------------------------------ */

function redirectUriUntuk(extra = {}) {
  if (extra.redirectUri) return extra.redirectUri
  const base = frontendBase()
  if (!base) throw new Error('Isi URL OAuth Callback di pengaturan dulu')
  return `${base}/integrasi/callback`
}

async function konteksAccurate() {
  const rec = await ambil('accurate')
  if (!rec?.clientId) throw new Error('Accurate belum dikonfigurasi')
  const secret = dekrip(rec.secretEnc)
  if (!secret) throw new Error('Client Secret Accurate belum diisi')
  const access = dekrip(rec.accessEnc)
  if (!access) throw new Error('Accurate belum diotorisasi (klik Otorisasi OAuth)')
  return { rec, secret, access, extra: rec.extra || {} }
}

async function simpanTokenAccurate(data) {
  await db.integration.update({
    where: { provider: 'accurate' },
    data: {
      accessEnc: enkrip(data.access_token || ''),
      refreshEnc: enkrip(data.refresh_token || dekrip((await ambil('accurate'))?.refreshEnc || '')),
      lastError: '',
    },
  })
}

async function denganRefresh(ctx, fn) {
  try {
    return await fn(ctx.access)
  } catch (e) {
    const refresh = dekrip(ctx.rec.refreshEnc)
    if (!refresh) throw e
    const data = await segarkanToken({
      clientId: ctx.rec.clientId,
      clientSecret: ctx.secret,
      refreshToken: refresh,
    })
    ctx.access = data.access_token
    await simpanTokenAccurate(data)
    return fn(ctx.access)
  }
}

const panggilAcc = (ctx, token) => (path, opts = {}) =>
  panggilData({ host: ctx.extra.host, session: ctx.extra.session, token, path, ...opts })

async function noCustomer(call, nama) {
  const res = await call('/accurate/api/customer/list.do', { query: { fields: 'id,name,no' } })
  pastikanSukses(res.data, 'membaca pelanggan')
  const cocok = (res.data.d || []).find(
    (r) => String(r.name || '').toLowerCase() === nama.toLowerCase(),
  )
  if (cocok?.no) return cocok.no
  const simpan = await call('/accurate/api/customer/save.do', { method: 'POST', form: { name: nama } })
  pastikanSukses(simpan.data, 'menyimpan pelanggan')
  if (!simpan.data.r?.no) throw new Error('Accurate tidak mengembalikan nomor pelanggan')
  return simpan.data.r.no
}

async function noItem(call, nama) {
  const res = await call('/accurate/api/item/list.do', { query: { fields: 'id,name,no' } })
  pastikanSukses(res.data, 'membaca barang')
  const cocok = (res.data.d || []).find(
    (r) => String(r.name || '').toLowerCase() === nama.toLowerCase(),
  )
  if (cocok?.no) return cocok.no
  const simpan = await call('/accurate/api/item/save.do', {
    method: 'POST',
    form: { name: nama, itemType: 'INVENTORY' },
  })
  pastikanSukses(simpan.data, 'menyimpan barang')
  if (!simpan.data.r?.no) throw new Error(`Accurate tidak mengembalikan nomor barang "${nama}"`)
  return simpan.data.r.no
}

/* -------------------------------- Rute -------------------------------- */

app.get('/', authRequired, async (c) => {
  const semua = await db.integration.findMany()
  const peta = Object.fromEntries(semua.map((r) => [r.provider, publik(r)]))
  return c.json({
    integrasi: {
      accurate: peta.accurate || publik(null),
      jurnal: peta.jurnal || publik(null),
    },
  })
})

const simpanSchema = z.object({
  clientId: z.string().min(1, 'Client ID wajib diisi'),
  clientSecret: z.string().default(''),
  redirectUri: z.string().default(''),
  dbId: z.string().default(''),
  perusahaan: z.string().default(''),
  sandbox: z.boolean().default(false),
})

app.put('/:provider', authRequired, adminOnly, async (c) => {
  const provider = c.req.param('provider')
  if (!PROVIDERS.includes(provider)) return c.json({ error: 'Penyedia tidak dikenal' }, 404)
  const body = await c.req.json().catch(() => ({}))
  const parsed = simpanSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Data tidak valid' }, 400)
  }
  const d = parsed.data
  const lama = await ambil(provider)
  const gantiClient = lama && lama.clientId && lama.clientId !== d.clientId.trim()
  const extraLama = lama?.extra || {}
  const extra = {
    ...extraLama,
    ...(provider === 'accurate'
      ? { redirectUri: d.redirectUri.trim(), ...(d.dbId.trim() ? { dbId: d.dbId.trim() } : {}) }
      : { perusahaan: d.perusahaan.trim(), sandbox: !!d.sandbox }),
  }
  const rec = await db.integration.upsert({
    where: { provider },
    update: {
      clientId: d.clientId.trim(),
      ...(d.clientSecret ? { secretEnc: enkrip(d.clientSecret) } : {}),
      ...(gantiClient ? { accessEnc: '', refreshEnc: '', status: 'belum', lastError: '' } : {}),
      extra,
    },
    create: { provider, clientId: d.clientId.trim(), secretEnc: enkrip(d.clientSecret), extra },
  })
  return c.json({ integrasi: publik(rec) })
})

app.get('/accurate/authorize', authRequired, async (c) => {
  const rec = await ambil('accurate')
  if (!rec?.clientId) return c.json({ error: 'Isi Client ID Accurate dulu' }, 400)
  const user = c.get('user')
  const state = jwt.sign({ t: 'itg-oauth', uid: user?.sub || '' }, JWT_SECRET, { expiresIn: '10m' })
  let redirectUri
  try {
    redirectUri = redirectUriUntuk(rec.extra || {})
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
  return c.json({ url: authorizeUrl({ clientId: rec.clientId, redirectUri, state }) })
})

/* Callback publik (dibuka browser sehabis login Accurate) */
app.get('/accurate/callback', async (c) => {
  const base = frontendBase()
  const gagal = (pesan) => {
    if (base) return c.redirect(`${base}/integrasi/callback?error=${encodeURIComponent(pesan)}`)
    return c.json({ error: pesan }, 400)
  }
  if (c.req.query('error')) return gagal(String(c.req.query('error_description') || c.req.query('error')))
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) return gagal('Callback OAuth tidak lengkap')
  try {
    jwt.verify(state, JWT_SECRET)
  } catch {
    return gagal('State OAuth kedaluwarsa — ulangi dari Pengaturan')
  }
  try {
    const rec = await ambil('accurate')
    if (!rec?.clientId) throw new Error('Konfigurasi Accurate hilang')
    const redirectUri = redirectUriUntuk(rec.extra || {})
    const data = await tukarKode({
      clientId: rec.clientId,
      clientSecret: dekrip(rec.secretEnc),
      code,
      redirectUri,
    })
    await simpanTokenAccurate(data)
    const extra = rec.extra || {}
    if (extra.dbId) {
      try {
        const sesi = await openDb(data.access_token, extra.dbId)
        const daftar = await dbList(data.access_token).catch(() => [])
        const db = daftar.find((x) => String(x.id) === String(extra.dbId))
        await db.integration.update({
          where: { provider: 'accurate' },
          data: {
            extra: { ...extra, session: sesi.session, host: sesi.host, dbAlias: db?.alias || '' },
            status: 'terhubung',
            lastCheck: new Date(),
            lastError: '',
          },
        })
      } catch {
        /* token tersimpan; database dipilih manual di Pengaturan */
      }
    }
    if (base) return c.redirect(`${base}/integrasi/callback?ok=1`)
    return c.json({ ok: true })
  } catch (e) {
    return gagal(e?.message || 'Otorisasi Accurate gagal')
  }
})

app.get('/accurate/db', authRequired, async (c) => {
  try {
    const ctx = await konteksAccurate()
    const daftar = await denganRefresh(ctx, (token) => dbList(token))
    return c.json({ database: daftar.map((d) => ({ id: String(d.id), alias: d.alias || '' })) })
  } catch (e) {
    return c.json({ error: e?.message || 'Gagal membaca database' }, 400)
  }
})

app.post('/accurate/buka-db', authRequired, adminOnly, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const dbId = String(body.dbId || '').trim()
  if (!dbId) return c.json({ error: 'Pilih database dulu' }, 400)
  try {
    const ctx = await konteksAccurate()
    const { daftar, sesi } = await denganRefresh(ctx, async (token) => ({
      daftar: await dbList(token).catch(() => []),
      sesi: await openDb(token, dbId),
    }))
    const db = daftar.find((x) => String(x.id) === String(dbId))
    const rec = await db.integration.update({
      where: { provider: 'accurate' },
      data: {
        extra: { ...(ctx.extra || {}), dbId, session: sesi.session, host: sesi.host, dbAlias: db?.alias || '' },
        status: 'terhubung',
        lastCheck: new Date(),
        lastError: '',
      },
    })
    return c.json({ integrasi: publik(rec) })
  } catch (e) {
    return c.json({ error: e?.message || 'Gagal membuka database' }, 400)
  }
})

app.post('/accurate/kirim/:saleId', authRequired, async (c) => {
  const saleId = c.req.param('saleId')
  try {
    const sale = await db.sale.findUnique({ where: { id: saleId }, include: { item: true } })
    if (!sale) return c.json({ error: 'Transaksi tidak ditemukan' }, 404)
    if (sale.status === 'void') return c.json({ error: 'Nota batal tidak bisa dikirim' }, 409)
    if (!sale.item.length) return c.json({ error: 'Transaksi tanpa item' }, 409)
    const ctx = await konteksAccurate()
    if (!ctx.extra.session || !ctx.extra.host) {
      return c.json({ error: 'Buka database Accurate dulu di Pengaturan' }, 400)
    }
    const hasil = await denganRefresh(ctx, async (token) => {
      const call = panggilAcc({ ...ctx, extra: ctx.extra }, token)
      const customerNo = await noCustomer(call, (sale.pelanggan || '').trim() || 'Pelanggan Umum')
      const form = {
        transDate: formatTanggalAccurate(sale.tanggal),
        customerNo,
      }
      for (let i = 0; i < sale.item.length; i += 1) {
        const it = sale.item[i]
        const itemNo = await noItem(call, it.nama)
        form[`detailItem[${i}].itemNo`] = itemNo
        form[`detailItem[${i}].quantity`] = it.qty
        form[`detailItem[${i}].unitPrice`] = it.harga
      }
      const res = await call('/accurate/api/sales-invoice/save.do', { method: 'POST', form })
      pastikanSukses(res.data, 'menyimpan faktur')
      return res.data.r
    })
    return c.json({ ok: true, faktur: { nomor: hasil?.no || '', id: hasil?.id || '' } })
  } catch (e) {
    return c.json({ error: e?.message || 'Gagal mengirim faktur' }, 400)
  }
})

app.post('/:provider/uji', authRequired, async (c) => {
  const provider = c.req.param('provider')
  if (!PROVIDERS.includes(provider)) return c.json({ error: 'Penyedia tidak dikenal' }, 404)
  try {
    if (provider === 'accurate') {
      const ctx = await konteksAccurate()
      if (ctx.extra.session && ctx.extra.host) {
        await denganRefresh(ctx, (token) =>
          panggilData({
            host: ctx.extra.host,
            session: ctx.extra.session,
            token,
            path: '/accurate/api/item/list.do',
            query: { fields: 'id', pageSize: '1' },
          }).then((r) => pastikanSukses(r.data, 'uji koneksi')),
        )
      } else {
        await denganRefresh(ctx, (token) => dbList(token))
      }
    } else {
      const rec = await ambil('jurnal')
      if (!rec?.clientId) throw new Error('Jurnal belum dikonfigurasi')
      const secret = dekrip(rec.secretEnc)
      if (!secret) throw new Error('Client Secret Jurnal belum diisi')
      await panggilJurnal({
        clientId: rec.clientId,
        clientSecret: secret,
        sandbox: !!(rec.extra || {}).sandbox,
        path: jurnalPath('/sales_invoices'),
      })
    }
    const rec = await db.integration.update({
      where: { provider },
      data: { lastCheck: new Date(), lastError: '', ...(provider === 'accurate' ? {} : { status: 'terhubung' }) },
    })
    return c.json({ ok: true, integrasi: publik(rec) })
  } catch (e) {
    await db.integration
      .update({ where: { provider }, data: { lastError: String(e?.message || 'Uji gagal').slice(0, 300), ...(provider === 'jurnal' ? { status: 'galat' } : {}) } })
      .catch(() => null)
    return c.json({ error: e?.message || 'Uji koneksi gagal' }, 400)
  }
})

app.delete('/:provider', authRequired, adminOnly, async (c) => {
  const provider = c.req.param('provider')
  if (!PROVIDERS.includes(provider)) return c.json({ error: 'Penyedia tidak dikenal' }, 404)
  const rec = await ambil(provider)
  if (!rec) return c.json({ ok: true })
  const extra = { ...(rec.extra || {}) }
  delete extra.session
  delete extra.host
  const bersih = await db.integration.update({
    where: { provider },
    data: { accessEnc: '', refreshEnc: '', status: 'belum', lastError: '', extra },
  })
  return c.json({ ok: true, integrasi: publik(bersih) })
})

export default app
