import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { slugify } from '@/lib/utils'

/** title-slug + id suffix: readable, unique, stable. */
export function videoSlugFor(title: string, id: string): string {
  const base = slugify(title).slice(0, 60) || 'video'
  return `${base}-${id.slice(-6).toLowerCase()}`
}

export async function uniqueSeriesSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 60) || 'series'
  let slug = base
  let n = 2
  while (await prisma.series.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}
