import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireUploader, uploaderErrorStatus } from '@/lib/auth/upload-access'
import { stagingConf, signedFetch } from '@/lib/storage/s3-sign'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  videoId: z.string().min(1),
  key: z.string().min(1).max(300),
  bytes: z.number().int().positive(),
})

/**
 * Confirm a direct-to-staging upload, then queue it for the Mac worker.
 * Verifies the object actually exists in the bucket (HEAD) and that its
 * size matches what the browser sent — then marks PROCESSING with an
 * `r2:<key>` ORIGINAL asset the worker picks up. Transcoding happens on
 * the worker (npm run worker:staging), not here.
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

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'videoId, key and bytes are required.' }, { status: 400 })
  }
  const { videoId, key, bytes } = parsed.data

  const maxBytes = Number(process.env.MAX_VIDEO_SIZE_BYTES ?? 5368709120)
  if (bytes > maxBytes) {
    return Response.json({ error: `File exceeds the ${(maxBytes / 1073741824).toFixed(1)}GB limit` }, { status: 413 })
  }

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'UPLOADING' },
    select: { id: true, creator: { select: { userId: true } } },
  })
  if (!video || video.creator.userId !== session.userId) {
    return Response.json({ error: 'Upload not found or not yours.' }, { status: 404 })
  }
  if (!key.startsWith(`staging/${videoId}/`)) {
    return Response.json({ error: 'Staging key does not match this video.' }, { status: 400 })
  }

  // Object must exist and match the client-measured size (catches
  // truncated/interrupted PUTs before the worker wastes hours on them).
  let remoteSize: number | null = null
  try {
    const head = await signedFetch(conf, { method: 'HEAD', key })
    if (head.status === 404) {
      return Response.json({ error: 'Staged file not found — upload it first, then confirm.' }, { status: 410 })
    }
    if (!head.ok) {
      return Response.json({ error: `Staging check failed (${head.status}) — try again.` }, { status: 502 })
    }
    remoteSize = Number(head.headers.get('content-length'))
  } catch {
    return Response.json({ error: 'Could not reach staging storage — try again.' }, { status: 502 })
  }
  if (!Number.isFinite(remoteSize) || remoteSize !== bytes) {
    return Response.json({ error: 'Size mismatch — re-upload the file.' }, { status: 409 })
  }

  await prisma.videoAsset.upsert({
    where: { id: `tmp-${videoId}` },
    update: { storageKey: `r2:${key}`, size: BigInt(bytes), mimeType: 'video/mp4', fileSize: bytes, storageStatus: 'UPLOADING' },
    create: {
      id: `tmp-${videoId}`,
      videoId,
      type: 'ORIGINAL',
      storageKey: `r2:${key}`,
      size: BigInt(bytes),
      mimeType: 'video/mp4',
      fileSize: bytes,
      storageStatus: 'UPLOADING',
    },
  })
  await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING' } })
  await prisma.auditLog.create({
    data: { actorId: session.userId, action: 'VIDEO_UPLOAD_COMPLETE', targetType: 'VIDEO', targetId: videoId, metadata: { via: 'r2-staging', key, bytes } },
  })

  return Response.json({ videoId, status: 'PROCESSING' })
}
