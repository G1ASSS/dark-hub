import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'
import { toSeriesCardData, episodeWatchUrl } from '@/lib/series'
import type { VideoCardData } from '@/types'

export type FeedItem =
  | {
      kind: 'series'
      id: string
      title: string
      image: string | null
      href: string
      views: number
      subtitle: string
    }
  | {
      kind: 'video'
      id: string
      title: string
      image: string
      href: string
      views: number
      subtitle: string
      video: VideoCardData
    }

/**
 * Mixed trending feed. Videos that belong to a published series collapse
 * into ONE series card — no duplicate episode cards, ever.
 */
export async function GET() {
  try {
    const [seriesRows, videoRows] = await Promise.all([
      prisma.series.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          coverImage: true,
          episodes: {
            orderBy: { episodeNumber: 'asc' },
            select: { video: { select: { views: true, thumbnailUrl: true, status: true } } },
          },
        },
      }),
      prisma.video.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { views: 'desc' },
        take: 30,
        select: { ...catalogSelect, slug: true, episode: { select: { id: true } } },
      }),
    ])

    const seriesCards = seriesRows
      .map(toSeriesCardData)
      .filter((s) => s.episodeCount > 0)

    // Videos that are episodes of a published series collapse into the card
    const episodeLinks = await prisma.episode.findMany({
      where: { series: { status: 'PUBLISHED' }, video: { status: 'PUBLISHED', deletedAt: null } },
      select: { videoId: true },
    })
    const episodeVideoIds = new Set(episodeLinks.map((e) => e.videoId))

    const items: FeedItem[] = []
    for (const s of seriesCards) {
      items.push({
        kind: 'series',
        id: s.id,
        title: s.title,
        image: s.coverUrl,
        href: `/series/${s.slug}`,
        views: s.totalViews,
        subtitle: `${s.episodeCount} Episode${s.episodeCount === 1 ? '' : 's'}`,
      })
    }
    for (const v of videoRows) {
      if (episodeVideoIds.has(v.id)) continue
      const card = toVideoCardData(v)
      items.push({
        kind: 'video',
        id: v.id,
        title: v.title,
        image: card.thumbnailUrl,
        href: episodeWatchUrl(v.slug, v.id),
        views: Number(v.views),
        subtitle: `${card.creator.displayName}`,
        video: card,
      })
    }
    items.sort((a, b) => b.views - a.views)

    return NextResponse.json({ data: items.slice(0, 24) })
  } catch (err) {
    console.error('[api/feed/trending]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
