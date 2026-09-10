import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  duration: z.enum(['short', 'medium', 'long']).optional(),
  uploadDate: z.enum(['today', 'week', 'month', 'year']).optional(),
  sort: z.enum(['relevance', 'newest', 'most_viewed', 'most_liked']).default('relevance'),
})

const DURATION_FILTER = {
  short: { lt: 240 },
  medium: {},
  long: { gt: 1200 },
} as const

/** Public search over published videos (title + creator name). */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = searchSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 })
    }
    const { q, page, pageSize, category, duration, uploadDate, sort } = query.data
    const since = uploadDate
      ? new Date(Date.now() - ({ today: 1, week: 7, month: 30, year: 365 } as const)[uploadDate] * 86400000)
      : undefined
    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { creator: { displayName: { contains: q, mode: 'insensitive' as const } } },
      ],
      ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
      ...(duration && duration !== 'medium'
        ? { duration: DURATION_FILTER[duration] }
        : {}),
      ...(duration === 'medium' ? { duration: { gte: 240, lte: 1200 } } : {}),
      ...(since ? { publishedAt: { gte: since } } : {}),
    }
    const orderBy =
      sort === 'newest'
        ? { publishedAt: 'desc' as const }
        : sort === 'most_viewed'
          ? { views: 'desc' as const }
          : sort === 'most_liked'
            ? { likes: 'desc' as const }
            : { views: 'desc' as const }
    const [total, rows] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        select: catalogSelect,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return NextResponse.json({
      data: rows.map(toVideoCardData),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    })
  } catch (err) {
    console.error('[api/search]', (err as Error).message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
