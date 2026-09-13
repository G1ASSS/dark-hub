import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/auth/dal'
import { getStorageProvider } from '@/lib/storage'
import { getCachedPath, serveFile, fileResponse } from '@/lib/cache/origin'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * Staff-only payment screenshot viewer. The image bytes live in Telegram
 * storage and are NEVER exposed publicly — only admins can open this URL,
 * and only for screenshots actually referenced by a payment record.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id || /[/\\.]/.test(id)) return new Response('Bad payment id', { status: 400 })

  const payment = await prisma.paymentTransaction.findUnique({
    where: { id },
    select: { screenshotKey: true },
  })
  const key = payment?.screenshotKey
  if (!key?.startsWith('tg:')) return new Response('No screenshot for this payment', { status: 404 })
  const fileId = key.slice(3)

  try {
    const storage = getStorageProvider()
    const cacheKey = `p-${createHash('sha256').update(fileId).digest('hex').slice(0, 32)}`
    const path = await getCachedPath(cacheKey, async () => {
      const up = await storage.downloadStream(fileId)
      return up.body
    })
    // Screenshots are normalized to JPEG at submission time.
    const served = await serveFile(path, 'image/jpeg', req.headers.get('range'), 'private, max-age=300')
    return fileResponse(served)
  } catch (err) {
    console.error('[admin payment screenshot] origin fetch failed:', (err as Error).message)
    return new Response('Origin unavailable', { status: 502 })
  }
}
