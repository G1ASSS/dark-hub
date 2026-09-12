import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

type Ctx = { params: Promise<Record<string, string>> }

async function staff() {
  const session = await verifySession()
  if (!session) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) }
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

const addSchema = z.object({
  videoId: z.string().min(1),
  episodeNumber: z.number().int().min(1).max(10000),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
})

/** Staff: attach an existing video as an episode (ordered by episodeNumber). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { error, session } = await staff()
  if (error) return error

  const { id: seriesId } = await ctx.params
  const parsed = addSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'videoId and episodeNumber are required.' }, { status: 400 })

  const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { id: true } })
  if (!series) return NextResponse.json({ error: 'Series not found.' }, { status: 404 })
  const video = await prisma.video.findUnique({
    where: { id: parsed.data.videoId },
    select: { id: true, title: true, episode: { select: { id: true } } },
  })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  if (video.episode) return NextResponse.json({ error: 'Video is already an episode.' }, { status: 409 })

  const taken = await prisma.episode.findUnique({
    where: { seriesId_episodeNumber: { seriesId, episodeNumber: parsed.data.episodeNumber } },
    select: { id: true },
  })
  if (taken) {
    return NextResponse.json({ error: `Episode ${parsed.data.episodeNumber} already exists in this series.` }, { status: 409 })
  }

  const episode = await prisma.episode.create({
    data: {
      seriesId,
      videoId: video.id,
      episodeNumber: parsed.data.episodeNumber,
      title: parsed.data.title?.trim() || video.title,
      description: parsed.data.description,
    },
    select: { id: true, episodeNumber: true, title: true },
  })
  await prisma.auditLog.create({
    data: {
      actorId: session!.userId,
      action: 'EPISODE_ADDED',
      targetType: 'EPISODE',
      targetId: episode.id,
      metadata: { seriesId, videoId: video.id },
    },
  })
  return NextResponse.json(episode, { status: 201 })
}
