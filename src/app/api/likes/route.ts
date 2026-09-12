import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

const bodySchema = z.object({ videoId: z.string().min(1) })

/** Toggle like. The Video.likes counter is the cached total. */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'videoId is required.' }, { status: 400 })

  const video = await prisma.video.findFirst({
    where: { id: parsed.data.videoId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, likes: true },
  })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

  const existing = await prisma.like.findUnique({
    where: { userId_videoId: { userId: session.userId, videoId: video.id } },
    select: { id: true },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.video.update({ where: { id: video.id }, data: { likes: { decrement: 1 } } }),
    ])
    return NextResponse.json({ liked: false, likes: Math.max(0, video.likes - 1) })
  }
  const [, updated] = await prisma.$transaction([
    prisma.like.create({ data: { userId: session.userId, videoId: video.id } }),
    prisma.video.update({ where: { id: video.id }, data: { likes: { increment: 1 } } }),
  ])
  return NextResponse.json({ liked: true, likes: updated.likes })
}

/** Like state for the viewer (null when logged out). */
export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ liked: null })
  const videoId = new URL(req.url).searchParams.get('videoId')
  if (!videoId) return NextResponse.json({ error: 'videoId is required.' }, { status: 400 })
  const existing = await prisma.like.findUnique({
    where: { userId_videoId: { userId: session.userId, videoId } },
    select: { id: true },
  })
  return NextResponse.json({ liked: !!existing })
}
