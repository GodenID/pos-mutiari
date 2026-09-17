import crypto from 'node:crypto'

function kunci() {
  const rahasia = process.env.JWT_SECRET || 'ganti-di-coolify-min-32-karakter'
  return crypto.scryptSync(rahasia, 'integrasi-akuntansi', 32)
}

/** Enkripsi secret/token sebelum disimpan ke database (AES-256-GCM) */
export function enkrip(teks) {
  if (!teks) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', kunci(), iv)
  const data = Buffer.concat([cipher.update(String(teks), 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data.toString('hex')}`
}

export function dekrip(paket) {
  if (!paket) return ''
  const [ivH, tagH, dataH] = String(paket).split(':')
  if (!ivH || !tagH || !dataH) return ''
  const decipher = crypto.createDecipheriv('aes-256-gcm', kunci(), Buffer.from(ivH, 'hex'))
  decipher.setAuthTag(Buffer.from(tagH, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]).toString('utf8')
}
