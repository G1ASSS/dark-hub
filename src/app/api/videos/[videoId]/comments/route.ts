import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { resolveVideoId } from '@/lib/series'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

type Ctx = { params: Promise<Record<string, string>> }

async function getVideoOr404(ref: string) {
  const videoId = await resolveVideoId(ref)
  if (!videoId) return null
  return prisma.video.findFirst({
    where: { id: videoId, status: 'PUBLISHED', deletedAt: null, isCommentable: true },
    select: { id: true },
  })
}

/** Top-level comments with authors (usernames anonymized client-side). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { videoId } = await ctx.params
  const video = await getVideoOr404(videoId)
  if (!video) return NextResponse.json({ error: 'Comments unavailable.' }, { status: 404 })

  const rows = await prisma.comment.findMany({
    where: { videoId, parentId: null, isHidden: false, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { username: true, profile: { select: { displayName: true } } } },
    },
  })
  return NextResponse.json({
    data: rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: { username: c.user.username, displayName: c.user.profile?.displayName ?? c.user.username },
    })),
  })
}

const postSchema = z.object({ body: z.string().trim().min(1).max(1000) })

/** Post a comment (signed in, rate-limited). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 })

  const rl = await checkRateLimit(`comment:${session.userId}`, 10, 600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const { videoId } = await ctx.params
  const video = await getVideoOr404(videoId)
  if (!video) return NextResponse.json({ error: 'Comments unavailable.' }, { status: 404 })

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Comment must be 1–1000 characters.' }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: { userId: session.userId, videoId, body: parsed.data.body },
    select: { id: true, body: true, createdAt: true },
  })
  return NextResponse.json(
    { id: comment.id, body: comment.body, createdAt: comment.createdAt.toISOString() },
    { status: 201 }
  )
}
