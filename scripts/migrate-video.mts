/**
 * Copy one video (creator, metadata, assets, qualities, tags) from the
 * local dev database to the current DATABASE_URL (Supabase).
 * Telegram file_ids are storage-level and stay valid — only the
 * metadata rows move. Ids are preserved, so the warmed segment cache
 * keeps working.
 *
 *   npx tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/migrate-video.mts <videoId>
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { prisma } from '../src/lib/db/prisma'

const [videoId] = process.argv.slice(2)
if (!videoId) {
  console.error('Usage: migrate-video.mts <videoId>')
  process.exit(1)
}

const LOCAL_URL = 'postgresql://darkhubb:darkhubb_dev_password@localhost:5432/darkhubb'
const src = new PrismaClient({ adapter: new PrismaPg({ connectionString: LOCAL_URL }) })

const existing = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } })
if (existing) {
  console.log('Video already exists in target DB, nothing to do.')
  await src.$disconnect()
  await prisma.$disconnect()
  process.exit(0)
}

const v = await src.video.findUnique({
  where: { id: videoId },
  include: {
    creator: true,
    qualities: true,
    assets: true,
    categories: { include: { category: true } },
    tags: { include: { tag: true } },
  },
})
if (!v) throw new Error('Video not found in local DB')

const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
if (!admin) throw new Error('No admin user in target DB')

// Creator (owned by target admin; reuse if a previous run left it behind)
const { id: _cid, userId: _uid, socialLinks: _sl, ...creatorData } = v.creator
const existingCreator = await prisma.creator.findUnique({ where: { id: v.creator.id }, select: { id: true } })
const creatorId = existingCreator
  ? existingCreator.id
  : (
      await prisma.creator.create({
        data: {
          id: v.creator.id,
          userId: admin.id,
          ...creatorData,
          socialLinks: v.creator.socialLinks ?? undefined,
        },
      })
    ).id

// Video row (strip loaded relations — only scalar fields are insertable)
const { creatorId: _c, creator: _cr, qualities: _q, assets: _a, categories: _vc, tags: _vt, ...videoData } = v
await prisma.video.create({
  data: {
    ...videoData,
    creatorId,
    views: BigInt(v.views.toString()),
  },
})

// Qualities + assets (same ids → cache keys stay valid)
for (const q of v.qualities) {
  const { id: _q, ...qd } = q
  await prisma.videoQuality.create({ data: { ...qd, id: q.id } })
}
for (const a of v.assets) {
  const { id: _a, ...ad } = a
  await prisma.videoAsset.create({
    data: { ...ad, id: a.id, size: a.size ? BigInt(a.size.toString()) : null, fileSize: a.fileSize },
  })
}

// Categories remapped by slug; tags upserted by slug
for (const vc of v.categories) {
  const target = await prisma.category.findUnique({ where: { slug: vc.category.slug }, select: { id: true } })
  if (target) {
    await prisma.videoCategory.create({ data: { videoId, categoryId: target.id } })
  }
}
for (const vt of v.tags) {
  const tag = await prisma.tag.upsert({
    where: { slug: vt.tag.slug },
    update: {},
    create: { name: vt.tag.name, slug: vt.tag.slug },
    select: { id: true },
  })
  await prisma.videoTag.create({ data: { videoId, tagId: tag.id } })
}

await src.$disconnect()
await prisma.$disconnect()
console.log(`Migrated "${v.title}" (${videoId}): ${v.qualities.length} qualities, ${v.assets.length} assets, status ${v.status}`)
