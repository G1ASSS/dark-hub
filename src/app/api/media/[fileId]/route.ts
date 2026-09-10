import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { getStorageProvider } from '@/lib/storage'
import { getCachedPath, serveFile, fileResponse } from '@/lib/cache/origin'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * Public origin media (category covers, avatars, …) referenced as
 * `tg:<telegram_file_id>` in the DB. Deliberately NOT login-gated:
 * browse pages sit behind the age gate, not auth, and posters are
 * public imagery — only video bytes (segments/downloads) stay gated.
 * File ids are unguessable; responses are cached on disk.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { fileId } = await ctx.params
  if (!fileId || /[/\\.]/.test(fileId)) return new Response('Bad file id', { status: 400 })

  // Only serve file ids the platform actually references (no open proxy).
  const referenced =
    (await prisma.category.findFirst({ where: { imageUrl: `tg:${fileId}` }, select: { id: true } })) ??
    (await prisma.profile.findFirst({
      where: { OR: [{ avatarUrl: `tg:${fileId}` }, { bannerUrl: `tg:${fileId}` }] },
      select: { id: true },
    })) ??
    (await prisma.creator.findFirst({
      where: { OR: [{ avatarUrl: `tg:${fileId}` }, { bannerUrl: `tg:${fileId}` }] },
      select: { id: true },
    }))
  if (!referenced) return new Response('Not found', { status: 404 })

  try {
    const storage = getStorageProvider()
    const key = `m-${createHash('sha256').update(fileId).digest('hex').slice(0, 32)}`
    const path = await getCachedPath(key, async () => {
      const up = await storage.downloadStream(fileId)
      return up.body
    })
    // Covers are normalized to JPEG at upload time; the cache path
    // carries no extension, so the type is fixed, never sniffed.
    const served = await serveFile(path, 'image/jpeg', req.headers.get('range'), 'public, max-age=86400')
    return fileResponse(served)
  } catch (err) {
    console.error('[media] origin fetch failed:', (err as Error).message)
    return new Response('Origin unavailable', { status: 502 })
  }
}
