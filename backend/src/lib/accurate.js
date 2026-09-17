/* Klien Accurate Online: OAuth authorization-code, db-list, open-db,
   dan API data (item, customer, sales-invoice). Referensi:
   https://accurate.id/api-integration/api-example/ */

const OAUTH_BASE = 'https://accurate.id'
const ACCOUNT_BASE = 'https://account.accurate.id'

export const ACCURATE_SCOPE =
  'item_view item_save customer_view customer_save sales_invoice_view sales_invoice_save'

export function authorizeUrl({ clientId, redirectUri, state }) {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: ACCURATE_SCOPE,
    state,
  })
  return `${OAUTH_BASE}/oauth/authorize?${q.toString()}`
}

async function bacaToken(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `OAuth Accurate gagal (${res.status})`)
  }
  return data
}

export async function tukarKode({ clientId, clientSecret, code, redirectUri }) {
  const res = await fetch(`${OAUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  })
  return bacaToken(res)
}

export async function segarkanToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(`${OAUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  return bacaToken(res)
}

export async function dbList(token) {
  const res = await fetch(`${ACCOUNT_BASE}/api/db-list.do`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  pastikanSukses(data, 'membaca daftar database')
  return data.d || []
}

export async function openDb(token, dbId) {
  const res = await fetch(`${ACCOUNT_BASE}/api/open-db.do?id=${encodeURIComponent(dbId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  pastikanSukses(data, 'membuka database')
  if (!data.session || !data.host) throw new Error('Respons open-db tidak berisi session/host')
  return { session: data.session, host: String(data.host).replace(/\/$/, '') }
}

/** Panggil API data dengan follow-redirect manual (agar header ikut saat 308). */
export async function panggilData({ host, session, token, path, method = 'GET', form = null, query = null }) {
  let url = `${host}${path}${query ? `?${new URLSearchParams(query)}` : ''}`
  const headers = { Authorization: `Bearer ${token}`, 'X-Session-ID': session }
  let init = { method, headers }
  if (form) {
    init = { method, headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) }
  }
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(url, { ...init, redirect: 'manual' })
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error('Accurate me-redirect tanpa tujuan')
      url = new URL(loc, url).toString()
      if (res.status === 303) init = { method: 'GET', headers }
      continue
    }
    return { status: res.status, data: await res.json().catch(() => null) }
  }
  throw new Error('Terlalu banyak redirect dari Accurate')
}

export function pastikanSukses(data, aksi = 'memanggil API') {
  if (!data || data.s !== true) {
    const pesan = Array.isArray(data?.d) ? data.d.join('; ') : data?.d || `Gagal ${aksi} (Accurate)`;
    throw new Error(String(pesan).slice(0, 300))
  }
  return data
}

export const formatTanggalAccurate = (tgl) => {
  const d = tgl instanceof Date ? tgl : new Date(tgl)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
