import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUploader, uploaderErrorStatus } from '@/lib/auth/upload-access'
import { createUploadVideo } from '@/lib/upload/init-video'
import { stagingConf, presignUrl } from '@/lib/storage/s3-sign'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  categorySlugs: z.array(z.string().min(1).max(60)).max(5).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  seriesSlug: z.string().min(1).max(80).optional(),
  episodeNumber: z.number().int().min(1).max(10000).optional(),
  episodeTitle: z.string().min(1).max(120).optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
})

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
])

/**
 * Direct-to-staging upload for files of ANY size (free path for 1GB+).
 * Reserves the video row, then returns a presigned PUT URL: the browser
 * uploads straight to object storage (R2 free tier), bypassing serverless
 * body/disk caps. The Mac worker (npm run worker:staging) pulls the file,
 * runs the FFmpeg pipeline into Telegram, and deletes the staged copy —
 * the bucket only ever holds unprocessed videos, so it stays free forever.
 *
 * 501 when staging is not configured — the client falls back to chunked
 * upload automatically.
 */
export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireUploader()
  } catch (err) {
    const { status, message } = uploaderErrorStatus(err)
    return Response.json({ error: message }, { status })
  }

  const conf = stagingConf()
  if (!conf) {
    return Response.json({ error: 'Direct upload is not configured on this server.' }, { status: 501 })
  }

  const rl = await checkRateLimit(`upload-r2:${session.userId}`, 10, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'Title (3–100 chars), fileName and mimeType are required.' }, { status: 400 })
  }
  if (!ALLOWED_VIDEO_MIME.has(parsed.data.mimeType)) {
    return Response.json(
      { error: `Unsupported type. Allowed: ${[...ALLOWED_VIDEO_MIME].join(', ')}` },
      { status: 415 }
    )
  }

  try {
    const { videoId } = await createUploadVideo(session.userId, parsed.data)
    const safeName = parsed.data.fileName.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 100)
    const key = `staging/${videoId}/${safeName}`
    // Single PUT up to 5GB (S3/R2 limit) — no multipart needed. URL valid
    // 6h so slow connections can finish; complete() verifies the object.
    const uploadUrl = presignUrl(conf, { method: 'PUT', key, expiresIn: 6 * 3600 })
    return Response.json({ videoId, key, uploadUrl, expiresIn: 6 * 3600 }, { status: 201 })
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status) return Response.json({ error: e.message ?? 'Could not start upload' }, { status: e.status })
    throw err
  }
}
