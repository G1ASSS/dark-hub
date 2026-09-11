/**
 * Demo catalog seeder: generates synthetic clips and runs them through the
 * REAL pipeline (transcode → Telegram → HLS → posters → auto-publish), so
 * the site can be reviewed with playable content. Everything is tagged in
 * /tmp/darkhubb-demo.json for one-command removal (see clear-demo.mts).
 *
 *   npx tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/seed-demo.mts
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { prisma } from '../src/lib/db/prisma'
import { processVideo } from '../src/lib/upload/pipeline'

const DEMOS = [
  { title: 'Golden Hour', duration: 52, cats: ['cinematic', 'featured'], views: 128400, likes: 4200, daysAgo: 2 },
  { title: 'Midnight Solstice', duration: 68, cats: ['art-erotic', 'indie'], views: 89300, likes: 3100, daysAgo: 5 },
  { title: 'Velvet Dreams', duration: 44, cats: ['couples', 'trending'], views: 342000, likes: 9800, daysAgo: 9 },
  { title: 'Neon Symphony', duration: 91, cats: ['bdsm', 'cinematic'], views: 56700, likes: 1800, daysAgo: 14 },
  { title: 'Crimson Tide', duration: 57, cats: ['bdsm', 'pov'], views: 215000, likes: 6400, daysAgo: 21 },
  { title: 'Silver Lining', duration: 73, cats: ['solo', 'new-creators'], views: 12900, likes: 420, daysAgo: 30 },
  { title: 'Electric Night', duration: 38, cats: ['outdoor', 'premium'], views: 76400, likes: 2100, daysAgo: 45 },
]

const admin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  select: { id: true, creator: { select: { id: true } } },
})
if (!admin?.creator) throw new Error('Admin has no creator profile — upload once via /upload first')
const creatorId = admin.creator.id

const catRows = await prisma.category.findMany({ select: { id: true, slug: true } })
const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]))

const work = mkdtempSync(join(tmpdir(), 'darkhubb-demo-'))
const ids: string[] = []

/** Supabase pooler drops long-idle connections — ping + reconnect + retry. */
async function dbReady(retries = 4): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return
    } catch {
      await prisma.$disconnect().catch(() => {})
      await prisma.$connect().catch(() => {})
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
  await prisma.$queryRaw`SELECT 1`
}

async function trashVideo(id: string): Promise<void> {
  const { getStorageProvider } = await import('../src/lib/storage/index.js')
  const storage = getStorageProvider()
  const assets = await prisma.videoAsset.findMany({
    where: { videoId: id, telegramMessageId: { not: null } },
    select: { telegramChatId: true, telegramMessageId: true },
  })
  for (const a of assets) {
    try {
      await storage.deleteMessage(a.telegramChatId!, a.telegramMessageId!)
    } catch { /* best effort */ }
  }
  await prisma.video.delete({ where: { id } }).catch(() => {})
}

try {
  for (const [i, d] of DEMOS.entries()) {
    await dbReady()
    const prior = await prisma.video.findFirst({
      where: { title: d.title },
      select: { id: true, status: true },
    })
    if (prior?.status === 'PUBLISHED') {
      console.log(`[${i + 1}/${DEMOS.length}] ${d.title} — already live, skipping`)
      ids.push(prior.id)
      continue
    }
    if (prior) {
      console.log(`[${i + 1}/${DEMOS.length}] ${d.title} — removing partial (${prior.status}) and redoing`)
      await trashVideo(prior.id)
    }
    console.log(`[${i + 1}/${DEMOS.length}] ${d.title}…`)
    const src = join(work, `demo-${i}.mp4`)
    execSync(
      `"${process.env.FFMPEG_PATH ?? 'ffmpeg'}" -y -v error ` +
        `-f lavfi -i testsrc2=size=1280x720:duration=${d.duration}:rate=30 ` +
        `-f lavfi -i sine=frequency=${440 + i * 60}:duration=${d.duration} ` +
        `-c:v libx264 -preset ultrafast -c:a aac -shortest "${src}"`
    )
    const stat = statSync(src)
    const publishedAt = new Date(Date.now() - d.daysAgo * 86400000)
    const video = await prisma.video.create({
      data: {
        creatorId,
        title: d.title,
        description: `Demo clip for layout review (${d.title}). Synthetic test footage — remove with npm run demo:clear.`,
        status: 'PROCESSING',
        publishedAt,
        views: BigInt(d.views),
        likes: d.likes,
      },
      select: { id: true },
    })
    await prisma.videoAsset.create({
      data: {
        id: `tmp-${video.id}`,
        videoId: video.id,
        type: 'ORIGINAL',
        storageKey: src,
        size: BigInt(stat.size),
        mimeType: 'video/mp4',
        checksum: 'demo',
        fileSize: stat.size,
        storageStatus: 'UPLOADING',
      },
    })
    for (const slug of d.cats) {
      const catId = catBySlug.get(slug)
      if (catId) {
        await prisma.videoCategory.create({ data: { videoId: video.id, categoryId: catId } })
      }
    }
    const result = await processVideo(video.id)
    await dbReady()
    await prisma.video.update({ where: { id: video.id }, data: { status: 'PUBLISHED', publishedAt } })
    console.log(`  → PUBLISHED (${result.renditions.join('/')}, ${result.segments} segs)`)
    ids.push(video.id)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

writeFileSync('/tmp/darkhubb-demo.json', JSON.stringify({ ids, createdAt: new Date().toISOString() }))
await prisma.$disconnect()
console.log(`\nDONE: ${ids.length} demo videos live. Remove anytime with: npm run demo:clear`)
