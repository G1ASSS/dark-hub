import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { resolveVideoId } from '@/lib/series'
import { signPlaybackToken, STREAM_TOKEN_TTL_SECONDS } from '@/lib/playback/token'
import { masterPlaylistUrl, requestOrigin } from '@/lib/playback/manifest'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({ videoId: z.string().min(1) })

/**
 * Mint a short-lived stream token for a published video.
 * The token goes into HLS URLs as `?token=` (players can't set headers).
 * Quality caps are enforced when the playlists are built, not here.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to stream.' }, { status: 401 })

  const rl = await checkRateLimit(`stream-token:${session.userId}`, 30, 60)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'videoId is required.' }, { status: 400 })

  const videoId = await resolveVideoId(parsed.data.videoId)
  if (!videoId) return Response.json({ error: 'Video not found.' }, { status: 404 })

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true },
  })
  if (!video) return Response.json({ error: 'Video not found.' }, { status: 404 })

  // Count the view (fire-and-forget; playback must never wait on it).
  prisma.video.update({ where: { id: video.id }, data: { views: { increment: 1 } } }).catch(() => {})

  const token = await signPlaybackToken(
    { videoId: video.id, userId: session.userId, kind: 'stream' },
    STREAM_TOKEN_TTL_SECONDS
  )

  return Response.json({
    token,
    masterUrl: masterPlaylistUrl(video.id, token, requestOrigin(req)),
    expiresIn: STREAM_TOKEN_TTL_SECONDS,
  })
}
