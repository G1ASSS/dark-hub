import 'server-only'
import type { VideoCardData } from '@/types'

export type CatalogVideo = {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  views: bigint
  publishedAt: Date | null
  creator: {
    id: string
    slug: string
    displayName: string
    avatarUrl: string | null
    isVerified: boolean
  }
  categories: { category: { slug: string } }[]
}

/** Deterministic SVG placeholder so cards never render a broken image. */
function placeholderThumbnail(title: string): string {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360
  const initial = (title.trim()[0] ?? 'D').toUpperCase()
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${h},60%,26%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360},65%,14%)"/>` +
    `</linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>` +
    `<text x="320" y="205" font-family="sans-serif" font-size="120" font-weight="bold" fill="rgba(255,255,255,0.35)" text-anchor="middle">${initial}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function toVideoCardData(v: CatalogVideo): VideoCardData {
  return {
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl ?? placeholderThumbnail(v.title),
    duration: v.duration ?? 0,
    views: Number(v.views),
    publishedAt: (v.publishedAt ?? new Date()).toISOString(),
    creator: {
      id: v.creator.id,
      slug: v.creator.slug,
      displayName: v.creator.displayName,
      avatarUrl: v.creator.avatarUrl ?? '',
      isVerified: v.creator.isVerified,
    },
    categories: v.categories.map((c) => c.category.slug),
  }
}

export const catalogSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  duration: true,
  views: true,
  publishedAt: true,
  creator: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  categories: { select: { category: { select: { slug: true } } } },
} as const
