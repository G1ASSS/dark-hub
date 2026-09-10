import 'server-only'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function ffmpegBin() {
  const bin = process.env.FFMPEG_PATH ?? 'ffmpeg'
  return bin
}

function ffprobeBin() {
  return process.env.FFPROBE_PATH ?? 'ffprobe'
}

async function assertBin(bin: string, label: string) {
  try {
    await execFileAsync(bin, ['-version'])
  } catch {
    throw new Error(
      `${label} not found at "${bin}". Install FFmpeg or set ${label === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH'}.`
    )
  }
}

export type ProbeInfo = { duration: number; width: number; height: number }

export async function probe(filePath: string): Promise<ProbeInfo> {
  const bin = ffprobeBin()
  await assertBin(bin, 'ffprobe')
  const { stdout } = await execFileAsync(bin, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration:format=duration',
    '-of', 'json',
    filePath,
  ])
  const data = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number; duration?: string }[]
    format?: { duration?: string }
  }
  const stream = data.streams?.[0] ?? {}
  const duration = Number(stream.duration ?? data.format?.duration ?? 0)
  return {
    duration: Number.isFinite(duration) ? duration : 0,
    width: stream.width ?? 0,
    height: stream.height ?? 0,
  }
}

export type LadderRung = { label: string; width: number; height: number; videoBitrate: string; bitrate: number }

export const LADDER: LadderRung[] = [
  { label: '360p', width: 640, height: 360, videoBitrate: '800k', bitrate: 928_000 },
  { label: '480p', width: 854, height: 480, videoBitrate: '1400k', bitrate: 1_528_000 },
  { label: '720p', width: 1280, height: 720, videoBitrate: '2800k', bitrate: 2_928_000 },
  { label: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', bitrate: 5_128_000 },
]

/** Renditions at or below the source resolution. */
export function ladderForSource(sourceHeight: number): LadderRung[] {
  const rungs = LADDER.filter((r) => r.height <= sourceHeight)
  return rungs.length > 0 ? rungs : [LADDER[0]]
}

/** Transcode one MP4 rendition, capped to rung dimensions, faststart for streaming. */
export async function transcodeMp4(input: string, output: string, rung: LadderRung): Promise<void> {
  const bin = ffmpegBin()
  await assertBin(bin, 'ffmpeg')
  await execFileAsync(bin, [
    '-y', '-i', input,
    '-map', '0:v:0', '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-maxrate', rung.videoBitrate, '-bufsize', `${Number(rung.videoBitrate.replace('k', '')) * 2}k`,
    '-vf', `scale=w=${rung.width}:h=${rung.height}:force_original_aspect_ratio=decrease`,
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    output,
  ])
}

export type HlsOutput = { playlistPath: string; segmentPattern: string; segmentDir: string }

/**
 * Segment one rendition into VOD HLS (.ts segments + variant playlist).
 * Segments are a few MB each — comfortably under the Telegram send cap.
 */
export async function segmentHls(input: string, outDir: string, segmentSeconds = 6): Promise<HlsOutput> {
  const bin = ffmpegBin()
  await assertBin(bin, 'ffmpeg')
  const playlistPath = `${outDir}/index.m3u8`
  const segmentPattern = `${outDir}/seg-%03d.ts`
  await execFileAsync(bin, [
    '-y', '-i', input,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', String(segmentSeconds),
    '-hls_playlist_type', 'vod',
    '-hls_segment_filename', segmentPattern,
    playlistPath,
  ])
  return { playlistPath, segmentPattern, segmentDir: outDir }
}

export async function probeDuration(filePath: string): Promise<number> {
  const bin = ffprobeBin()
  await assertBin(bin, 'ffprobe')
  const { stdout } = await execFileAsync(bin, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ])
  const d = Number(stdout.trim())
  return Number.isFinite(d) ? d : 0
}

/** Grab one poster frame (1280px wide JPEG) from a rendition. */
export async function extractThumbnail(input: string, output: string, seekSeconds: number): Promise<void> {
  const bin = ffmpegBin()
  await assertBin(bin, 'ffmpeg')
  await execFileAsync(bin, [
    '-y', '-v', 'error',
    '-ss', String(seekSeconds),
    '-i', input,
    '-vframes', '1',
    '-q:v', '4',
    '-vf', 'scale=1280:-2',
    output,
  ])
}
