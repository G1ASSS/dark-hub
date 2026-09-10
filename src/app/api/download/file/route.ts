import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPlaybackToken } from '@/lib/playback/token'
import { getStorageProvider } from '@/lib/storage'
import { getCachedPath, serveFile, fileResponse } from '@/lib/cache/origin'
import { checkDownloadAllowed, countDownloadsToday } from '@/lib/subscriptions/access'
import { slugify } from '@/lib/utils'

/**
 * Authorized download endpoint. Re-validates everything at serve time:
 * token, video status, live subscription, quality allowance, daily limit.
 * Each download is recorded (Download row + DOWNLOAD audit log with the
 * forensic watermark payload, IP and user agent) for abuse detection.
 *
 * Honest limitation: once bytes reach a browser they can be re-captured.
 * This endpoint makes unauthorized bulk downloading impractical
 * (short-lived user-bound URLs, limits, audit trail) — not impossible.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const claims = token ? await verifyPlaybackToken(token) : null
  if (!claims || claims.kind !== 'download' || !claims.quality) {
    return new Response('Forbidden', { status: 403 })
  }
  const { videoId, userId, quality } = claims

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
    select: {
      id: true,
      title: true,
      qualities: { select: { resolution: true } },
    },
  })
  if (!video) return new Response('Not found', { status: 404 })

  const check = await checkDownloadAllowed(
    userId,
    quality,
    video.qualities.map((q) => q.resolution)
  )
  if (!check.ok) return new Response('Forbidden', { status: 403 })

  const asset = await prisma.videoAsset.findFirst({
    where: {
      videoId,
      type: 'MP4',
      quality,
      storageStatus: 'STORED',
      telegramFileId: { not: null },
    },
    select: { id: true, telegramFileId: true },
  })
  if (!asset?.telegramFileId) {
    return new Response('This quality is not available for download yet.', { status: 404 })
  }

  const used = await countDownloadsToday(userId)
  if (check.plan.dailyDownloadLimit > 0 && used >= check.plan.dailyDownloadLimit) {
    return new Response('Daily download limit reached.', { status: 429 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent')

  await prisma.download.create({
    data: { userId, videoId, quality, ipAddress: ip, userAgent },
  })
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'DOWNLOAD',
      targetType: 'VIDEO',
      targetId: videoId,
      metadata: { quality, wm: claims.wm ?? null },
      ipAddress: ip,
      userAgent,
    },
  })

  try {
    const storage = getStorageProvider()
    const fileId = asset.telegramFileId
    const path = await getCachedPath(`a-${asset.id}`, async () => {
      const up = await storage.downloadStream(fileId)
      return up.body
    })
    const served = await serveFile(path, 'video/mp4', req.headers.get('range'), 'private, no-store')
    const filename = `darkhubb-${slugify(video.title).slice(0, 60) || video.id}-${quality}.mp4`
    return fileResponse(served, { 'content-disposition': `attachment; filename="${filename}"` })
  } catch (err) {
    console.error('[download] origin fetch failed:', (err as Error).message)
    return new Response('Origin unavailable', { status: 502 })
  }
}
