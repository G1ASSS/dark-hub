import 'server-only'
import { prisma } from '@/lib/db/prisma'

export type InitVideoInput = {
  title: string
  description?: string
  categorySlugs?: string[]
  tags?: string[]
  seriesSlug?: string
  episodeNumber?: number
  episodeTitle?: string
}

/**
 * Shared video reservation for all upload transports (single-shot /file,
 * chunked /chunk, direct-to-staging /r2/init, scripts/upload-local).
 * Creates the creator identity if needed, the UPLOADING video row, optional
 * series-episode link, categories and tags. Throws {status, message} errors
 * that route handlers translate to HTTP responses.
 */
export async function createUploadVideo(
  userId: string,
  data: InitVideoInput
): Promise<{ videoId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, username: true, creator: { select: { id: true } } },
  })
  if (!user) {
    throw { status: 401, message: 'Account not found.' }
  }

  // Uploaders need a creator identity (owner-only gate happens before this:
  // ADMINs get an auto-approved profile).
  let creatorId = user.creator?.id
  if (!creatorId) {
    if (['ADMIN', 'MODERATOR'].includes(user.role)) {
      const profile = await prisma.profile.findUnique({ where: { userId } })
      const creator = await prisma.creator.create({
        data: {
          userId,
          displayName: profile?.displayName ?? 'Staff uploads',
          slug: `staff-${userId.slice(0, 8).toLowerCase()}`,
          verificationStatus: 'APPROVED',
          isVerified: true,
        },
      })
      creatorId = creator.id
    } else {
      const profile = await prisma.profile.findUnique({ where: { userId } })
      const slug = `${user.username ?? userId.slice(0, 8).toLowerCase()}`
      const creator = await prisma.creator.create({
        data: {
          userId,
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
      title: data.title,
      description: data.description,
      status: 'UPLOADING',
    },
    select: { id: true },
  })

  // Optional series-episode link (visible only once the video publishes).
  if (data.seriesSlug) {
    const series = await prisma.series.findUnique({
      where: { slug: data.seriesSlug },
      select: { id: true },
    })
    if (!series) {
      await prisma.video.delete({ where: { id: video.id } })
      throw { status: 404, message: 'Series not found.' }
    }
    const episodeNumber = data.episodeNumber ?? 1
    const taken = await prisma.episode.findUnique({
      where: { seriesId_episodeNumber: { seriesId: series.id, episodeNumber } },
      select: { id: true },
    })
    if (taken) {
      await prisma.video.delete({ where: { id: video.id } })
      throw { status: 409, message: `Episode ${episodeNumber} already exists in this series.` }
    }
    await prisma.episode.create({
      data: {
        seriesId: series.id,
        videoId: video.id,
        episodeNumber,
        title: data.episodeTitle?.trim() || `Episode ${String(episodeNumber).padStart(2, '0')}`,
      },
    })
  }

  // Link categories that exist; upsert tags (slugified) and link them.
  const categorySlugs = data.categorySlugs ?? []
  const tags = data.tags ?? []
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
    data: { actorId: userId, action: 'VIDEO_UPLOAD_INIT', targetType: 'VIDEO', targetId: video.id },
  })

  return { videoId: video.id }
}
