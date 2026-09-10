import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reportSchema = z.object({
  targetType: z.enum(['VIDEO', 'USER', 'COMMENT']),
  targetId: z.string().cuid(),
  reason: z.enum([
    'ILLEGAL_CONTENT', 'NON_CONSENSUAL', 'COPYRIGHT_INFRINGEMENT',
    'HARASSMENT', 'ABUSE', 'UNDERAGE_CONTENT', 'SPAM', 'OTHER'
  ]),
  details: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = reportSchema.safeParse(body)
    if (!data.success) {
      return NextResponse.json({ error: 'Invalid report data', details: data.error.flatten() }, { status: 400 })
    }
    // In production: save to DB, notify moderators, add to audit log
    return NextResponse.json({ success: true, message: 'Report submitted. Our team will review within 24 hours.' })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
