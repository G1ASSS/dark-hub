/**
 * Generate + store a poster thumbnail for a processed video:
 *
 *   npx tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/backfill-thumbnail.mts <videoId>
 *
 * Pulls the highest MP4 rendition from Telegram, grabs a frame with FFmpeg,
 * uploads it back as a THUMBNAIL asset, and points video.thumbnailUrl at
 * the session-gated proxy route.
 */
import { createWriteStream } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { execSync } from 'node:child_process'
import { prisma } from '../src/lib/db/prisma'
import { getStorageProvider } from '../src/lib/storage'
import { qualityHeight } from '../src/lib/subscriptions/access'

const [videoId] = process.argv.slice(2)
if (!videoId) {
  console.error('Usage: backfill-thumbnail.mts <videoId>')
  process.exit(1)
}

const video = await prisma.video.findUnique({
  where: { id: videoId },
  select: { id: true, title: true, duration: true },
})
if (!video) throw new Error('Video not found')

const mp4s = await prisma.videoAsset.findMany({
  where: { videoId, type: 'MP4', storageStatus: 'STORED', telegramFileId: { not: null } },
  select: { quality: true, telegramFileId: true },
})
if (mp4s.length === 0) throw new Error('No stored MP4 rendition to grab a frame from')
mp4s.sort((a, b) => qualityHeight(b.quality ?? '') - qualityHeight(a.quality ?? ''))
const best = mp4s[0]

const work = mkdtempSync(join(tmpdir(), 'darkhubb-thumb-'))
try {
  const mp4Path = join(work, 'src.mp4')
  const thumbPath = join(work, 'thumb.jpg')
  const upstream = await getStorageProvider().downloadStream(best.telegramFileId!)
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(mp4Path)
    out.on('finish', resolve)
    out.on('error', reject)
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(out)
  })
  const seek = Math.min(2, Math.max(0, (video.duration ?? 10) / 3))
  execSync(
    `"${process.env.FFMPEG_PATH ?? 'ffmpeg'}" -y -v error -ss ${seek} -i "${mp4Path}" ` +
      `-vframes 1 -q:v 4 -vf scale=1280:-2 "${thumbPath}"`
  )
  const storage = getStorageProvider()
  const uploaded = await storage.uploadFile({
    filePath: thumbPath,
    fileName: `${videoId}-thumb.jpg`,
    mimeType: 'image/jpeg',
    asVideo: false,
  })
  await prisma.videoAsset.deleteMany({ where: { videoId, type: 'THUMBNAIL' } })
  await prisma.videoAsset.create({
    data: {
      videoId,
      type: 'THUMBNAIL',
      storageKey: `${videoId}/thumb.jpg`,
      mimeType: 'image/jpeg',
      telegramChatId: uploaded.chatId,
      telegramMessageId: uploaded.messageId,
      telegramFileId: uploaded.fileId,
      fileSize: uploaded.fileSize,
      quality: 'thumb',
      storageStatus: 'STORED',
    },
  })
  await prisma.video.update({
    where: { id: videoId },
    data: { thumbnailUrl: `/api/stream/${videoId}/thumbnail` },
  })
  console.log(`Thumbnail stored for "${video.title}" (${videoId})`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
await prisma.$disconnect()
