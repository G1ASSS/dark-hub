import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { processVideo } from '@/lib/upload/pipeline'

export const maxDuration = 600 // transcoding + Telegram upload needs minutes

const bodySchema = z.object({ videoId: z.string().min(1).optional() })

/**
 * Origin worker. Triggered by cron/scheduler (NOT by users):
 *   curl -X POST -H "x-worker-secret: $WORKER_SECRET" /api/worker/process
 * Picks the oldest PROCESSING video when no id is given.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WORKER_SECRET
  if (!secret || req.headers.get('x-worker-secret') !== secret) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid body.' }, { status: 400 })

  let videoId = parsed.data.videoId
  if (!videoId) {
    const next = await prisma.video.findFirst({
      where: { status: 'PROCESSING' },
      orderBy: { updatedAt: 'asc' },
      select: { id: true },
    })
    if (!next) return Response.json({ processed: false, reason: 'queue empty' })
    videoId = next.id
  }

  try {
    const result = await processVideo(videoId)
    return Response.json({ processed: true, ...result })
  } catch (err) {
    console.error('[worker] processVideo failed:', (err as Error).message)
    return Response.json({ processed: false, videoId, error: (err as Error).message }, { status: 500 })
  }
}
