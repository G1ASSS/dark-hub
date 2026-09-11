import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

const postSchema = z.object({
  videoId: z.string().min(1),
  position: z.number().int().min(0),
  duration: z.number().int().positive(),
})

/** Record playback position (called ~every 15s by the player + on pause). */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  const { videoId, duration } = parsed.data
  const position = Math.min(parsed.data.position, duration)

  const video = await prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true },
  })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

  await prisma.watchProgress.upsert({
    where: { userId_videoId: { userId: session.userId, videoId } },
    update: { position, duration },
    create: { userId: session.userId, videoId, position, duration },
  })
  return NextResponse.json({ ok: true })
}

/** Unfinished videos, most recently watched first. */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ data: [] })

  const rows = await prisma.watchProgress.findMany({
    where: { userId: session.userId, video: { status: 'PUBLISHED', deletedAt: null } },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      position: true,
      duration: true,
      updatedAt: true,
      video: { select: catalogSelect },
    },
  })

  const data = rows
    .filter((r) => r.duration > 0 && r.position / r.duration < 0.95)
    .map((r) => ({
      video: toVideoCardData(r.video),
      position: r.position,
      duration: r.duration,
      updatedAt: r.updatedAt.toISOString(),
    }))
  return NextResponse.json({ data })
}
