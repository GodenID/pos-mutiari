import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

/** Daftar semua key di bawah prefix (butuh izin ListBucket). Maks 5000. */
export async function daftarKunci(prefix = 'produk/') {
  const semua = []
  let lanjut = undefined
  for (let i = 0; i < 5; i += 1) {
    const res = await s3Client().send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: lanjut, MaxKeys: 1000 }),
    )
    for (const o of res.Contents || []) {
      if (o.Key) semua.push(o.Key)
    }
    if (!res.IsTruncated) break
    lanjut = res.NextContinuationToken
  }
  return semua
}

/** Hapus banyak key sekaligus (maks 1000 per panggilan). */
export async function hapusBanyak(keys) {
  const bersih = [...new Set(keys)].filter((k) => k && k.startsWith('produk/'))
  let dihapus = 0
  for (let i = 0; i < bersih.length; i += 1000) {
    const res = await s3Client().send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: bersih.slice(i, i + 1000).map((Key) => ({ Key })) },
      }),
    ).catch(() => null)
    dihapus += res?.Deleted?.length || 0
  }
  return dihapus
}
