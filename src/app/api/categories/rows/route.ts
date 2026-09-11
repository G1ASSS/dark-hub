import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(8),
})

/**
 * Categories that actually contain videos, each with its latest videos.
 * Empty categories are omitted — rows appear automatically on upload,
 * no manual covers needed.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!query.success) return NextResponse.json({ error: 'Invalid query.' }, { status: 400 })
    const limit = query.data.limit

    const published = { status: 'PUBLISHED' as const, deletedAt: null }
    const categories = await prisma.category.findMany({
      where: { isActive: true, videos: { some: { video: published } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        videos: {
          where: { video: published },
          orderBy: { video: { publishedAt: 'desc' } },
          take: limit,
          select: { video: { select: catalogSelect } },
        },
        _count: { select: { videos: { where: { video: published } } } },
      },
    })

    return NextResponse.json({
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        videoCount: c._count.videos,
        videos: c.videos.map((v) => toVideoCardData(v.video)),
      })),
    })
  } catch (err) {
    console.error('[api/categories/rows]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
