import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'
import { toSeriesCardData, episodeWatchUrl, type SeriesCardData } from '@/lib/series'
import type { VideoCardData } from '@/types'

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  duration: z.enum(['short', 'medium', 'long']).optional(),
  uploadDate: z.enum(['today', 'week', 'month', 'year']).optional(),
  sort: z.enum(['relevance', 'newest', 'most_viewed', 'most_liked']).default('relevance'),
})

export type EpisodeMatch = {
  episodeNumber: number
  title: string
  href: string
  videoId: string
  seriesTitle: string
  seriesSlug: string
  thumbnailUrl: string
  duration: number
}

const DURATION_FILTER = {
  short: { lt: 240 },
  long: { gt: 1200 },
} as const

/**
 * Smart search with ranking:
 * 1. exact series title → 2. exact episode title → 3. series+episode
 * ("night story episode 04") → 4. partial titles → 5. creator/category/tag.
 * Episode videos of a matched series are grouped under it, never duplicated
 * above it; direct episode hits also surface individually (max 4).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = searchSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 })
    }
    const { q, page, pageSize, category, duration, uploadDate, sort } = query.data
    const needle = q.trim()
    const lowered = needle.toLowerCase()

    const epParse = /episode\s*0*(\d+)/i.exec(needle)
    const epNumber = epParse ? Number(epParse[1]) : null
    const seriesRemainder = epParse
      ? needle.slice(0, epParse.index).trim() || needle.slice(epParse.index + epParse[0].length).trim()
      : needle

    const publishedVideo = { status: 'PUBLISHED' as const, deletedAt: null }

    // ── 1+2. series matches (exact title first) ──
    const seriesRows = await prisma.series.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { equals: needle, mode: 'insensitive' as const } },
          { title: { contains: seriesRemainder || needle, mode: 'insensitive' as const } },
          { slug: { contains: lowered.replace(/\s+/g, '-') } },
        ],
      },
      take: 5,
      select: {
        id: true, title: true, slug: true, description: true, thumbnail: true, coverImage: true,
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          select: { video: { select: { views: true, thumbnailUrl: true, status: true } } },
        },
      },
    })
    const exactFirst = [...seriesRows].sort((a, b) =>
      a.title.toLowerCase() === lowered ? -1 : b.title.toLowerCase() === lowered ? 1 : 0
    )
    const series: SeriesCardData[] = exactFirst.map(toSeriesCardData)
    const matchedSeriesIds = new Set(seriesRows.map((s) => s.id))

    // ── 3. series + episode ("night story episode 04") ──
    const directEpisodes: EpisodeMatch[] = []
    if (epNumber !== null && seriesRemainder) {
      const ep = await prisma.episode.findFirst({
        where: {
          episodeNumber: epNumber,
          series: {
            status: 'PUBLISHED',
            OR: [
              { title: { contains: seriesRemainder, mode: 'insensitive' as const } },
              { slug: { contains: seriesRemainder.toLowerCase().replace(/\s+/g, '-') } },
            ],
          },
          video: publishedVideo,
        },
        select: {
          episodeNumber: true, title: true,
          series: { select: { title: true, slug: true } },
          video: { select: { id: true, slug: true, thumbnailUrl: true, duration: true } },
        },
      })
      if (ep) {
        directEpisodes.push({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          href: episodeWatchUrl(ep.video.slug, ep.video.id),
          videoId: ep.video.id,
          seriesTitle: ep.series.title,
          seriesSlug: ep.series.slug,
          thumbnailUrl: ep.video.thumbnailUrl ?? '',
          duration: ep.video.duration ?? 0,
        })
      }
    }

    // ── 2b. episode title matches (any series) ──
    if (directEpisodes.length === 0) {
      const epTitleHits = await prisma.episode.findMany({
        where: {
          title: { contains: needle, mode: 'insensitive' as const },
          series: { status: 'PUBLISHED' },
          video: publishedVideo,
        },
        take: 4,
        orderBy: { episodeNumber: 'asc' },
        select: {
          episodeNumber: true, title: true,
          series: { select: { title: true, slug: true } },
          video: { select: { id: true, slug: true, thumbnailUrl: true, duration: true } },
        },
      })
      for (const ep of epTitleHits) {
        directEpisodes.push({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          href: episodeWatchUrl(ep.video.slug, ep.video.id),
          videoId: ep.video.id,
          seriesTitle: ep.series.title,
          seriesSlug: ep.series.slug,
          thumbnailUrl: ep.video.thumbnailUrl ?? '',
          duration: ep.video.duration ?? 0,
        })
      }
    }

    // ── 4+5. loose video matches, minus grouped-away series episodes ──
    const since = uploadDate
      ? new Date(Date.now() - ({ today: 1, week: 7, month: 30, year: 365 } as const)[uploadDate] * 86400000)
      : undefined
    const videoWhere = {
      ...publishedVideo,
      OR: [
        { title: { contains: needle, mode: 'insensitive' as const } },
        { description: { contains: needle, mode: 'insensitive' as const } },
        { creator: { displayName: { contains: needle, mode: 'insensitive' as const } } },
        { tags: { some: { tag: { name: { contains: needle, mode: 'insensitive' as const } } } } },
      ],
      ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
      ...(duration && duration !== 'medium' ? { duration: DURATION_FILTER[duration] } : {}),
      ...(duration === 'medium' ? { duration: { gte: 240, lte: 1200 } } : {}),
      ...(since ? { publishedAt: { gte: since } } : {}),
    }
    const orderBy =
      sort === 'newest' ? { publishedAt: 'desc' as const }
      : sort === 'most_viewed' ? { views: 'desc' as const }
      : sort === 'most_liked' ? { likes: 'desc' as const }
      : { views: 'desc' as const }

    const loose = await prisma.video.findMany({
      where: videoWhere,
      select: { ...catalogSelect, slug: true, episode: { select: { seriesId: true } } },
      orderBy,
      take: pageSize + 12,
    })
    // Drop episodes of already-matched series (grouped under the card);
    // episodes of other series stay as individual results.
    const videos: VideoCardData[] = []
    for (const v of loose) {
      const seriesId = v.episode?.seriesId
      if (seriesId && matchedSeriesIds.has(seriesId)) continue
      videos.push(toVideoCardData(v))
      if (videos.length >= pageSize) break
    }

    const total = videos.length + series.length + directEpisodes.length
    return NextResponse.json({
      series,
      episodes: directEpisodes,
      videos,
      data: videos,
      total,
      page,
      pageSize,
      hasMore: false,
    })
  } catch (err) {
    console.error('[api/search]', (err as Error).message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
