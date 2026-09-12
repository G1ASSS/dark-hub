import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { uniqueSeriesSlug } from '@/lib/slugs'
import { toSeriesCardData } from '@/lib/series'

async function staff() {
  const session = await verifySession()
  if (!session) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) }
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

const episodeSelect = {
  orderBy: { episodeNumber: 'asc' as const },
  select: { video: { select: { views: true, thumbnailUrl: true, status: true } } },
}

/** Staff: full series list (any status) with counts. */
export async function GET() {
  const { error } = await staff()
  if (error) return error
  const rows = await prisma.series.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, slug: true, description: true,
      thumbnail: true, coverImage: true, status: true, sortOrder: true,
      updatedAt: true,
      _count: { select: { episodes: true } },
      episodes: episodeSelect,
    },
  })
  return NextResponse.json({
    data: rows.map((s) => ({ ...toSeriesCardData(s), status: s.status, totalEpisodes: s._count.episodes, sortOrder: s.sortOrder, thumbnailRaw: s.thumbnail, coverRaw: s.coverImage, descriptionFull: s.description })),
  })
}

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
})

/** Staff: create a series (starts as DRAFT until published). */
export async function POST(req: NextRequest) {
  const { error, session } = await staff()
  if (error) return error

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Title (2–120 chars) is required.' }, { status: 400 })

  const series = await prisma.series.create({
    data: {
      title: parsed.data.title,
      slug: await uniqueSeriesSlug(parsed.data.title),
      description: parsed.data.description,
      status: parsed.data.status,
    },
    select: { id: true, title: true, slug: true, status: true },
  })
  await prisma.auditLog.create({
    data: { actorId: session!.userId, action: 'SERIES_CREATED', targetType: 'SERIES', targetId: series.id },
  })
  return NextResponse.json(series, { status: 201 })
}
