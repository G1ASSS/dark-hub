/**
 * Full pipeline proof: synthetic video → processVideo() → Telegram origin →
 * DB metadata → verified → everything cleaned up (DB rows + channel messages).
 *
 *   npm run verify:pipeline
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prisma } from '../src/lib/db/prisma'
import { processVideo } from '../src/lib/upload/pipeline'
import { getStorageProvider } from '../src/lib/storage'

let failures = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failures += 1
}

const tag = Date.now().toString(36)
const work = mkdtempSync(join(tmpdir(), 'darkhubb-pipe-'))
const src = join(work, 'src.mp4')
execSync(
  `"${process.env.FFMPEG_PATH ?? 'ffmpeg'}" -y -v error -f lavfi -i testsrc=duration=12:size=1280x720:rate=30 ` +
    `-f lavfi -i sine=frequency=440:duration=12 -c:v libx264 -preset ultrafast -c:a aac -shortest "${src}"`
)

const user = await prisma.user.create({
  data: {
    email: `pipe_${tag}@darkhubb.test`,
    username: `pipe_${tag}`,
    passwordHash: 'x',
    creator: {
      create: {
        displayName: 'Pipe Test',
        slug: `pipe-${tag}`,
        verificationStatus: 'APPROVED',
        isVerified: true,
      },
    },
  },
  select: { id: true, creator: { select: { id: true } } },
})
const video = await prisma.video.create({
  data: { creatorId: user.creator!.id, title: 'Pipeline proof', status: 'PROCESSING' },
  select: { id: true },
})
await prisma.videoAsset.create({
  data: {
    id: `tmp-${video.id}`,
    videoId: video.id,
    type: 'ORIGINAL',
    storageKey: src,
    size: BigInt(1024),
    mimeType: 'video/mp4',
    checksum: 'synthetic',
    fileSize: 1024,
    storageStatus: 'UPLOADING',
  },
})

const result = await processVideo(video.id)
check(`pipeline returns 3 renditions (got ${result.renditions.join(',')})`, result.renditions.join(',') === '360p,480p,720p')
check(`pipeline reports segments (got ${result.segments})`, result.segments >= 3)

const [dbVideo, qualities, mp4s, segs] = await Promise.all([
  prisma.video.findUnique({ where: { id: video.id }, select: { status: true, duration: true } }),
  prisma.videoQuality.findMany({ where: { videoId: video.id }, select: { resolution: true } }),
  prisma.videoAsset.findMany({
    where: { videoId: video.id, type: 'MP4', storageStatus: 'STORED' },
    select: { quality: true, telegramFileId: true, telegramChatId: true, telegramMessageId: true },
  }),
  prisma.videoAsset.count({ where: { videoId: video.id, type: 'HLS_SEGMENT', storageStatus: 'STORED' } }),
])
check('video is PENDING_REVIEW with duration', dbVideo?.status === 'PENDING_REVIEW' && (dbVideo?.duration ?? 0) >= 11)
check('3 quality rows recorded', qualities.length === 3)
check('3 MP4 assets stored with Telegram file ids', mp4s.length === 3 && mp4s.every((a) => !!a.telegramFileId))
check(`segment assets stored (got ${segs})`, segs >= 3)

// Streaming check: first segment re-streams through the provider
const firstSeg = await prisma.videoAsset.findFirst({
  where: { videoId: video.id, type: 'HLS_SEGMENT', segmentIndex: 0 },
  select: { telegramFileId: true, quality: true },
})
if (firstSeg?.telegramFileId) {
  const stream = await getStorageProvider().downloadStream(firstSeg.telegramFileId)
  check('origin segment re-streams (HTTP 200)', stream.status === 200)
  await stream.body?.cancel().catch(() => {})
}

// ── cleanup: channel messages + DB rows + temp ──
const storage = getStorageProvider()
const allAssets = await prisma.videoAsset.findMany({
  where: { videoId: video.id, telegramMessageId: { not: null } },
  select: { telegramChatId: true, telegramMessageId: true },
})
for (const a of allAssets) {
  try {
    await storage.deleteMessage(a.telegramChatId!, a.telegramMessageId!)
  } catch { /* best effort */ }
}
await prisma.video.delete({ where: { id: video.id } })
await prisma.user.delete({ where: { id: user.id } })
rmSync(work, { recursive: true, force: true })
const remaining = await prisma.videoAsset.count({ where: { videoId: video.id } })
check('cleanup removed all test assets', remaining === 0)
await prisma.$disconnect()

console.log(failures === 0 ? '\nPIPELINE PROOF COMPLETE' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
