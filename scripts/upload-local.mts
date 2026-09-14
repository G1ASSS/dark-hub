/**
 * Owner-only local upload for large files (500MB–5GB).
 *
 * Why this exists: hosted serverless deployments (e.g. Vercel) cap request
 * bodies (~4.5MB), /tmp disk (~512MB) and function runtime, so gigabyte
 * uploads can never go through /api/upload/*. This script runs on your own
 * machine (FFmpeg + full disk, no body limit) against the SAME database
 * (Supabase .env.local) and Telegram origin — published videos stream from
 * production immediately.
 *
 *   npm run upload:local -- <file.mp4> --title "My video" [--description "..."]
 *     [--categories cat1,cat2] [--tags a,b] [--approve]
 *
 * --approve also publishes (skips the PENDING_REVIEW queue). Otherwise the
 * video lands in PENDING_REVIEW for the normal admin moderation flow.
 */
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { prisma } from '../src/lib/db/prisma'
import { processVideo } from '../src/lib/upload/pipeline'

const ALLOWED_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv'])

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const fileArg = process.argv.slice(2).find((a) => !a.startsWith('--'))
const title = arg('--title')
const approve = process.argv.includes('--approve')

if (!fileArg || !title) {
  console.error(
    'Usage: upload-local.mts <file.mp4> --title "Title" [--description "..."] [--categories a,b] [--tags x,y] [--approve]'
  )
  process.exit(1)
}
if (title.length < 3 || title.length > 100) {
  console.error('Title must be 3–100 characters.')
  process.exit(1)
}

const ext = fileArg.slice(fileArg.lastIndexOf('.')).toLowerCase()
if (!ALLOWED_EXT.has(ext)) {
  console.error(`Unsupported extension ${ext}. Allowed: ${[...ALLOWED_EXT].join(', ')}`)
  process.exit(1)
}

const stat = await fs.stat(fileArg).catch(() => null)
if (!stat?.isFile()) {
  console.error(`File not found: ${fileArg}`)
  process.exit(1)
}
const maxBytes = Number(process.env.MAX_VIDEO_SIZE_BYTES ?? 5368709120)
if (stat.size > maxBytes) {
  console.error(`File ${(stat.size / 1073741824).toFixed(2)}GB exceeds the ${(maxBytes / 1073741824).toFixed(1)}GB limit.`)
  process.exit(1)
}

// Owner = first ADMIN (same identity the upload API gates to).
const owner = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'asc' },
  select: { id: true, email: true, username: true },
})
if (!owner) throw new Error('No ADMIN user found — seed the database first.')

let creator = await prisma.creator.findUnique({ where: { userId: owner.id }, select: { id: true } })
if (!creator) {
  const profile = await prisma.profile.findUnique({ where: { userId: owner.id } })
  creator = await prisma.creator.create({
    data: {
      userId: owner.id,
      displayName: profile?.displayName ?? owner.username ?? 'Owner',
      slug: `staff-${owner.id.slice(0, 8).toLowerCase()}`,
      verificationStatus: 'APPROVED',
      isVerified: true,
    },
    select: { id: true },
  })
  console.log('Created staff creator profile for owner.')
}

const video = await prisma.video.create({
  data: {
    creatorId: creator.id,
    title,
    description: arg('--description')?.slice(0, 2000) || null,
    status: 'UPLOADING',
  },
  select: { id: true },
})

// Link categories that exist; upsert tags.
const catSlugs = (arg('--categories') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5)
if (catSlugs.length > 0) {
  const cats = await prisma.category.findMany({
    where: { slug: { in: catSlugs }, isActive: true },
    select: { id: true },
  })
  if (cats.length > 0) {
    await prisma.videoCategory.createMany({
      data: cats.map((c) => ({ videoId: video.id, categoryId: c.id })),
      skipDuplicates: true,
    })
  }
}
for (const raw of (arg('--tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10)) {
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (!slug) continue
  const tag = await prisma.tag.upsert({
    where: { slug },
    update: {},
    create: { name: raw.slice(0, 50), slug },
    select: { id: true },
  })
  await prisma.videoTag.upsert({
    where: { videoId_tagId: { videoId: video.id, tagId: tag.id } },
    update: {},
    create: { videoId: video.id, tagId: tag.id },
  })
}

// Stage the source into UPLOAD_TMP_DIR (same layout the API uses) with hash.
// Single streaming pass: hash observes chunks while they pipe to disk.
const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
await fs.mkdir(tmpRoot, { recursive: true })
const tmpPath = join(tmpRoot, `${video.id}.upload`)
const hash = createHash('sha256')
let bytes = 0
await new Promise<void>((resolve, reject) => {
  const rs = createReadStream(fileArg)
  const ws = createWriteStream(tmpPath)
  rs.on('data', (chunk: string | Buffer) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buf.length
    hash.update(buf)
  })
  rs.on('error', reject)
  ws.on('error', reject)
  ws.on('finish', resolve)
  rs.pipe(ws)
})
const checksum = hash.digest('hex')
console.log(`Staged ${(bytes / 1048576).toFixed(1)}MB -> ${tmpPath} (sha256 ${checksum.slice(0, 12)}…)`)

await prisma.videoAsset.create({
  data: {
    id: `tmp-${video.id}`,
    videoId: video.id,
    type: 'ORIGINAL',
    storageKey: tmpPath,
    size: BigInt(bytes),
    mimeType: 'video/mp4',
    checksum,
    fileSize: bytes,
    storageStatus: 'UPLOADING',
  },
})
await prisma.video.update({ where: { id: video.id }, data: { status: 'PROCESSING' } })
await prisma.auditLog.create({
  data: { actorId: owner.id, action: 'VIDEO_UPLOAD_INIT', targetType: 'VIDEO', targetId: video.id, metadata: { via: 'upload-local', file: basename(fileArg), bytes } },
})

console.log(`Processing ${video.id} (transcode -> Telegram -> HLS, takes minutes for 1GB+)…`)
const result = await processVideo(video.id)
console.log(`Done: renditions ${result.renditions.join(', ')}, ${result.segments} segments, ${result.duration}s`)

if (approve) {
  await prisma.video.update({ where: { id: video.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  await prisma.auditLog.create({
    data: { actorId: owner.id, action: 'VIDEO_APPROVED', targetType: 'VIDEO', targetId: video.id, metadata: { via: 'upload-local --approve' } },
  })
  console.log('Published (--approve).')
} else {
  console.log('Queued for review (PENDING_REVIEW) — approve in /admin/videos.')
}
await prisma.$disconnect()
