import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/db/prisma'

export type PlanLimits = {
  planSlug: string
  planName: string
  maxQuality: string
  allowDownload: boolean
  dailyDownloadLimit: number
}

const FREE_FALLBACK: PlanLimits = {
  planSlug: 'free',
  planName: 'Free',
  maxQuality: '480p',
  allowDownload: false,
  dailyDownloadLimit: 0,
}

/** Active (or trialing, unexpired) plan for a user; free defaults otherwise. */
export const getUserPlan = cache(async (userId: string): Promise<PlanLimits> => {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['TRIALING', 'ACTIVE'] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
    },
    orderBy: { updatedAt: 'desc' },
    include: { plan: true },
  })
  if (sub) {
    return {
      planSlug: sub.plan.slug,
      planName: sub.plan.name,
      maxQuality: sub.plan.maxQuality,
      allowDownload: sub.plan.allowDownload,
      dailyDownloadLimit: sub.plan.dailyDownloadLimit,
    }
  }
  const free = await prisma.plan.findUnique({ where: { slug: 'free' } })
  if (free) {
    return {
      planSlug: free.slug,
      planName: free.name,
      maxQuality: free.maxQuality,
      allowDownload: free.allowDownload,
      dailyDownloadLimit: free.dailyDownloadLimit,
    }
  }
  return FREE_FALLBACK
})

/** "720p" -> 720 for ladder comparisons. Unknown labels sort last. */
export function qualityHeight(label: string): number {
  const m = /^(\d+)\s*p$/i.exec(label.trim())
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
}

/** Renditions a plan may stream, highest first. */
export function allowedQualities<T extends { resolution: string }>(renditions: T[], plan: PlanLimits): T[] {
  const cap = qualityHeight(plan.maxQuality)
  return renditions
    .filter((r) => qualityHeight(r.resolution) <= cap)
    .sort((a, b) => qualityHeight(b.resolution) - qualityHeight(a.resolution))
}

export async function countDownloadsToday(userId: string): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return prisma.download.count({ where: { userId, createdAt: { gte: start } } })
}

export type DownloadCheck =
  | { ok: true; plan: PlanLimits }
  | { ok: false; reason: 'UPGRADE_REQUIRED' | 'QUALITY_NOT_ALLOWED' | 'DAILY_LIMIT_REACHED'; plan: PlanLimits }

export async function checkDownloadAllowed(
  userId: string,
  quality: string,
  availableQualities: string[]
): Promise<DownloadCheck> {
  const plan = await getUserPlan(userId)
  if (!plan.allowDownload) return { ok: false, reason: 'UPGRADE_REQUIRED', plan }
  if (!availableQualities.includes(quality) || qualityHeight(quality) > qualityHeight(plan.maxQuality)) {
    return { ok: false, reason: 'QUALITY_NOT_ALLOWED', plan }
  }
  if (plan.dailyDownloadLimit > 0) {
    const used = await countDownloadsToday(userId)
    if (used >= plan.dailyDownloadLimit) return { ok: false, reason: 'DAILY_LIMIT_REACHED', plan }
  }
  return { ok: true, plan }
}
