/**
 * Backfill URL slugs for pre-slug videos + ensure demo series exists.
 * Idempotent — skips videos that already have a slug.
 *
 *   npx tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/backfill-slugs.mts
 */
import { prisma } from '../src/lib/db/prisma'
import { videoSlugFor } from '../src/lib/slugs'

const videos = await prisma.video.findMany({
  where: { slug: null },
  select: { id: true, title: true },
})
for (const v of videos) {
  await prisma.video.update({
    where: { id: v.id },
    data: { slug: videoSlugFor(v.title, v.id) },
  })
  console.log(`slugged: "${v.title}" → ${videoSlugFor(v.title, v.id)}`)
}
console.log(`done: ${videos.length} video slugs`)
await prisma.$disconnect()
