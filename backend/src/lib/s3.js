import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.ap-southeast-1.onidel.cloud'
const REGION = process.env.S3_REGION || 'ap-southeast-1'
const BUCKET = process.env.S3_BUCKET || 'pos'
const PUBLIC_URL = (process.env.S3_PUBLIC_URL || `https://${BUCKET}.s3.ap-southeast-1.onidel.cloud`).replace(/\/$/, '')
const FORCE_PATH_STYLE = String(process.env.S3_FORCE_PATH_STYLE || 'false') === 'true'

let client = null

export function s3Aktif() {
  return !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY)
}

export function s3Client() {
  if (!client) {
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    })
  }
  return client
}

export function urlPublikUntuk(key) {
  return `${PUBLIC_URL}/${key}`
}

export async function presignUnggah(key, tipeKonten, detik = 300) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: tipeKonten })
  const uploadUrl = await getSignedUrl(s3Client(), cmd, { expiresIn: detik })
  return { uploadUrl, publicUrl: urlPublikUntuk(key), key }
}

export async function hapusObjek(key) {
  if (!key || !key.startsWith('produk/')) return
  await s3Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => null)
}
