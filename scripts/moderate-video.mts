/**
 * Staff moderation from the terminal (until the admin queue UI exists):
 *
 *   tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/moderate-video.mts <videoId> approve [reason]
 *   tsx --env-file=.env.local --import ./scripts/preload.mjs scripts/moderate-video.mts <videoId> reject [reason]
 */
import { prisma } from '../src/lib/db/prisma'

const [videoId, decision, ...reasonParts] = process.argv.slice(2)
if (!videoId || (decision !== 'approve' && decision !== 'reject')) {
  console.error('Usage: moderate-video.mts <videoId> <approve|reject> [reason]')
  process.exit(1)
}

const admin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'asc' },
  select: { id: true, email: true },
})
if (!admin) throw new Error('No admin user found')

const video = await prisma.video.findFirst({
  where: { id: videoId, deletedAt: null },
  select: { id: true, title: true, status: true },
})
if (!video) throw new Error('Video not found')
if (video.status !== 'PENDING_REVIEW') throw new Error(`Video is ${video.status}, not PENDING_REVIEW`)

const approved = decision === 'approve'
await prisma.video.update({
  where: { id: videoId },
  data: approved ? { status: 'PUBLISHED', publishedAt: new Date() } : { status: 'REJECTED' },
})
await prisma.moderationAction.create({
  data: {
    moderatorId: admin.id,
    targetType: 'VIDEO',
    targetId: videoId,
    videoId,
    action: approved ? 'APPROVE_VIDEO' : 'REJECT_VIDEO',
    reason: reasonParts.join(' ') || null,
  },
})
await prisma.auditLog.create({
  data: {
    actorId: admin.id,
    action: approved ? 'VIDEO_APPROVED' : 'VIDEO_REJECTED',
    targetType: 'VIDEO',
    targetId: videoId,
  },
})
await prisma.$disconnect()
console.log(`${approved ? 'PUBLISHED' : 'REJECTED'}: "${video.title}" (${videoId}) by ${admin.email}`)
