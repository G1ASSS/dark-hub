import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

export const runtime = 'nodejs'

/**
 * Owner-facing processing status for one upload.
 * The upload page polls this after /complete until the video reaches
 * PENDING_REVIEW (then staff moderation) or PUBLISHED.
 */
export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in required.' }, { status: 401 })

  const videoId = req.nextUrl.searchParams.get('videoId')
  if (!videoId) return Response.json({ error: 'videoId query param is required.' }, { status: 400 })

  const video = await prisma.video.findFirst({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      status: true,
      duration: true,
      creator: { select: { userId: true } },
      qualities: { select: { resolution: true } },
    },
  })
  if (!video) return Response.json({ error: 'Video not found.' }, { status: 404 })

  const isOwner = video.creator.userId === session.userId
  const isStaff = ['ADMIN', 'MODERATOR'].includes(session.role)
  if (!isOwner && !isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 })

  return Response.json({
    videoId: video.id,
    title: video.title,
    status: video.status,
    duration: video.duration,
    qualities: video.qualities.map((q) => q.resolution),
  })
}
