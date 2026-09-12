import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { resolveVideoId } from '@/lib/series'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

const bodySchema = z.object({ videoId: z.string().min(1) })

/** Toggle favourite. Returns the new state. */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'videoId is required.' }, { status: 400 })

  const videoId = await resolveVideoId(parsed.data.videoId)
  if (!videoId) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true },
  })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

  const existing = await prisma.favorite.findUnique({
    where: { userId_videoId: { userId: session.userId, videoId: video.id } },
    select: { id: true },
  })
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ favorited: false })
  }
  await prisma.favorite.create({ data: { userId: session.userId, videoId: video.id } })
  return NextResponse.json({ favorited: true })
}

/** Favourite videos, most recently saved first. */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const rows = await prisma.favorite.findMany({
    where: { userId: session.userId, video: { status: 'PUBLISHED', deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: 48,
    select: { createdAt: true, video: { select: catalogSelect } },
  })
  return NextResponse.json({
    data: rows.map((r) => ({ ...toVideoCardData(r.video), savedAt: r.createdAt.toISOString() })),
  })
}
