import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'
import { resolveVideoId, episodeWatchUrl } from '@/lib/series'

type Ctx = { params: Promise<Record<string, string>> }

/** Public metadata for one published video (player fetches its own stream token). */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { videoId: ref } = await ctx.params
    const videoId = await resolveVideoId(ref)
    if (!videoId) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

    const video = await prisma.video.findFirst({
      where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
      select: {
        ...catalogSelect,
        description: true,
        likes: true,
        qualities: { select: { resolution: true }, orderBy: { resolution: 'asc' } },
        episode: {
          select: {
            episodeNumber: true,
            title: true,
            series: {
              select: {
                id: true,
                title: true,
                slug: true,
                episodes: {
                  orderBy: { episodeNumber: 'asc' },
                  select: {
                    episodeNumber: true,
                    title: true,
                    video: {
                      select: {
                        id: true,
                        slug: true,
                        title: true,
                        duration: true,
                        status: true,
                        deletedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })

    const episodes = (video.episode?.series.episodes ?? [])
      .filter((e) => e.video.status === 'PUBLISHED' && !e.video.deletedAt)
      .map((e) => ({
        episodeNumber: e.episodeNumber,
        title: e.title,
        duration: e.video.duration,
        href: episodeWatchUrl(e.video.slug, e.video.id),
        videoId: e.video.id,
      }))

    return NextResponse.json({
      ...toVideoCardData(video),
      description: video.description,
      likes: video.likes,
      qualities: video.qualities.map((q) => q.resolution),
      series: video.episode
        ? {
            id: video.episode.series.id,
            title: video.episode.series.title,
            slug: video.episode.series.slug,
            currentEpisode: video.episode.episodeNumber,
            episodes,
          }
        : null,
    })
  } catch (err) {
    console.error('[api/videos/:id]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
