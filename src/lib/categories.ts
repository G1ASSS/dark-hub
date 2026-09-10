import 'server-only'
import { prisma } from '@/lib/db/prisma'

export type CategoryWithCover = {
  id: string
  name: string
  slug: string
  description: string | null
  /** Display-ready cover URL (admin cover → latest video poster → null). */
  coverUrl: string | null
  videoCount: number
}

/** Resolve a stored imageUrl (`tg:<file_id>` or https URL) to a display URL. */
export function resolveCover(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (imageUrl.startsWith('tg:')) {
    const fileId = imageUrl.slice(3)
    if (!fileId || /[/\\.]/.test(fileId)) return null
    return `/api/media/${fileId}`
  }
  if (imageUrl.startsWith('https://')) return imageUrl
  return null
}

export async function getCategories(): Promise<CategoryWithCover[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      videos: {
        where: { video: { status: 'PUBLISHED', deletedAt: null } },
        select: { video: { select: { thumbnailUrl: true } } },
        orderBy: { video: { publishedAt: 'desc' } },
        take: 1,
      },
      _count: {
        select: { videos: { where: { video: { status: 'PUBLISHED', deletedAt: null } } } },
      },
    },
  })
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    coverUrl: resolveCover(c.imageUrl) ?? c.videos[0]?.video.thumbnailUrl ?? null,
    videoCount: c._count.videos,
  }))
}
