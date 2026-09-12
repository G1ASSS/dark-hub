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
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

/** Staff: edit a series. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, session } = await staff()
  if (error) return error

  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const exists = await prisma.series.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Series not found.' }, { status: 404 })

  const updated = await prisma.series.update({
    where: { id },
    data: { ...parsed.data },
    select: { id: true, title: true, slug: true, status: true },
  })
  await prisma.auditLog.create({
    data: { actorId: session!.userId, action: 'SERIES_UPDATED', targetType: 'SERIES', targetId: id },
  })
  return NextResponse.json(updated)
}

/**
 * Staff: delete a series. Episode links are removed (videos become
 * standalone and keep their status); origin files are untouched.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error, session } = await staff()
  if (error) return error

  const { id } = await ctx.params
  const exists = await prisma.series.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!exists) return NextResponse.json({ error: 'Series not found.' }, { status: 404 })

  await prisma.series.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      actorId: session!.userId,
      action: 'SERIES_DELETED',
      targetType: 'SERIES',
      targetId: id,
      metadata: { title: exists.title },
    },
  })
  return NextResponse.json({ ok: true })
}
