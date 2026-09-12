import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { toSeriesCardData } from '@/lib/series'

/** All published series with published-episode counts and covers. */
export async function GET() {
  try {
    const rows = await prisma.series.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        coverImage: true,
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          select: {
            video: {
              select: { views: true, thumbnailUrl: true, status: true },
            },
          },
        },
      },
    })
    return NextResponse.json({ data: rows.map(toSeriesCardData) })
  } catch (err) {
    console.error('[api/series]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
