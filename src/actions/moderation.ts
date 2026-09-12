'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/dal'
import { moderateVideo, reviewCreator, resolveReport, setUserBanned } from '@/lib/moderation'

async function staffId(): Promise<string> {
  const session = await requireAdmin()
  return session.userId
}

export async function approveVideoAction(videoId: string) {
  const id = await staffId()
  const status = await moderateVideo(id, videoId, 'APPROVE').catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/videos')
  return status
}

export async function rejectVideoAction(videoId: string, reason?: string) {
  const id = await staffId()
  const status = await moderateVideo(id, videoId, 'REJECT', reason).catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/videos')
  return status
}

export async function approveCreatorAction(creatorId: string) {
  const id = await staffId()
  const res = await reviewCreator(id, creatorId, 'APPROVE')
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/creators')
  return res
}

export async function rejectCreatorAction(creatorId: string, reason?: string) {
  const id = await staffId()
  const res = await reviewCreator(id, creatorId, 'REJECT', reason)
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/creators')
  return res
}

export async function resolveReportAction(reportId: string) {
  const id = await staffId()
  const res = await resolveReport(id, reportId, 'RESOLVE')
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/reports')
  return res
}

export async function dismissReportAction(reportId: string) {
  const id = await staffId()
  const res = await resolveReport(id, reportId, 'DISMISS')
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin')
  revalidatePath('/admin/reports')
  return res
}

export async function banUserAction(userId: string) {
  const id = await staffId()
  const res = await setUserBanned(id, userId, true)
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin/users')
  return res
}

export async function unbanUserAction(userId: string) {
  const id = await staffId()
  const res = await setUserBanned(id, userId, false)
    .then(() => ({ ok: true as const }))
    .catch((e) => ({ error: (e as Error).message }))
  revalidatePath('/admin/users')
  return res
}
