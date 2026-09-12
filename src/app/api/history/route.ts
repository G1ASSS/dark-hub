import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

/** Recently watched videos, newest first. */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const rows = await prisma.watchHistory.findMany({
    where: { userId: session.userId, video: { status: 'PUBLISHED', deletedAt: null } },
    orderBy: { watchedAt: 'desc' },
    take: 48,
    select: { watchedAt: true, video: { select: catalogSelect } },
  })
  return NextResponse.json({
    data: rows.map((r) => ({ ...toVideoCardData(r.video), watchedAt: r.watchedAt.toISOString() })),
  })
}

/** Clear all watch history. */
export async function DELETE() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  await prisma.watchHistory.deleteMany({ where: { userId: session.userId } })
  await prisma.watchProgress.deleteMany({ where: { userId: session.userId } })
  return NextResponse.json({ ok: true })
}
