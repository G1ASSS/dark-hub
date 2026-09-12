import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

export const publishedVideoWhere = { status: 'PUBLISHED' as const, deletedAt: null }

/** Find a video id by cuid id OR slug (watch URLs accept both). */
export async function resolveVideoId(ref: string): Promise<string | null> {
  const video = await prisma.video.findFirst({
    where: { OR: [{ id: ref }, { slug: ref }] },
    select: { id: true },
  })
  return video?.id ?? null
}

export type SeriesCardData = {
  id: string
  title: string
  slug: string
  description: string | null
  coverUrl: string | null
  episodeCount: number
  totalViews: number
}

function seriesCover(image: { thumbnail: string | null; coverImage: string | null }): string | null {
  if (image.coverImage?.startsWith('https://')) return image.coverImage
  if (image.coverImage?.startsWith('tg:')) {
    const fid = image.coverImage.slice(3)
    if (fid && !/[/\\.]/.test(fid)) return `/api/media/${fid}`
  }
  return image.thumbnail ?? null
}

export const seriesSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  thumbnail: true,
  coverImage: true,
} as const

type SeriesRow = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail: string | null
  coverImage: string | null
  episodes: { video: { views: bigint; thumbnailUrl: string | null; status: string } }[]
}

/** Published episodes only — never leaks drafts/pending/rejected. */
export function toSeriesCardData(s: SeriesRow): SeriesCardData {
  const published = s.episodes.filter((e) => e.video.status === 'PUBLISHED')
  const cover =
    seriesCover({ thumbnail: s.thumbnail, coverImage: s.coverImage }) ??
    published[0]?.video.thumbnailUrl ??
    null
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description,
    coverUrl: cover,
    episodeCount: published.length,
    totalViews: published.reduce((sum, e) => sum + Number(e.video.views), 0),
  }
}

export type EpisodeRow = {
  episodeNumber: number
  title: string
  description: string | null
  video: {
    id: string
    slug: string | null
    title: string
    thumbnailUrl: string | null
    duration: number | null
    views: bigint
    publishedAt: Date | null
  }
}

export function episodeWatchUrl(videoSlug: string | null, videoId: string): string {
  return `/watch/${videoSlug ?? videoId}`
}
