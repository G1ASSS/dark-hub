import { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

const bodySchema = z.object({
  videoId: z.string().min(1),
  // Client-measured size (required). Client checksum is optional: when the
  // browser can provide one (small files via SubtleCrypto) it must match the
  // server-measured value; otherwise the server's own byte count + on-disk
  // size govern. Truncation is caught either way.
  checksum: z.string().min(1).optional(),
  bytes: z.number().int().positive(),
})

/**
 * Confirm the streamed bytes, then queue the video for processing.
 * Transcoding/upload-to-Telegram happens in the worker
 * (POST /api/worker/process), not in this request.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to upload.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'videoId, checksum and bytes are required.' }, { status: 400 })
  }
  const { videoId, checksum, bytes } = parsed.data

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'UPLOADING' },
    select: {
      id: true,
      creator: { select: { userId: true } },
      assets: { where: { type: 'ORIGINAL' }, select: { storageKey: true, checksum: true, fileSize: true } },
    },
  })
  if (!video || video.creator.userId !== session.userId) {
    return Response.json({ error: 'Upload not found or not yours.' }, { status: 404 })
  }

  const original = video.assets[0]
  if (!original || original.fileSize !== bytes || (checksum && original.checksum !== checksum)) {
    return Response.json({ error: 'Checksum/size mismatch — re-upload the file.' }, { status: 409 })
  }
  try {
    const stat = await fs.stat(original.storageKey)
    if (stat.size !== bytes) {
      return Response.json({ error: 'Temp file size mismatch — re-upload the file.' }, { status: 409 })
    }
  } catch {
    return Response.json({ error: 'Temp file missing — re-upload the file.' }, { status: 410 })
  }

  await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING' } })
  await prisma.auditLog.create({
    data: { actorId: session.userId, action: 'VIDEO_UPLOAD_COMPLETE', targetType: 'VIDEO', targetId: videoId },
  })

  return Response.json({ videoId, status: 'PROCESSING' })
}
