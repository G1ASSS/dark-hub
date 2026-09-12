import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { episodeWatchUrl } from '@/lib/series'

type Ctx = { params: Promise<Record<string, string>> }

/**
 * Series detail: metadata + episodes in episodeNumber order.
 * Only episodes whose video is PUBLISHED are exposed.
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params
    const series = await prisma.series.findFirst({
      where: { slug, status: 'PUBLISHED' },
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
            episodeNumber: true,
            title: true,
            description: true,
            video: {
              select: {
                id: true,
                slug: true,
                title: true,
                thumbnailUrl: true,
                duration: true,
                views: true,
                publishedAt: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    })
    if (!series) return NextResponse.json({ error: 'Series not found.' }, { status: 404 })

    const episodes = series.episodes
      .filter((e) => e.video.status === 'PUBLISHED' && !e.video.deletedAt)
      .map((e) => ({
        episodeNumber: e.episodeNumber,
        title: e.title,
        description: e.description,
        duration: e.video.duration,
        views: Number(e.video.views),
        publishedAt: e.video.publishedAt?.toISOString() ?? null,
        thumbnailUrl: e.video.thumbnailUrl,
        href: episodeWatchUrl(e.video.slug, e.video.id),
        videoId: e.video.id,
      }))

    const cover =
      (series.coverImage?.startsWith('https://') ? series.coverImage : null) ??
      (series.coverImage?.startsWith('tg:')
        ? `/api/media/${series.coverImage.slice(3)}`
        : null) ??
      series.thumbnail ??
      episodes[0]?.thumbnailUrl ??
      null

    return NextResponse.json({
      id: series.id,
      title: series.title,
      slug: series.slug,
      description: series.description,
      coverUrl: cover,
      episodeCount: episodes.length,
      episodes,
    })
  } catch (err) {
    console.error('[api/series/:slug]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
