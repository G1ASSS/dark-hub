import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { toVideoCardData, catalogSelect } from '@/lib/videos/serialize'

type Ctx = { params: Promise<Record<string, string>> }

/** Public metadata for one published video (player fetches its own stream token). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { videoId } = await ctx.params
    const video = await prisma.video.findFirst({
      where: { id: videoId, status: 'PUBLISHED', deletedAt: null },
      select: {
        ...catalogSelect,
        description: true,
        likes: true,
        qualities: { select: { resolution: true }, orderBy: { resolution: 'asc' } },
      },
    })
    if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
    return NextResponse.json({
      ...toVideoCardData(video),
      description: video.description,
      likes: video.likes,
      qualities: video.qualities.map((q) => q.resolution),
    })
  } catch (err) {
    console.error('[api/videos/:id]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
