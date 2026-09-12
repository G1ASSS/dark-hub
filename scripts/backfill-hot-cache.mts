/**
 * One-time fill of the Supabase hot cache from Telegram for all stored
 * assets (new uploads push at publish time automatically):
 *
 *   npx tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/backfill-hot-cache.mts
 */
import { prisma } from '../src/lib/db/prisma'
import { getStorageProvider } from '../src/lib/storage'
import { hotPut, type HotKind } from '../src/lib/cache/supabase-hot'

const BUCKET = process.env.SUPABASE_CACHE_BUCKET ?? 'stream-cache'
const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_KEY
if (!base || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')

// Ensure the private bucket exists
const mk = await fetch(`${base}/storage/v1/bucket`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: BUCKET, public: false }),
})
console.log('bucket:', mk.status === 200 || mk.status === 201 ? 'created' : `exists (${mk.status})`)

async function dbReady(retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return
    } catch {
      await prisma.$disconnect().catch(() => {})
      await prisma.$connect().catch(() => {})
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
}

const KIND: Record<string, HotKind> = { HLS_SEGMENT: 'seg', THUMBNAIL: 'thumb', MP4: 'mp4' }
const MIME: Record<HotKind, string> = { seg: 'video/MP2T', thumb: 'image/jpeg', mp4: 'video/mp4' }

await dbReady()
const assets = await prisma.videoAsset.findMany({
  where: { storageStatus: 'STORED', telegramFileId: { not: null }, type: { in: ['HLS_SEGMENT', 'THUMBNAIL', 'MP4'] } },
  select: { id: true, type: true, telegramFileId: true },
})
console.log(`backfilling ${assets.length} assets…`)

const storage = getStorageProvider()
let ok = 0
let failed = 0
for (const [i, a] of assets.entries()) {
  const kind = KIND[a.type]
  try {
    const up = await storage.downloadStream(a.telegramFileId!)
    if (!up.body) throw new Error('empty body')
    const chunks: Buffer[] = []
    const { Readable } = await import('node:stream')
    for await (const chunk of Readable.fromWeb(up.body as never)) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
    }
    await hotPut(a.id, kind, Buffer.concat(chunks), MIME[kind])
    ok += 1
    if (ok % 10 === 0) console.log(`  ${ok}/${assets.length}…`)
    void i
  } catch (err) {
    failed += 1
    console.warn(`  FAIL ${a.id}: ${(err as Error).message.slice(0, 100)}`)
  }
}
await prisma.$disconnect()
console.log(`DONE: ${ok} cached, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
