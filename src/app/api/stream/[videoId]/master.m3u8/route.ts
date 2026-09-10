import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPlaybackToken } from '@/lib/playback/token'
import { buildMasterPlaylist, requestOrigin } from '@/lib/playback/manifest'
import { getUserPlan, allowedQualities } from '@/lib/subscriptions/access'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * VOD master playlist. Re-validates the token, the video status, AND the
 * viewer's current plan on every request — a downgraded user immediately
 * loses access to higher renditions.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { videoId } = await ctx.params
  const token = req.nextUrl.searchParams.get('token')
  const claims = token ? await verifyPlaybackToken(token) : null
  if (!token || !claims || claims.kind !== 'stream' || claims.videoId !== videoId) {
    return new Response('Forbidden', { status: 403 })
  }

  const [video, plan] = await Promise.all([
    prisma.video.findFirst({
      where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        qualities: { select: { resolution: true, bitrate: true, width: true, height: true } },
      },
    }),
    getUserPlan(claims.userId),
  ])
  if (!video || video.qualities.length === 0) return new Response('Not found', { status: 404 })

  const renditions = allowedQualities(video.qualities, plan)
  if (renditions.length === 0) return new Response('No playable rendition for your plan.', { status: 403 })

  const body = buildMasterPlaylist(video.id, renditions, token, requestOrigin(req))
  return new Response(body, {
    headers: {
      'content-type': 'application/vnd.apple.mpegurl',
      'cache-control': 'private, no-store',
    },
  })
}
