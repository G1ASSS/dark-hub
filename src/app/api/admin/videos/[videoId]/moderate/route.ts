import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { moderateVideo } from '@/lib/moderation'

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

  try {
    const status = await moderateVideo(
      moderator.userId,
      videoId,
      parsed.data.decision,
      parsed.data.reason
    )
    return NextResponse.json({ videoId, status })
  } catch (err) {
    const message = (err as Error).message
    const code = message.includes('not awaiting review') ? 409 : message.includes('not found') ? 404 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
