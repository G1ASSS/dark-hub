import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { signPlaybackToken, DOWNLOAD_TOKEN_TTL_SECONDS } from '@/lib/playback/token'
import { checkDownloadAllowed } from '@/lib/subscriptions/access'
import { requestOrigin } from '@/lib/playback/manifest'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({ videoId: z.string().min(1), quality: z.string().min(1) })

/**
 * Mint a short-lived download authorization.
 * FREE (or capped) users get UPGRADE_REQUIRED — the frontend turns that
 * into the subscription upsell. Nothing downloadable is exposed here;
 * the actual bytes flow through /api/download/file after fresh re-checks.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to download.' }, { status: 401 })

  const rl = await checkRateLimit(`dl-token:${session.userId}`, 10, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'videoId and quality are required.' }, { status: 400 })
  const { videoId, quality } = parsed.data

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
    select: {
      id: true,
      qualities: { select: { resolution: true } },
    },
  })
  if (!video) return Response.json({ error: 'Video not found.' }, { status: 404 })

  const check = await checkDownloadAllowed(
    session.userId,
    quality,
    video.qualities.map((q) => q.resolution)
  )
  if (!check.ok) {
    const status = check.reason === 'UPGRADE_REQUIRED' ? 402 : 403
    return Response.json(
      { error: check.reason, plan: check.plan.planSlug, maxQuality: check.plan.maxQuality },
      { status }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { username: true },
  })

  // Forensic watermark payload: travels in the token, persisted in the audit log.
  const token = await signPlaybackToken(
    {
      videoId,
      userId: session.userId,
      kind: 'download',
      quality,
      wm: { u: user?.username ?? 'unknown', t: Date.now() },
    },
    DOWNLOAD_TOKEN_TTL_SECONDS
  )

  const base = requestOrigin(req)
  return Response.json({
    url: `${base}/api/download/file?token=${encodeURIComponent(token)}`,
    expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS,
  })
}
