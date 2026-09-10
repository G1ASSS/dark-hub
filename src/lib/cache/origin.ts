import 'server-only'
import { createWriteStream, createReadStream, statSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { prisma } from '@/lib/db/prisma'
import { getStorageProvider } from '@/lib/storage'

/**
 * Local origin cache. Telegram's file servers can be very slow from some
 * networks (multi-second fetches for hundred-KB segments), which starves
 * HLS playback. This caches origin bytes on local disk:
 *
 * - Offline-first: every cache MISS still works (fetches + stores).
 * - Pre-warmed by the pipeline, so first playback is already instant.
 * - Size-capped with mtime LRU pruning (SEGMENT_CACHE_MAX_MB, default 2048).
 * - Keys are restricted to [A-Za-z0-9_-] (safe as filenames).
 */

function cacheDir(): string {
  // Note: || (not ??) — an empty env var must fall back to the default.
  return process.env.SEGMENT_CACHE_DIR || join(tmpdir(), 'darkhubb-segcache')
}

function maxBytes(): number {
  return Number(process.env.SEGMENT_CACHE_MAX_MB ?? 2048) * 1048576
}

function safeKey(key: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw new Error(`Unsafe cache key: ${key}`)
  return key
}

// Coalesce concurrent misses for the same key into one origin fetch.
const inflight = new Map<string, Promise<string>>()

async function prune(dir: string): Promise<void> {
  const cap = maxBytes()
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: { name: string; size: number; mtime: number }[] = []
  let total = 0
  for (const e of entries) {
    if (!e.isFile() || e.name.startsWith('.')) continue
    try {
      const st = await fs.stat(join(dir, e.name))
      files.push({ name: e.name, size: st.size, mtime: st.mtimeMs })
      total += st.size
    } catch { /* raced deletion */ }
  }
  if (total <= cap) return
  files.sort((a, b) => a.mtime - b.mtime)
  for (const f of files) {
    if (total <= cap) break
    await fs.rm(join(dir, f.name), { force: true }).catch(() => {})
    total -= f.size
  }
}

/**
 * Return the local path for a cached key, fetching via `load` on miss.
 * The loader streams origin bytes; they are stored atomically (tmp + rename).
 */
export async function getCachedPath(
  key: string,
  load: () => Promise<ReadableStream<Uint8Array> | null>
): Promise<string> {
  const dir = cacheDir()
  await fs.mkdir(dir, { recursive: true })
  const path = join(dir, safeKey(key))

  try {
    await fs.access(path)
    await fs.utimes(path, new Date(), new Date()).catch(() => {})
    return path
  } catch { /* miss — fetch below */ }

  const existing = inflight.get(key)
  if (existing) return existing

  const job = (async () => {
    const body = await load()
    if (!body) throw new Error('Origin returned no body')
    const tmp = `${path}.${process.pid}.tmp`
    await pipeline(Readable.fromWeb(body as unknown as WebReadableStream), createWriteStream(tmp))
    await fs.rename(tmp, path)
    await prune(dir)
    return path
  })()
  inflight.set(key, job)
  try {
    return await job
  } finally {
    inflight.delete(key)
  }
}

export type ServedFile = {
  status: 200 | 206 | 416
  headers: Record<string, string>
  stream: import('node:fs').ReadStream | null
}

/** Serve a local file with HTTP Range support (seekable playback). */
export async function serveFile(
  path: string,
  contentType: string,
  range: string | null,
  cacheControl = 'private, max-age=300'
): Promise<ServedFile> {
  const size = statSync(path).size
  const base = { 'content-type': contentType, 'accept-ranges': 'bytes', 'cache-control': cacheControl }

  if (!range) {
    return { status: 200, headers: { ...base, 'content-length': String(size) }, stream: createReadStream(path) }
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!m) return { status: 416, headers: { ...base, 'content-range': `bytes */${size}` }, stream: null }
  const start = m[1] === '' ? Math.max(0, size - Number(m[2] || 0)) : Number(m[1])
  const end = m[2] === '' ? size - 1 : Number(m[2])
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= size) {
    return { status: 416, headers: { ...base, 'content-range': `bytes */${size}` }, stream: null }
  }
  const clampedEnd = Math.min(end, size - 1)
  return {
    status: 206,
    headers: {
      ...base,
      'content-range': `bytes ${start}-${clampedEnd}/${size}`,
      'content-length': String(clampedEnd - start + 1),
    },
    stream: createReadStream(path, { start, end: clampedEnd }),
  }
}

/** Build the Response for a served file (node stream → undici-compatible body). */
export function fileResponse(served: ServedFile, extraHeaders?: Record<string, string>): Response {
  return new Response(served.stream as unknown as BodyInit, {
    status: served.status,
    headers: { ...served.headers, ...(extraHeaders ?? {}) },
  })
}

/**
 * Pre-warm the cache for every stored asset of a video (called by the
 * pipeline; best-effort so it never fails publishing).
 */
export async function warmVideoCache(videoId: string): Promise<{ warmed: number; failed: number }> {
  const assets = await prisma.videoAsset.findMany({
    where: {
      videoId,
      storageStatus: 'STORED',
      telegramFileId: { not: null },
      type: { in: ['HLS_SEGMENT', 'THUMBNAIL'] },
    },
    select: { id: true, telegramFileId: true },
  })
  const storage = getStorageProvider()
  let warmed = 0
  let failed = 0
  for (const a of assets) {
    try {
      await getCachedPath(`a-${a.id}`, async () => {
        const up = await storage.downloadStream(a.telegramFileId!)
        return up.body
      })
      warmed += 1
    } catch (err) {
      failed += 1
      console.warn('[cache] warm failed:', (err as Error).message)
    }
  }
  return { warmed, failed }
}
