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

const patchSchema = z.object({
  episodeNumber: z.number().int().min(1).max(10000).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
})

/** Staff: edit an episode (renumbering reorders the series). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, session } = await staff()
  if (error) return error

  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const episode = await prisma.episode.findUnique({ where: { id }, select: { id: true, seriesId: true } })
  if (!episode) return NextResponse.json({ error: 'Episode not found.' }, { status: 404 })

  if (parsed.data.episodeNumber !== undefined) {
    const taken = await prisma.episode.findUnique({
      where: { seriesId_episodeNumber: { seriesId: episode.seriesId, episodeNumber: parsed.data.episodeNumber } },
      select: { id: true },
    })
    if (taken && taken.id !== id) {
      return NextResponse.json({ error: `Episode ${parsed.data.episodeNumber} already exists in this series.` }, { status: 409 })
    }
  }

  const updated = await prisma.episode.update({
    where: { id },
    data: { ...parsed.data },
    select: { id: true, episodeNumber: true, title: true },
  })
  await prisma.auditLog.create({
    data: { actorId: session!.userId, action: 'EPISODE_UPDATED', targetType: 'EPISODE', targetId: id },
  })
  return NextResponse.json(updated)
}

/** Staff: remove an episode link (the video stays, becoming standalone). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error, session } = await staff()
  if (error) return error

  const { id } = await ctx.params
  const episode = await prisma.episode.findUnique({ where: { id }, select: { id: true, seriesId: true } })
  if (!episode) return NextResponse.json({ error: 'Episode not found.' }, { status: 404 })

  await prisma.episode.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      actorId: session!.userId,
      action: 'EPISODE_DELETED',
      targetType: 'EPISODE',
      targetId: id,
      metadata: { seriesId: episode.seriesId },
    },
  })
  return NextResponse.json({ ok: true })
}
