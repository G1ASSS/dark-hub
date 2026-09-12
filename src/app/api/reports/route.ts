import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

const reportSchema = z.object({
  targetType: z.enum(['VIDEO', 'USER', 'COMMENT']),
  targetId: z.string().min(1),
  reason: z.enum([
    'ILLEGAL_CONTENT', 'NON_CONSENSUAL', 'COPYRIGHT_INFRINGEMENT',
    'HARASSMENT', 'ABUSE', 'UNDERAGE_CONTENT', 'SPAM', 'OTHER'
  ]),
  details: z.string().max(2000).optional(),
})

/** File a moderation report — persisted + audit-logged for the queue. */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in to report.' }, { status: 401 })

  try {
    const data = reportSchema.safeParse(await req.json().catch(() => ({})))
    if (!data.success) {
      return NextResponse.json({ error: 'Invalid report data', details: data.error.flatten() }, { status: 400 })
    }

    // Link the report to the video row when the target is one.
    const videoId = data.data.targetType === 'VIDEO' ? data.data.targetId : undefined
    if (videoId) {
      const exists = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } })
      if (!exists) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.userId,
        targetType: data.data.targetType,
        targetId: data.data.targetId,
        videoId,
        reason: data.data.reason,
        details: data.data.details,
      },
      select: { id: true },
    })
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'REPORT_FILED',
        targetType: data.data.targetType,
        targetId: data.data.targetId,
        metadata: { reason: data.data.reason, reportId: report.id },
      },
    })
    return NextResponse.json({ success: true, message: 'Report submitted. Our team will review within 24 hours.' })
  } catch (err) {
    console.error('[api/reports]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
