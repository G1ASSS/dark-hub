import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getStorageProvider } from '@/lib/storage'
import { getOriginBytes, bufferResponse } from '@/lib/cache/supabase-hot'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * Poster image. Deliberately NOT login-gated: browse pages sit behind the
 * age gate, not auth, and posters are public imagery — only video bytes
 * (segments/downloads) stay behind sessions + signed tokens.
 * Accepts an optional ?token= for HLS-embedded use.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { videoId } = await ctx.params

  const asset = await prisma.videoAsset.findFirst({
    where: {
      videoId,
      type: 'THUMBNAIL',
      storageStatus: 'STORED',
      telegramFileId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, telegramFileId: true, video: { select: { status: true, deletedAt: true } } },
  })
  if (!asset?.telegramFileId || asset.video.status !== 'PUBLISHED' || asset.video.deletedAt) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const storage = getStorageProvider()
    const fileId = asset.telegramFileId
    const { bytes } = await getOriginBytes(asset.id, 'thumb', fileId, 'image/jpeg', async () => {
      const up = await storage.downloadStream(fileId)
      return up.body
    })
    return bufferResponse(bytes, 'image/jpeg', req.headers.get('range'), 'private, max-age=3600')
  } catch (err) {
    console.error('[thumbnail] origin fetch failed:', (err as Error).message)
    return new Response('Origin unavailable', { status: 502 })
  }
}
