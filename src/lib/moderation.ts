import 'server-only'
import { prisma } from '@/lib/db/prisma'

/** Publish or reject a video awaiting review. Returns the new status. */
export async function moderateVideo(
  moderatorId: string,
  videoId: string,
  decision: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<'PUBLISHED' | 'REJECTED'> {
  const video = await prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!video) throw new Error('Video not found.')
  if (video.status !== 'PENDING_REVIEW') throw new Error(`Video is ${video.status}, not awaiting review.`)

  const approved = decision === 'APPROVE'
  await prisma.video.update({
    where: { id: videoId },
    data: approved ? { status: 'PUBLISHED', publishedAt: new Date() } : { status: 'REJECTED' },
  })
  await prisma.moderationAction.create({
    data: {
      moderatorId,
      targetType: 'VIDEO',
      targetId: videoId,
      videoId,
      action: approved ? 'APPROVE_VIDEO' : 'REJECT_VIDEO',
      reason,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: moderatorId,
      action: approved ? 'VIDEO_APPROVED' : 'VIDEO_REJECTED',
      targetType: 'VIDEO',
      targetId: videoId,
      metadata: { reason: reason ?? null },
    },
  })
  return approved ? 'PUBLISHED' : 'REJECTED'
}

/** Approve or reject a creator application. */
export async function reviewCreator(
  moderatorId: string,
  creatorId: string,
  decision: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<void> {
  const creator = await prisma.creator.findUnique({ where: { id: creatorId }, select: { id: true } })
  if (!creator) throw new Error('Creator not found.')
  const approved = decision === 'APPROVE'
  await prisma.creator.update({
    where: { id: creatorId },
    data: {
      verificationStatus: approved ? 'APPROVED' : 'REJECTED',
      isVerified: approved,
    },
  })
  await prisma.moderationAction.create({
    data: {
      moderatorId,
      targetType: 'CREATOR',
      targetId: creatorId,
      action: approved ? 'APPROVE_CREATOR' : 'REJECT_CREATOR',
      reason,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: moderatorId,
      action: approved ? 'CREATOR_APPROVED' : 'CREATOR_REJECTED',
      targetType: 'CREATOR',
      targetId: creatorId,
      metadata: { reason: reason ?? null },
    },
  })
}

/** Resolve or dismiss a user report. */
export async function resolveReport(
  moderatorId: string,
  reportId: string,
  decision: 'RESOLVE' | 'DISMISS'
): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, status: true } })
  if (!report) throw new Error('Report not found.')
  if (report.status !== 'PENDING' && report.status !== 'UNDER_REVIEW') {
    throw new Error(`Report is already ${report.status}.`)
  }
  const resolved = decision === 'RESOLVE'
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: resolved ? 'RESOLVED' : 'DISMISSED',
      resolvedBy: moderatorId,
      resolvedAt: new Date(),
    },
  })
  await prisma.moderationAction.create({
    data: {
      moderatorId,
      targetType: 'REPORT',
      targetId: reportId,
      action: resolved ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: moderatorId,
      action: resolved ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'REPORT',
      targetId: reportId,
    },
  })
}

/** Ban or unban a user account. */
export async function setUserBanned(
  moderatorId: string,
  userId: string,
  banned: boolean,
  reason?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!user) throw new Error('User not found.')
  if (user.role === 'ADMIN') throw new Error('Admin accounts cannot be banned.')
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: banned, banReason: banned ? (reason ?? 'Banned by moderation') : null },
  })
  await prisma.moderationAction.create({
    data: {
      moderatorId,
      targetType: 'USER',
      targetId: userId,
      action: banned ? 'BAN_USER' : 'WARN_USER',
      reason,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: moderatorId,
      action: banned ? 'USER_BANNED' : 'USER_UNBANNED',
      targetType: 'USER',
      targetId: userId,
      metadata: { reason: reason ?? null },
    },
  })
}
