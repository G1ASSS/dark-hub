import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

/** Download everything the platform stores about you (JSON). */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const [user, favorites, history, downloads, subscriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        username: true,
        role: true,
        createdAt: true,
        profile: true,
        creator: { select: { displayName: true, slug: true, verificationStatus: true } },
      },
    }),
    prisma.favorite.findMany({
      where: { userId: session.userId },
      select: { videoId: true, createdAt: true },
    }),
    prisma.watchHistory.findMany({
      where: { userId: session.userId },
      select: { videoId: true, watchedAt: true },
    }),
    prisma.download.findMany({
      where: { userId: session.userId },
      select: { videoId: true, quality: true, createdAt: true },
    }),
    prisma.subscription.findMany({
      where: { userId: session.userId },
      select: { status: true, provider: true, currentPeriodStart: true, currentPeriodEnd: true, plan: { select: { slug: true, name: true } } },
    }),
  ])

  return NextResponse.json(
    { exportedAt: new Date().toISOString(), user, favorites, history, downloads, subscriptions },
    {
      headers: { 'content-disposition': 'attachment; filename="darkhubb-data-export.json"' },
    }
  )
}
