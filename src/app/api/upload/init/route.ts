import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  categorySlugs: z.array(z.string().min(1).max(60)).max(5).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  seriesSlug: z.string().min(1).max(80).optional(),
  episodeNumber: z.number().int().min(1).max(10000).optional(),
  episodeTitle: z.string().min(1).max(120).optional(),
})

/**
 * Reserve a video row (status UPLOADING) and return its id.
 * The client then streams raw bytes to /api/upload/file?videoId=…
 * and finishes with /api/upload/complete.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to upload.' }, { status: 401 })

  const rl = await checkRateLimit(`upload-init:${session.userId}`, 10, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'Title (3–100 chars) is required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, username: true, creator: { select: { id: true } } },
  })
  if (!user) return Response.json({ error: 'Account not found.' }, { status: 401 })

  // Uploaders need a creator identity.
  // Admins/MODERATORS get an auto-approved profile. Regular users
  // get a PENDING one that enters the review queue (admin approval
  // is required before their videos publish).
  let creatorId = user.creator?.id
  if (!creatorId) {
    if (['ADMIN', 'MODERATOR'].includes(user.role)) {
      const profile = await prisma.profile.findUnique({ where: { userId: session.userId } })
      const creator = await prisma.creator.create({
        data: {
          userId: session.userId,
          displayName: profile?.displayName ?? 'Staff uploads',
          slug: `staff-${session.userId.slice(0, 8).toLowerCase()}`,
          verificationStatus: 'APPROVED',
          isVerified: true,
        },
      })
      creatorId = creator.id
    } else {
      const profile = await prisma.profile.findUnique({ where: { userId: session.userId } })
      const slug = `${user.username ?? session.userId.slice(0, 8).toLowerCase()}`
      const creator = await prisma.creator.create({
        data: {
          userId: session.userId,
          displayName: profile?.displayName ?? user.username ?? 'Creator',
          slug,
          verificationStatus: 'PENDING',
          isVerified: false,
        },
      })
      creatorId = creator.id
    }
  }

  const video = await prisma.video.create({
    data: {
      creatorId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'UPLOADING',
    },
    select: { id: true },
  })

  // Optional series-episode link (visible only once the video publishes).
  if (parsed.data.seriesSlug) {
    const series = await prisma.series.findUnique({
      where: { slug: parsed.data.seriesSlug },
      select: { id: true },
    })
    if (!series) {
      await prisma.video.delete({ where: { id: video.id } })
      return Response.json({ error: 'Series not found.' }, { status: 404 })
    }
    const episodeNumber = parsed.data.episodeNumber ?? 1
    const taken = await prisma.episode.findUnique({
      where: { seriesId_episodeNumber: { seriesId: series.id, episodeNumber } },
      select: { id: true },
    })
    if (taken) {
      await prisma.video.delete({ where: { id: video.id } })
      return Response.json({ error: `Episode ${episodeNumber} already exists in this series.` }, { status: 409 })
    }
    await prisma.episode.create({
      data: {
        seriesId: series.id,
        videoId: video.id,
        episodeNumber,
        title: parsed.data.episodeTitle?.trim() || `Episode ${String(episodeNumber).padStart(2, '0')}`,
      },
    })
  }

  // Link categories that exist; upsert tags (slugified) and link them.
  const { categorySlugs = [], tags = [] } = parsed.data
  if (categorySlugs.length > 0) {
    const categories = await prisma.category.findMany({
      where: { slug: { in: categorySlugs }, isActive: true },
      select: { id: true },
    })
    if (categories.length > 0) {
      await prisma.videoCategory.createMany({
        data: categories.map((c) => ({ videoId: video.id, categoryId: c.id })),
        skipDuplicates: true,
      })
    }
  }
  for (const raw of tags) {
    const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!slug) continue
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name: raw.trim().slice(0, 50), slug },
      select: { id: true },
    })
    await prisma.videoTag.upsert({
      where: { videoId_tagId: { videoId: video.id, tagId: tag.id } },
      update: {},
      create: { videoId: video.id, tagId: tag.id },
    })
  }

  await prisma.auditLog.create({
    data: { actorId: session.userId, action: 'VIDEO_UPLOAD_INIT', targetType: 'VIDEO', targetId: video.id },
  })

  return Response.json({ videoId: video.id }, { status: 201 })
}
