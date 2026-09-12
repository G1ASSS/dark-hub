import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifySession, getUser } from '@/lib/auth/dal'
import { getUserPlan } from '@/lib/subscriptions/access'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const session = await verifySession()
  if (!session) redirect('/login')
  const [user, plan] = await Promise.all([getUser(), getUserPlan(session.userId)])
  if (!user) redirect('/login')

  const [favCount, histCount, dlCount] = await Promise.all([
    prisma.favorite.count({ where: { userId: session.userId } }),
    prisma.watchHistory.count({ where: { userId: session.userId } }),
    prisma.download.count({ where: { userId: session.userId } }),
  ])
  const twoFactorEnabled =
    (await prisma.user.findUnique({ where: { id: session.userId }, select: { twoFactorEnabled: true } }))
      ?.twoFactorEnabled ?? false

  return (
    <DashboardClient
      initial={{
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName ?? user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
        bio: user.profile?.bio ?? '',
        website: user.profile?.website ?? '',
        location: user.profile?.location ?? '',
        planSlug: plan.planSlug,
        planName: plan.planName,
        twoFactorEnabled,
        counts: { favorites: favCount, history: histCount, downloads: dlCount },
      }}
    />
  )
}
