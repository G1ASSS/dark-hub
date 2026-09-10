/**
 * Backend self-test: exercises the real code paths against the real DB
 * (auth crypto, plans/gating, tokens, rate limiter, playlists, FFmpeg).
 * Telegram upload is tested only when real credentials are configured.
 *
 *   npm run verify:backend
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/db/prisma'
import { signPlaybackToken, verifyPlaybackToken } from '../src/lib/playback/token'
import { buildMasterPlaylist, buildVariantPlaylist } from '../src/lib/playback/manifest'
import { getUserPlan, allowedQualities, checkDownloadAllowed } from '../src/lib/subscriptions/access'
import { checkRateLimit } from '../src/lib/rate-limit'
import { encrypt, decrypt } from '../src/lib/auth/session'
import { probe, ladderForSource, transcodeMp4, segmentHls } from '../src/lib/upload/ffmpeg'
import { getScanner } from '../src/lib/upload/scan'

let failures = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failures += 1
}

const EMAIL = `verify_${Date.now()}@darkhubb.test`

// ── 1. user + password crypto (mirrors signup/login actions) ──
const passwordHash = await bcrypt.hash('Verify123!', 12)
const user = await prisma.user.create({
  data: {
    email: EMAIL,
    username: `verify_${Date.now().toString(36)}`,
    passwordHash,
    profile: { create: { displayName: 'Verify Bot' } },
    ageVerification: { create: { method: 'SELF_DECLARATION' } },
  },
  select: { id: true, username: true },
})
check('user created with profile + age verification', !!user.id)
check('bcrypt verifies correct password', await bcrypt.compare('Verify123!', passwordHash))
check('bcrypt rejects wrong password', !(await bcrypt.compare('Wrong123!', passwordHash)))

// ── 2. session cookie crypto ──
const sessionJwt = await encrypt({ userId: user.id, role: 'USER', expiresAt: new Date(Date.now() + 86400000) })
const sessionBack = await decrypt(sessionJwt)
check('session JWT round-trips userId', sessionBack?.userId === user.id)
check('tampered session JWT rejected', (await decrypt(sessionJwt + 'x')) === null)

// ── 3. plans + gating (fresh user = free) ──
const plan = await getUserPlan(user.id)
check(`new user defaults to free plan (got ${plan.planSlug})`, plan.planSlug === 'free')
check('free plan blocks downloads', !plan.allowDownload)
const quals = allowedQualities(
  [{ resolution: '1080p' }, { resolution: '480p' }, { resolution: '360p' }],
  plan
).map((q) => q.resolution)
check(`free streams capped at 480p (got ${quals.join(',')})`, quals.join(',') === '480p,360p')
const dl = await checkDownloadAllowed(user.id, '720p', ['360p', '480p', '720p'])
check('free download check returns UPGRADE_REQUIRED', !dl.ok && dl.reason === 'UPGRADE_REQUIRED')

// premium path: grant premium directly, re-check
const premiumPlan = await prisma.plan.findUnique({ where: { slug: 'premium' } })
check('premium plan seeded', !!premiumPlan)
if (premiumPlan) {
  await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: premiumPlan.id,
      status: 'ACTIVE',
      provider: 'manual',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  })
  const p2 = await getUserPlan(user.id)
  check('active subscription upgrades plan', p2.planSlug === 'premium' && p2.allowDownload)
  const dl2 = await checkDownloadAllowed(user.id, '720p', ['360p', '480p', '720p'])
  check('premium 720p download allowed', dl2.ok)
}

// ── 4. playback tokens ──
const streamTok = await signPlaybackToken({ videoId: 'vid123', userId: user.id, kind: 'stream' }, 900)
const streamBack = await verifyPlaybackToken(streamTok)
check('stream token verifies', streamBack?.videoId === 'vid123' && streamBack?.kind === 'stream')
const dlTok = await signPlaybackToken(
  { videoId: 'vid123', userId: user.id, kind: 'download', quality: '720p', wm: { u: user.username, t: Date.now() } },
  600
)
const dlBack = await verifyPlaybackToken(dlTok)
check('download token carries quality + watermark', dlBack?.quality === '720p' && !!dlBack?.wm?.u)
check('garbage token rejected', (await verifyPlaybackToken('garbage')) === null)
const expired = await signPlaybackToken({ videoId: 'v', userId: user.id, kind: 'stream' }, -10)
check('expired token rejected', (await verifyPlaybackToken(expired)) === null)

// ── 5. playlists ──
const master = buildMasterPlaylist('vid123', [{ resolution: '720p', bitrate: 2928000, width: 1280, height: 720 }], streamTok)
check('master playlist references variant URL', master.includes('/api/stream/vid123/720p/playlist.m3u8?token='))
const variant = buildVariantPlaylist('vid123', '720p', [{ index: 0, duration: 6 }, { index: 1, duration: 4.5 }], streamTok)
check('variant playlist lists segments + ENDLIST', variant.includes('seg/0?token=') && variant.includes('#EXT-X-ENDLIST'))

// ── 6. rate limiter ──
const rlKey = `verify:${Date.now()}`
const r1 = await checkRateLimit(rlKey, 2, 60)
const r2 = await checkRateLimit(rlKey, 2, 60)
const r3 = await checkRateLimit(rlKey, 2, 60)
check('rate limiter allows then blocks (2/2, then denied)', r1.allowed && r2.allowed && !r3.allowed)

// ── 7. malware scan hook ──
const scanner = getScanner()
const scan = await scanner.scan(import.meta.filename)
check(`scanner "${scanner.name}" runs`, scan.clean)

// ── 8. FFmpeg: synthesize source, transcode, segment ──
const work = mkdtempSync(join(tmpdir(), 'darkhubb-verify-'))
try {
  const src = join(work, 'src.mp4')
  execSync(
    `"${process.env.FFMPEG_PATH ?? 'ffmpeg'}" -y -v error -f lavfi -i testsrc=duration=12:size=1280x720:rate=30 ` +
    `-f lavfi -i sine=frequency=440:duration=12 -c:v libx264 -preset ultrafast -c:a aac -shortest "${src}"`
  )
  const info = await probe(src)
  check(`probe reads synthetic 720p source (${info.width}x${info.height}, ${info.duration.toFixed(0)}s)`, info.width === 1280 && info.duration >= 11)
  const rungs = ladderForSource(info.height)
  check(`ladder skips 1080p for 720p source (${rungs.map((r) => r.label).join(',')})`, rungs.map((r) => r.label).join(',') === '360p,480p,720p')
  const out360 = join(work, '360p.mp4')
  await transcodeMp4(src, out360, rungs[0])
  const out360Info = await probe(out360)
  check('360p transcode has correct height', out360Info.height === 360)
  const hlsDir = join(work, 'hls')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(hlsDir)
  await segmentHls(out360, hlsDir)
  const { readdirSync } = await import('node:fs')
  const segs = readdirSync(hlsDir).filter((f) => f.endsWith('.ts'))
  check(`HLS segmentation produced segments (got ${segs.length})`, segs.length >= 1)
} catch (err) {
  check(`FFmpeg pipeline (${(err as Error).message.slice(0, 100)})`, false)
} finally {
  rmSync(work, { recursive: true, force: true })
}

// ── 9. Telegram (real credentials only) ──
if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'PASTE_FROM_BOTFATHER') {
  console.log('SKIP  Telegram upload (no credentials — run npm run telegram:test after setup)')
} else {
  try {
    const { TelegramStorageProvider } = await import('../src/lib/storage/telegram')
    const storage = new TelegramStorageProvider()
    execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=10', '-c:v', 'libx264', '-preset', 'ultrafast', '/tmp/darkhubb-tg-probe.mp4'])
    const up = await storage.uploadFile({ filePath: '/tmp/darkhubb-tg-probe.mp4', fileName: 'probe.mp4', mimeType: 'video/mp4', asVideo: true })
    check(`Telegram upload works (message ${up.messageId})`, !!up.fileId)
    const dl = await storage.downloadStream(up.fileId)
    check('Telegram re-stream works', dl.status === 200)
    await storage.deleteMessage(up.chatId, up.messageId)
  } catch (err) {
    check(`Telegram round-trip (${(err as Error).message.slice(0, 120)})`, false)
  }
}

// ── cleanup ──
await prisma.user.delete({ where: { id: user.id } })
await prisma.$disconnect()

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
