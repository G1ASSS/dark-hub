import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['newest', 'most_viewed', 'most_liked']).default('newest'),
  category: z.string().optional(),
})

const orderByFor = {
  newest: { publishedAt: 'desc' as const },
  most_viewed: { views: 'desc' as const },
  most_liked: { likes: 'desc' as const },
}

/** Public catalog of published videos. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: query.error.flatten() }, { status: 400 })
    }
    const { page, pageSize, sort, category } = query.data
    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
    }
    const [total, rows] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        select: catalogSelect,
        orderBy: orderByFor[sort],
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
    console.error('[api/videos]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
