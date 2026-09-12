import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPlaybackToken } from '@/lib/playback/token'
import { getStorageProvider } from '@/lib/storage'
import { getOriginBytes, bufferResponse } from '@/lib/cache/supabase-hot'
import { getUserPlan, qualityHeight } from '@/lib/subscriptions/access'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * Segment proxy: the ONLY path browsers use to fetch bytes.
 * Verifies the token, re-checks the plan cap, then serves from the local
 * origin cache (Telegram fetch on miss). The bot token and Telegram URLs
 * never reach the client.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { videoId, quality, index } = await ctx.params
  const token = req.nextUrl.searchParams.get('token')
  const claims = token ? await verifyPlaybackToken(token) : null
  if (!claims || claims.kind !== 'stream' || claims.videoId !== videoId) {
    return new Response('Forbidden', { status: 403 })
  }

  const rl = await checkRateLimit(`seg:${claims.userId}`, 600, 60)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const plan = await getUserPlan(claims.userId)
  if (qualityHeight(quality) > qualityHeight(plan.maxQuality)) {
    return new Response('Forbidden', { status: 403 })
  }

  const segIndex = Number(index)
  if (!Number.isInteger(segIndex) || segIndex < 0) {
    return new Response('Bad segment index', { status: 400 })
  }

  const asset = await prisma.videoAsset.findFirst({
    where: {
      videoId,
      type: 'HLS_SEGMENT',
      quality,
      segmentIndex: segIndex,
      storageStatus: 'STORED',
      telegramFileId: { not: null },
    },
    select: { id: true, telegramFileId: true, video: { select: { status: true, deletedAt: true } } },
  })
  if (!asset?.telegramFileId || asset.video.status !== 'PUBLISHED' || asset.video.deletedAt) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const storage = getStorageProvider()
    const fileId = asset.telegramFileId
    const { bytes } = await getOriginBytes(asset.id, 'seg', fileId, 'video/MP2T', async () => {
      const up = await storage.downloadStream(fileId)
      return up.body
    })
    return bufferResponse(bytes, 'video/MP2T', req.headers.get('range'))
  } catch (err) {
    console.error('[stream] origin fetch failed:', (err as Error).message)
    return new Response('Origin unavailable', { status: 502 })
  }
}
