import { NextRequest } from 'next/server'
import { createWriteStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
])

/**
 * Receive the raw source file as a streamed request body
 * (headers x-file-name / x-mime-type). The body is piped straight to
 * temp storage — never buffered in memory — while a running SHA-256
 * and byte count are recorded on the ORIGINAL asset row.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to upload.' }, { status: 401 })

  const videoId = req.nextUrl.searchParams.get('videoId')
  if (!videoId) return Response.json({ error: 'videoId query param is required.' }, { status: 400 })

  const rl = await checkRateLimit(`upload-file:${session.userId}`, 10, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const mimeType = req.headers.get('x-mime-type') ?? ''
  const fileName = req.headers.get('x-file-name') ?? 'upload'
  if (!ALLOWED_VIDEO_MIME.has(mimeType)) {
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

  const maxBytes = Number(process.env.MAX_VIDEO_SIZE_BYTES ?? 5368709120)
  // Note: || (not ??) — an empty env var must fall back to the OS temp dir.
  const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
  await fs.mkdir(tmpRoot, { recursive: true })
  const tmpPath = join(tmpRoot, `${videoId}.upload`)

  if (!req.body) return Response.json({ error: 'Empty request body.' }, { status: 400 })

  const hash = createHash('sha256')
  let bytes = 0
  try {
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(tmpPath)
      const nodeStream = Readable.fromWeb(req.body as import('node:stream/web').ReadableStream<Uint8Array>)
      nodeStream.on('data', (chunk: Buffer) => {
        bytes += chunk.length
        hash.update(chunk)
        if (bytes > maxBytes) {
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
    await fs.rm(tmpPath, { force: true })
    return Response.json({ error: (err as Error).message }, { status: 413 })
  }

  const checksum = hash.digest('hex')
  await prisma.videoAsset.upsert({
    where: { id: `tmp-${videoId}` },
    update: { storageKey: tmpPath, size: BigInt(bytes), mimeType, checksum, fileSize: bytes, storageStatus: 'UPLOADING' },
    create: {
      id: `tmp-${videoId}`,
      videoId,
      type: 'ORIGINAL',
      storageKey: tmpPath,
      size: BigInt(bytes),
      mimeType,
      checksum,
      fileSize: bytes,
      storageStatus: 'UPLOADING',
    },
  })

  return Response.json({ videoId, bytes, checksum, fileName, mimeType })
}
