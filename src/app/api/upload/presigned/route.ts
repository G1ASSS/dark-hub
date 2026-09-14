import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUploader, uploaderErrorStatus } from '@/lib/auth/upload-access'

const ALLOWED_TYPES = ['video/mp4','video/quicktime','video/x-msvideo','video/webm','video/mpeg']
const MAX_SIZE = parseInt(process.env.MAX_VIDEO_SIZE_BYTES ?? '5368709120', 10)
const schema = z.object({ fileName: z.string().min(1).max(255), mimeType: z.string(), fileSize: z.number().int().positive() })

export async function POST(req: NextRequest) {
  try {
    await requireUploader()
  } catch (err) {
    const { status, message } = uploaderErrorStatus(err)
    return NextResponse.json({ error: message }, { status })
  }
  try {
    const body = await req.json()
    const data = schema.safeParse(body)
    if (!data.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(data.data.mimeType)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    if (data.data.fileSize > MAX_SIZE) return NextResponse.json({ error: 'File too large' }, { status: 400 })
    return NextResponse.json({ uploadUrl: 'https://placeholder-presigned-url.example.com', key: `uploads/${Date.now()}-${data.data.fileName}`, expiresIn: 3600 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
