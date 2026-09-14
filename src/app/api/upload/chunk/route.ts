import { NextRequest } from 'next/server'
import { createWriteStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/db/prisma'
import { requireUploader, uploaderErrorStatus } from '@/lib/auth/upload-access'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
// Long uploads need more than the default function timeout (Vercel Hobby
// caps at 60s — large files should use chunked upload or the local script).
export const maxDuration = 300

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
])

// Single chunk cap: must stay well under Vercel's ~4.5MB serverless body
// limit so each request passes the platform gate. The client splits files
// into 4MB pieces; the server appends them in order.
const MAX_CHUNK_BYTES = Number(process.env.UPLOAD_CHUNK_MAX_BYTES ?? 8 * 1024 * 1024)

/**
 * Chunked upload: POST raw bytes with ?videoId=&index=&total=.
 * Chunks must arrive sequentially (index 0..total-1); each is appended to
 * the same temp file the single-shot /file route uses, so /complete works
 * unchanged. Keeps per-request bodies tiny for serverless platforms.
 */
export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireUploader()
  } catch (err) {
    const { status, message } = uploaderErrorStatus(err)
    return Response.json({ error: message }, { status })
  }

  const videoId = req.nextUrl.searchParams.get('videoId')
  const index = Number(req.nextUrl.searchParams.get('index'))
  const total = Number(req.nextUrl.searchParams.get('total'))
  if (!videoId) return Response.json({ error: 'videoId query param is required.' }, { status: 400 })
  if (!Number.isInteger(index) || index < 0) {
    return Response.json({ error: 'Valid chunk index is required.' }, { status: 400 })
  }
  if (!Number.isInteger(total) || total <= 0 || index >= total) {
    return Response.json({ error: 'Valid chunk total is required.' }, { status: 400 })
  }

  const rl = await checkRateLimit(`upload-chunk:${session.userId}`, 600, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const mimeType = req.headers.get('x-mime-type') ?? ''
  if (index === 0 && !ALLOWED_VIDEO_MIME.has(mimeType)) {
    return Response.json(
      { error: `Unsupported type. Allowed: ${[...ALLOWED_VIDEO_MIME].join(', ')}` },
      { status: 415 }
    )
  }

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'UPLOADING' },
    select: { id: true, creator: { select: { userId: true } } },
  })
  if (!video || video.creator.userId !== session.userId) {
    return Response.json({ error: 'Upload not found or not yours.' }, { status: 404 })
  }

  if (!req.body) return Response.json({ error: 'Empty chunk body.' }, { status: 400 })

  const maxBytes = Number(process.env.MAX_VIDEO_SIZE_BYTES ?? 5368709120)
  const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
  await fs.mkdir(tmpRoot, { recursive: true })
  const tmpPath = join(tmpRoot, `${videoId}.upload`)

  // Enforce ordering via a cursor sidecar: chunk N must follow N-1
  // (prevents corrupt assembles when the client retries or races).
  const cursorPath = join(tmpRoot, `${videoId}.cursor`)
  let expected = 0
  let existing = 0
  try {
    existing = (await fs.stat(tmpPath)).size
    try {
      expected = Number(await fs.readFile(cursorPath, 'utf8')) || 0
    } catch {
      // Legacy session without cursor (or first chunk after restart).
      expected = index
    }
  } catch {
    if (index !== 0) {
      return Response.json({ error: 'Upload session expired — restart the upload.' }, { status: 410 })
    }
  }
  if (index !== expected) {
    return Response.json(
      { error: `Out-of-order chunk (got ${index}, expected ${expected}) — resume sequentially.` },
      { status: 409 }
    )
  }

  let bytes = 0
  try {
    const nodeStream = Readable.fromWeb(req.body as import('node:stream/web').ReadableStream<Uint8Array>)
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(tmpPath, { flags: index === 0 ? 'w' : 'a' })
      nodeStream.on('data', (chunk: Buffer) => {
        bytes += chunk.length
        if (bytes > MAX_CHUNK_BYTES) {
          nodeStream.destroy()
          out.destroy()
          reject(new Error(`Chunk exceeds the ${Math.round(MAX_CHUNK_BYTES / 1048576)}MB chunk limit`))
        }
        if (existing + bytes > maxBytes) {
          nodeStream.destroy()
          out.destroy()
          reject(new Error(`File exceeds the ${(maxBytes / 1073741824).toFixed(1)}GB limit`))
        }
      })
      nodeStream.on('error', reject)
      out.on('error', reject)
      out.on('finish', resolve)
      nodeStream.pipe(out)
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 413 })
  }

  let received = existing + bytes
  try {
    received = (await fs.stat(tmpPath)).size
  } catch { /* use computed */ }
  await fs.writeFile(cursorPath, String(index + 1)).catch(() => {})

  // Track progress on the ORIGINAL row so a refresh can resume.
  await prisma.videoAsset.upsert({
    where: { id: `tmp-${videoId}` },
    update: { storageKey: tmpPath, size: BigInt(received), mimeType: mimeType || 'video/mp4', fileSize: received, storageStatus: 'UPLOADING' },
    create: {
      id: `tmp-${videoId}`,
      videoId,
      type: 'ORIGINAL',
      storageKey: tmpPath,
      size: BigInt(received),
      mimeType: mimeType || 'video/mp4',
      fileSize: received,
      storageStatus: 'UPLOADING',
    },
  })

  return Response.json({ videoId, index, received })
}
