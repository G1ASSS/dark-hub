import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

type Ctx = { params: Promise<Record<string, string>> }

const bodySchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(1000).optional(),
})

/** Moderation gate: processed videos publish only after staff approval. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const moderator = session

  const { videoId } = await ctx.params
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'decision must be APPROVE or REJECT.' }, { status: 400 })

  const video = await prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!video) return Response.json({ error: 'Video not found.' }, { status: 404 })
  if (video.status !== 'PENDING_REVIEW') {
    return Response.json({ error: `Video is ${video.status}, not awaiting review.` }, { status: 409 })
  }

  const approved = parsed.data.decision === 'APPROVE'
  await prisma.video.update({
    where: { id: videoId },
    data: approved
      ? { status: 'PUBLISHED', publishedAt: new Date() }
      : { status: 'REJECTED' },
  })
  await prisma.moderationAction.create({
    data: {
      moderatorId: moderator.userId,
      targetType: 'VIDEO',
      targetId: videoId,
      videoId,
      action: approved ? 'APPROVE_VIDEO' : 'REJECT_VIDEO',
      reason: parsed.data.reason,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: moderator.userId,
      action: approved ? 'VIDEO_APPROVED' : 'VIDEO_REJECTED',
      targetType: 'VIDEO',
      targetId: videoId,
      metadata: { reason: parsed.data.reason ?? null },
    },
  })

  return Response.json({ videoId, status: approved ? 'PUBLISHED' : 'REJECTED' })
}
