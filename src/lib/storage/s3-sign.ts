import 'server-only'
import { createHash, createHmac } from 'node:crypto'

/**
 * Minimal AWS SigV4 for S3-compatible staging (Cloudflare R2, Backblaze B2,
 * MinIO — your docker-compose already ships MinIO). Zero dependencies.
 *
 * Used for TWO things only:
 *  1. Presigned PUT URLs — the browser uploads gigabytes straight to the
 *     bucket, bypassing serverless body/disk caps entirely.
 *  2. Server-side HEAD/GET/DELETE — the Mac worker pulls staged files and
 *     cleans up, so the bucket only ever holds *unprocessed* videos and
 *     stays inside free tiers (R2: 10GB free, no egress fees).
 *
 * Long-term storage is still Telegram (free/unlimited); this bucket is a
 * disposable staging area, not the library.
 */

export type S3Conf = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export function stagingConf(): S3Conf | null {
  const accountId = process.env.R2_ACCOUNT_ID ?? process.env.S3_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET ?? process.env.S3_BUCKET ?? 'darkhubb-staging'
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return { accountId, accessKeyId, secretAccessKey, bucket }
}

export function stagingEnabled(): boolean {
  return stagingConf() !== null
}

function endpoint(conf: S3Conf): string {
  // R2-style endpoint; S3_ACCOUNT_ENDPOINT overrides for AWS/MinIO/B2.
  return (process.env.S3_ENDPOINT ?? `https://${conf.accountId}.r2.cloudflarestorage.com`).replace(/\/$/, '')
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

function signingKey(secret: string, date: string, region: string, service = 's3'): Buffer {
  const kDate = hmac(`AWS4${secret}`, date)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

function amzDates(now = new Date()): { short: string; long: string } {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  const short = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}`
  const long = `${short}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`
  return { short, long }
}

function encodeKey(key: string): string {
  // SigV4 URI-encodes each path segment (NOT slashes).
  return key.split('/').map((s) => encodeURIComponent(s)).join('/')
}

/** RFC3986 encoding for SigV4 query strings (encodeURIComponent + !'()*). */
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

/**
 * Presigned URL (query auth) for one S3 operation. For PUT the browser must
 * send exactly the signed headers — we sign only `host`, so any
 * Content-Type works without being part of the signature.
 */
export function presignUrl(
  conf: S3Conf,
  opts: { method: 'PUT' | 'GET' | 'HEAD' | 'DELETE'; key: string; expiresIn: number; now?: Date }
): string {
  const region = process.env.S3_REGION ?? 'auto'
  const { short, long } = amzDates(opts.now)
  const host = new URL(endpoint(conf)).host
  const uri = `/${conf.bucket}/${encodeKey(opts.key)}`
  const credential = `${conf.accessKeyId}/${short}/${region}/s3/aws4_request`
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': long,
    'X-Amz-Expires': String(opts.expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }
  const signature = signQuery({
    method: opts.method,
    host,
    uri,
    params,
    secretAccessKey: conf.secretAccessKey,
    shortDate: short,
    longDate: long,
    region,
  })
  const query = new URLSearchParams({ ...params, 'X-Amz-Signature': signature })
    .toString()
    .replace(/\+/g, '%20')
  return `${endpoint(conf)}${uri}?${query}`
}

/**
 * Pure SigV4 query-auth core (exported for tests). Given the exact method,
 * host, uri and query params, returns the hex signature. Verified against
 * the AWS-published S3 example (docs: sigv4-query-string-auth):
 * GET examplebucket.s3.amazonaws.com/test.txt, 20130524T000000Z, 86400s →
 * aeeed9bbccd4d02ee5c0109b86d86835f995330da4c4c7d2a9f8145ff94326.
 */
export function signQuery(input: {
  method: string
  host: string
  uri: string
  params: Record<string, string>
  secretAccessKey: string
  shortDate: string
  longDate: string
  region: string
}): string {
  const canonicalQuery = Object.keys(input.params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(input.params[k])}`)
    .join('&')
  const canonical = [
    input.method,
    input.uri,
    canonicalQuery,
    `host:${input.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const scope = `${input.shortDate}/${input.region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', input.longDate, scope, sha256Hex(canonical)].join('\n')
  return hmac(signingKey(input.secretAccessKey, input.shortDate, input.region), stringToSign).toString('hex')
}

/** Server-side request with Authorization-header auth (worker HEAD/GET/DELETE). */
export async function signedFetch(
  conf: S3Conf,
  opts: { method: 'GET' | 'HEAD' | 'DELETE'; key: string }
): Promise<Response> {
  const region = process.env.S3_REGION ?? 'auto'
  const now = new Date()
  const { short, long } = amzDates(now)
  const url = new URL(endpoint(conf))
  const uri = `/${conf.bucket}/${encodeKey(opts.key)}`
  const payloadHash = sha256Hex('')
  const canonical = [
    opts.method,
    uri,
    '',
    `host:${url.host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${long}\n`,
    'host;x-amz-content-sha256;x-amz-date',
    payloadHash,
  ].join('\n')
  const scope = `${short}/${region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', long, scope, sha256Hex(canonical)].join('\n')
  const signature = hmac(signingKey(conf.secretAccessKey, short, region), stringToSign).toString('hex')
  const auth = `AWS4-HMAC-SHA256 Credential=${conf.accessKeyId}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`
  return fetch(`${endpoint(conf)}${uri}`, {
    method: opts.method,
    headers: {
      Authorization: auth,
      'x-amz-date': long,
      'x-amz-content-sha256': payloadHash,
    },
  })
}
