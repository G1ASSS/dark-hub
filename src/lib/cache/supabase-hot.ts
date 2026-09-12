import 'server-only'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { ensureCacheDir, pruneCache } from './origin'

/**
 * Shared hot cache in Supabase Storage.
 *
 * Telegram's file servers answer in seconds (20s+ TTFB observed), which
 * starves HLS on hosts without a warm local disk (e.g. serverless, where
 * every instance starts cold). This layer keeps one hot copy per asset in
 * Supabase Storage (same region as the DB):
 *
 *   disk (local, fastest) → Supabase hot (fast, shared) → Telegram (origin)
 *
 * Misses backfill both caches. When unconfigured it silently no-ops and
 * behavior is exactly as before.
 */

export type HotKind = 'seg' | 'thumb' | 'mp4'

function conf() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_KEY
  const bucket = process.env.SUPABASE_CACHE_BUCKET ?? 'stream-cache'
  if (!url || !key) return null
  return { url, key, bucket }
}

export function hotCacheEnabled(): boolean {
  return conf() !== null
}

function objectPath(assetId: string, kind: HotKind): string {
  const ext = kind === 'thumb' ? 'jpg' : kind === 'mp4' ? 'mp4' : 'ts'
  return `${kind}/${assetId}.${ext}`
}

async function api(path: string, init: RequestInit): Promise<Response> {
  const c = conf()
  if (!c) throw new Error('hot cache not configured')
  return fetch(`${c.url}${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

/** Store bytes in the hot cache (fire-and-forget safe, logs and continues). */
export async function hotPut(assetId: string, kind: HotKind, bytes: Uint8Array, contentType: string): Promise<void> {
  const c = conf()
  if (!c) return
  const res = await api(`/storage/v1/object/${c.bucket}/${objectPath(assetId, kind)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    // Buffer.from copies (safe ArrayBuffer) then back to a plain Uint8Array
    body: new Uint8Array(Buffer.from(bytes)),
  })
  if (!res.ok) throw new Error(`hot cache upload failed: ${res.status} ${await res.text().catch(() => '')}`)
}

/** Fetch bytes from the hot cache, or null on miss/error. */
export async function hotGet(assetId: string, kind: HotKind): Promise<Buffer | null> {
  const c = conf()
  if (!c) return null
  try {
    const res = await api(`/storage/v1/object/${c.bucket}/${objectPath(assetId, kind)}`, { method: 'GET' })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

const diskLocks = new Map<string, Promise<Buffer>>()

/**
 * Origin bytes with full cascade: local disk → Supabase hot → Telegram.
 * Warms every layer it passes through. `load` pulls from Telegram.
 */
export async function getOriginBytes(
  assetId: string,
  kind: HotKind,
  telegramFileId: string,
  contentType: string,
  load: () => Promise<ReadableStream<Uint8Array> | null>
): Promise<{ bytes: Buffer; contentType: string }> {
  const diskKey = `a-${assetId}`
  const dir = await ensureCacheDir()
  const diskPath = join(dir, diskKey)

  // 1. local disk
  try {
    const hit = await fs.readFile(diskPath)
    await fs.utimes(diskPath, new Date(), new Date()).catch(() => {})
    return { bytes: hit, contentType }
  } catch { /* miss */ }

  // Coalesce concurrent misses
  const ongoing = diskLocks.get(diskKey)
  if (ongoing) return { bytes: await ongoing, contentType }

  const job = (async () => {
    // 2. hot cache
    const hot = await hotGet(assetId, kind)
    if (hot) {
      await fs.writeFile(diskPath, hot).catch(() => {})
      await pruneCache().catch(() => {})
      return hot
    }
    // 3. Telegram origin (slow) — backfill both caches
    const body = await load()
    if (!body) throw new Error('Origin returned no body')
    const chunks: Buffer[] = []
    for await (const chunk of Readable.fromWeb(body as unknown as WebReadableStream)) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
    }
    const bytes = Buffer.concat(chunks)
    await fs.writeFile(diskPath, bytes).catch(() => {})
    await pruneCache().catch(() => {})
    hotPut(assetId, kind, bytes, contentType).catch((e) => console.warn('[cache] hot backfill failed:', (e as Error).message))
    return bytes
  })()
  diskLocks.set(diskKey, job)
  try {
    return { bytes: await job, contentType }
  } finally {
    diskLocks.delete(diskKey)
  }
}

/** HTTP response for a byte buffer with Range support. */
export function bufferResponse(
  bytes: Buffer,
  contentType: string,
  range: string | null,
  cacheControl = 'private, max-age=300',
  extraHeaders?: Record<string, string>
): Response {
  const size = bytes.length
  const base: Record<string, string> = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    'cache-control': cacheControl,
    ...(extraHeaders ?? {}),
  }
  if (!range) {
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { ...base, 'content-length': String(size) },
    })
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!m) {
    return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${size}` } })
  }
  const start = m[1] === '' ? Math.max(0, size - Number(m[2] || 0)) : Number(m[1])
  const end = Math.min(m[2] === '' ? size - 1 : Number(m[2]), size - 1)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${size}` } })
  }
  return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
    status: 206,
    headers: { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
  })
}
