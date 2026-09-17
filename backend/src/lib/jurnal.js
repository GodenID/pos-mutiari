/* Klien Mekari Jurnal via HMAC-SHA256 (server-to-server, 1 company).
   Referensi: https://developers.mekari.com/docs/kb/hmac-authentication */

import crypto from 'node:crypto'

export const jurnalBase = (sandbox) =>
  sandbox ? 'https://sandbox-api.mekari.com' : 'https://api.mekari.com'

const PATH_JURNAL = '/public/jurnal/api/v1'

export const jurnalPath = (akhir) => `${PATH_JURNAL}${akhir}`

export function tanggalGMT() {
  return new Date().toUTCString()
}

function tandaTangani(secret, tanggal, metode, path) {
  const baris = `${String(metode).toUpperCase()} ${path} HTTP/1.1`
  return crypto.createHmac('sha256', secret).update(`date: ${tanggal}\n${baris}`).digest('base64')
}

export async function panggilJurnal({ clientId, clientSecret, sandbox, method = 'GET', path, body = null }) {
  const tanggal = tanggalGMT()
  const signature = tandaTangani(clientSecret, tanggal, method, path)
  const headers = {
    Authorization: `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`,
    Date: tanggal,
    Accept: 'application/json',
  }
  let raw
  if (body) {
    raw = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
    headers.Digest = `SHA-256=${crypto.createHash('sha256').update(raw).digest('base64')}`
  }
  const res = await fetch(`${jurnalBase(sandbox)}${path}`, {
    method,
    headers,
    body: body ? raw : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const pesan = data?.message || data?.error || (Array.isArray(data?.errors) ? data.errors.join('; ') : null)
    throw new Error(String(pesan || `Jurnal HTTP ${res.status}`).slice(0, 300))
  }
  return data
}
