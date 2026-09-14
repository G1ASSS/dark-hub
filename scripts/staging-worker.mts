/**
 * Staging worker: pulls direct-to-R2 uploads through the FFmpeg pipeline.
 * Runs on YOUR machine (free — Mac/VPS with FFmpeg + disk), on a schedule:
 *
 *   npm run worker:staging              # single pass (cron every 5 min)
 *   npm run worker:staging -- --loop    # daemon (checks every 60s)
 *
 * Flow per video: download R2 staging copy -> local tmp -> processVideo()
 * (scan -> transcode ladder -> Telegram origin -> HLS -> PENDING_REVIEW) ->
 * DELETE the R2 copy. The bucket only ever holds unprocessed videos, so a
 * free 10GB R2 tier is plenty even for a 50GB+ library; Telegram (free /
 * unlimited) is the permanent home. Failures restore the `r2:` marker so
 * the next run retries cleanly.
 */
import { createWriteStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { prisma } from '../src/lib/db/prisma'
import { processVideo } from '../src/lib/upload/pipeline'
import { stagingConf, presignUrl, signedFetch, type S3Conf } from '../src/lib/storage/s3-sign'

const LOOP = process.argv.includes('--loop')
const intervalArg = process.argv.indexOf('--interval')
const INTERVAL_S = intervalArg >= 0 ? Number(process.argv[intervalArg + 1]) || 60 : 60

const maybeConf = stagingConf()
if (!maybeConf) {
  console.error('Staging storage is not configured. Set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET in .env.local (see .env.example).')
  process.exit(1)
}
const conf: S3Conf = maybeConf

async function pickNext(): Promise<{ id: string; title: string; key: string; bytes: number } | null> {
  const asset = await prisma.videoAsset.findFirst({
    where: {
      type: 'ORIGINAL',
      storageKey: { startsWith: 'r2:' },
      storageStatus: 'UPLOADING',
      video: { status: { in: ['UPLOADING', 'PROCESSING'] }, processingStartedAt: null },
    },
    orderBy: { video: { updatedAt: 'asc' } },
    select: {
      storageKey: true,
      fileSize: true,
      video: { select: { id: true, title: true } },
    },
  })
  if (!asset) return null
  return { id: asset.video.id, title: asset.video.title, key: asset.storageKey.slice(3), bytes: asset.fileSize ?? 0 }
}

async function downloadToTmp(key: string, videoId: string): Promise<{ path: string; bytes: number }> {
  const url = presignUrl(conf, { method: 'GET', key, expiresIn: 6 * 3600 })
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Staging download failed (${res.status})`)
  const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
  await fs.mkdir(tmpRoot, { recursive: true })
  const tmpPath = join(tmpRoot, `${videoId}.upload`)
  let bytes = 0
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(tmpPath)
    const stream = Readable.fromWeb(res.body as unknown as WebReadableStream)
    stream.on('data', (chunk: Buffer) => {
      bytes += chunk.length
    })
    stream.on('error', reject)
    out.on('error', reject)
    out.on('finish', resolve)
    stream.pipe(out)
  })
  return { path: tmpPath, bytes }
}

async function runOnce(): Promise<boolean> {
  const next = await pickNext()
  if (!next) {
    console.log('Queue empty — nothing staged.')
    return false
  }
  console.log(`Staged video: "${next.title}" (${(next.bytes / 1073741824).toFixed(2)}GB)…`)
  try {
    const { path, bytes } = await downloadToTmp(next.key, next.id)
    if (next.bytes > 0 && bytes !== next.bytes) {
      await fs.rm(path, { force: true })
      throw new Error(`Downloaded size mismatch (got ${bytes}, want ${next.bytes}) — will retry next run`)
    }
    // Point the ORIGINAL asset at the local copy (R2 key restored on
    // failure so the next run retries from a clean state).
    await prisma.videoAsset.update({
      where: { id: `tmp-${next.id}` },
      data: { storageKey: path, size: BigInt(bytes), fileSize: bytes },
    })
    await prisma.video.update({ where: { id: next.id }, data: { status: 'PROCESSING' } })

    try {
      const result = await processVideo(next.id)
      console.log(`  ✓ ${result.renditions.join(', ')} | ${result.segments} segs | ${result.duration}s`)
    } catch (err) {
      await prisma.videoAsset.update({
        where: { id: `tmp-${next.id}` },
        data: { storageKey: `r2:${next.key}` },
      }).catch(() => {})
      throw err
    }

    // Permanent home is Telegram now — free the staging copy (best-effort).
    try {
      const del = await signedFetch(conf, { method: 'DELETE', key: next.key })
      if (!del.ok) console.warn(`  staging cleanup: DELETE ${del.status} (bucket lifecycle will catch it)`)
    } catch (err) {
      console.warn('  staging cleanup skipped:', (err as Error).message)
    }
    return true
  } catch (err) {
    console.error(`  ✗ ${next.id}: ${(err as Error).message}`)
    return true // did work (a failed attempt) — keep looping for the rest
  }
}

if (!LOOP) {
  await runOnce()
  await prisma.$disconnect()
} else {
  console.log(`Staging worker daemon (every ${INTERVAL_S}s, Ctrl+C to stop)…`)
  for (;;) {
    try {
      await runOnce()
    } catch (err) {
      console.error('worker pass failed:', (err as Error).message)
    }
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000))
  }
}
