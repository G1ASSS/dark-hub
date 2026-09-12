import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/** Public platform stats for the landing page (aggregates only). */
export async function GET() {
  try {
    const [videos, creators, views] = await Promise.all([
      prisma.video.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.creator.count({ where: { isVerified: true } }),
      prisma.video.aggregate({ _sum: { views: true }, where: { status: 'PUBLISHED' } }),
    ])
    return NextResponse.json({
      videos,
      creators,
      views: Number(views._sum.views ?? BigInt(0)),
    })
  } catch (err) {
    console.error('[api/stats]', (err as Error).message)
    return NextResponse.json({ videos: 0, creators: 0, views: 0 })
  }
}
