import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUploader, uploaderErrorStatus } from '@/lib/auth/upload-access'
import { createUploadVideo } from '@/lib/upload/init-video'
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
 * (or chunks to /api/upload/chunk) and finishes with /api/upload/complete.
 */
export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireUploader()
  } catch (err) {
    const { status, message } = uploaderErrorStatus(err)
    return Response.json({ error: message }, { status })
  }

  const rl = await checkRateLimit(`upload-init:${session.userId}`, 10, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'Title (3–100 chars) is required.' }, { status: 400 })
  }

  try {
    const { videoId } = await createUploadVideo(session.userId, parsed.data)
    return Response.json({ videoId }, { status: 201 })
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status) return Response.json({ error: e.message ?? 'Could not start upload' }, { status: e.status })
    throw err
  }
}
