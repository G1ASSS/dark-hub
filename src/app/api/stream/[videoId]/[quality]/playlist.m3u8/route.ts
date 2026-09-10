import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPlaybackToken } from '@/lib/playback/token'
import { buildVariantPlaylist, requestOrigin } from '@/lib/playback/manifest'
import { getUserPlan, qualityHeight } from '@/lib/subscriptions/access'

type Ctx = { params: Promise<Record<string, string>> }

/** Rendition playlist: segment list for one quality, plan-cap enforced. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { videoId, quality } = await ctx.params
  const token = req.nextUrl.searchParams.get('token')
  const claims = token ? await verifyPlaybackToken(token) : null
  if (!token || !claims || claims.kind !== 'stream' || claims.videoId !== videoId) {
    return new Response('Forbidden', { status: 403 })
  }

  const plan = await getUserPlan(claims.userId)
  if (qualityHeight(quality) > qualityHeight(plan.maxQuality)) {
    return new Response('Rendition not included in your plan.', { status: 403 })
  }

  const [video, assets] = await Promise.all([
    prisma.video.findFirst({
      where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    }),
    prisma.videoAsset.findMany({
      where: {
        videoId,
        type: 'HLS_SEGMENT',
        quality,
        storageStatus: 'STORED',
        telegramFileId: { not: null },
      },
      orderBy: { segmentIndex: 'asc' },
      select: { segmentIndex: true, duration: true },
    }),
  ])
  if (!video || assets.length === 0) return new Response('Not found', { status: 404 })

  const body = buildVariantPlaylist(
    videoId,
    quality,
    assets.map((a) => ({ index: a.segmentIndex ?? 0, duration: a.duration ?? 6 })),
    token,
    requestOrigin(req)
  )
  return new Response(body, {
    headers: {
      'content-type': 'application/vnd.apple.mpegurl',
      'cache-control': 'private, no-store',
    },
  })
}
