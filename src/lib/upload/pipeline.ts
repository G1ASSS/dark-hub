import 'server-only'
import { createHash } from 'node:crypto'
import { createReadStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prisma } from '@/lib/db/prisma'
import { getStorageProvider } from '@/lib/storage'
import { getScanner } from './scan'
import { warmVideoCache } from '@/lib/cache/origin'
import { probe, ladderForSource, transcodeMp4, segmentHls, probeDuration, extractThumbnail } from './ffmpeg'

export type ProcessResult = {
  videoId: string
  renditions: string[]
  segments: number
  duration: number
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function listSegments(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir)
  return entries.filter((e) => e.startsWith('seg-') && e.endsWith('.ts')).sort()
}

/**
 * Full origin pipeline for one video:
 * validate → scan → ladder transcode → Telegram upload → HLS segment
 * upload → metadata → PENDING_REVIEW. On failure the video returns to
 * UPLOADING (retryable) with a VIDEO_PROCESS_FAILED audit entry.
 */
export async function processVideo(videoId: string): Promise<ProcessResult> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { assets: { where: { type: 'ORIGINAL' } } },
  })
  if (!video) throw new Error('Video not found')
  const original = video.assets[0]
  if (!original) throw new Error('No ORIGINAL upload asset for this video')

  // Note: || (not ??) — an empty env var must fall back to the OS temp dir.
  const workRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
  const workDir = join(workRoot, videoId)
  await fs.mkdir(workDir, { recursive: true })

  const fail = async (message: string): Promise<never> => {
    await prisma.video.update({ where: { id: videoId }, data: { status: 'UPLOADING' } })
    await prisma.auditLog.create({
      data: { action: 'VIDEO_PROCESS_FAILED', targetType: 'VIDEO', targetId: videoId, metadata: { message } },
    })
    await fs.rm(workDir, { recursive: true, force: true })
    throw new Error(message)
  }

  try {
    await fs.access(original.storageKey).catch(() => fail('Uploaded temp file is missing — re-upload required'))
    const source = await probe(original.storageKey)
    if (source.duration <= 0) await fail('Could not read video duration — file may be corrupt')

    const scan = await getScanner().scan(original.storageKey)
    if (!scan.clean) await fail(`Upload rejected by malware scan: ${scan.detail ?? 'threat detected'}`)

    const storage = getStorageProvider()
    const rungs = ladderForSource(source.height || 1080)
    const highest = rungs[rungs.length - 1]
    let segmentCount = 0
    let thumbnailUrl: string | null = null

    for (const rung of rungs) {
      const mp4Path = join(workDir, `${rung.label}.mp4`)
      await transcodeMp4(original.storageKey, mp4Path, rung)
      const [mp4Stat, mp4Checksum] = await Promise.all([
        fs.stat(mp4Path),
        sha256File(mp4Path),
      ])
      const mp4 = await storage.uploadFile({
        filePath: mp4Path,
        fileName: `${videoId}-${rung.label}.mp4`,
        mimeType: 'video/mp4',
        caption: `${video.title} [${rung.label}]`,
        asVideo: true,
      })
      await prisma.videoAsset.create({
        data: {
          videoId,
          type: 'MP4',
          storageKey: `${videoId}/${rung.label}.mp4`,
          size: BigInt(mp4Stat.size),
          mimeType: 'video/mp4',
          telegramChatId: mp4.chatId,
          telegramMessageId: mp4.messageId,
          telegramFileId: mp4.fileId,
          fileSize: mp4.fileSize,
          duration: Math.round(source.duration),
          resolution: `${rung.width}x${rung.height}`,
          quality: rung.label,
          checksum: mp4Checksum,
          storageStatus: 'STORED',
        },
      })
      await prisma.videoQuality.upsert({
        where: { videoId_resolution: { videoId, resolution: rung.label } },
        update: { width: rung.width, height: rung.height, bitrate: rung.bitrate, playlistKey: `${videoId}/${rung.label}/index.m3u8` },
        create: { videoId, resolution: rung.label, width: rung.width, height: rung.height, bitrate: rung.bitrate, playlistKey: `${videoId}/${rung.label}/index.m3u8` },
      })

      const hlsDir = join(workDir, `hls-${rung.label}`)
      await fs.mkdir(hlsDir, { recursive: true })
      await segmentHls(mp4Path, hlsDir)
      const segs = await listSegments(hlsDir)
      if (segs.length === 0) await fail(`HLS segmentation produced no segments for ${rung.label}`)
      let segIndex = 0
      for (const seg of segs) {
        const segPath = join(hlsDir, seg)
        const [segStat, segDuration] = await Promise.all([
          fs.stat(segPath),
          probeDuration(segPath).catch(() => 6),
        ])
        const uploaded = await storage.uploadFile({
          filePath: segPath,
          fileName: `${videoId}-${rung.label}-${seg}`,
          mimeType: 'video/MP2T',
          asVideo: false,
        })
        await prisma.videoAsset.create({
          data: {
            videoId,
            type: 'HLS_SEGMENT',
            storageKey: `${videoId}/${rung.label}/${seg}`,
            size: BigInt(segStat.size),
            mimeType: 'video/MP2T',
            telegramChatId: uploaded.chatId,
            telegramMessageId: uploaded.messageId,
            telegramFileId: uploaded.fileId,
            fileSize: uploaded.fileSize,
            duration: segDuration,
            quality: rung.label,
            segmentIndex: segIndex,
            storageStatus: 'STORED',
          },
        })
        segIndex += 1
      }
      segmentCount += segs.length
      // Keep the highest rendition until the poster frame is grabbed below.
      if (rung.label !== highest.label) {
        await fs.rm(mp4Path, { force: true })
      }
      await fs.rm(hlsDir, { recursive: true, force: true })
    }

    // Poster thumbnail from the highest rendition (best effort — never fails the job).
    try {
      const highestMp4 = join(workDir, `${highest.label}.mp4`)
      const thumbPath = join(workDir, 'thumb.jpg')
      await extractThumbnail(highestMp4, thumbPath, Math.min(2, Math.max(0, source.duration / 3)))
      const thumbStat = await fs.stat(thumbPath)
      const thumb = await storage.uploadFile({
        filePath: thumbPath,
        fileName: `${videoId}-thumb.jpg`,
        mimeType: 'image/jpeg',
        asVideo: false,
      })
      await prisma.videoAsset.create({
        data: {
          videoId,
          type: 'THUMBNAIL',
          storageKey: `${videoId}/thumb.jpg`,
          size: BigInt(thumbStat.size),
          mimeType: 'image/jpeg',
          telegramChatId: thumb.chatId,
          telegramMessageId: thumb.messageId,
          telegramFileId: thumb.fileId,
          fileSize: thumb.fileSize,
          quality: 'thumb',
          storageStatus: 'STORED',
        },
      })
      thumbnailUrl = `/api/stream/${videoId}/thumbnail`
    } catch (err) {
      console.warn('[pipeline] thumbnail skipped:', (err as Error).message)
    } finally {
      await fs.rm(join(workDir, `${highest.label}.mp4`), { force: true })
    }

    await prisma.videoAsset.update({
      where: { id: original.id },
      data: { storageStatus: 'DELETED' },
    })
    await prisma.video.update({
      where: { id: videoId },
      data: {
        duration: Math.round(source.duration),
        status: 'PENDING_REVIEW',
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      },
    })
    await prisma.auditLog.create({
      data: {
        action: 'VIDEO_PROCESSED',
        targetType: 'VIDEO',
        targetId: videoId,
        metadata: { renditions: rungs.map((r) => r.label), segments: segmentCount },
      },
    })

    // Pre-warm the origin cache so first playback is instant even when the
    // Telegram file servers are slow. Best-effort: never fails the job.
    try {
      await warmVideoCache(videoId)
    } catch (err) {
      console.warn('[pipeline] cache pre-warm skipped:', (err as Error).message)
    }
    await fs.rm(workDir, { recursive: true, force: true })

    return {
      videoId,
      renditions: rungs.map((r) => r.label),
      segments: segmentCount,
      duration: Math.round(source.duration),
    }
  } catch (err) {
    if ((err as Error).message.startsWith('Uploaded temp file') || (err as Error).message.startsWith('Upload rejected') || (err as Error).message.startsWith('Could not read') || (err as Error).message.startsWith('HLS segmentation')) {
      throw err
    }
    await fail((err as Error).message)
    throw err // unreachable (fail always throws) — satisfies control flow
  }
}
