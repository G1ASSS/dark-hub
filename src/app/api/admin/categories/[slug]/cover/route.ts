import { NextRequest, NextResponse } from 'next/server'
import { promises as fs, createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { getStorageProvider } from '@/lib/storage'

type Ctx = { params: Promise<Record<string, string>> }

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = Number(process.env.MAX_THUMBNAIL_SIZE_BYTES ?? 10485760)

/**
 * Staff: upload a category cover photo (raw bytes, ≤10MB jpeg/png/webp).
 * Normalized to 1280px JPEG, stored in Telegram, referenced as
 * `tg:<file_id>` — only photos YOU provide ever appear as covers.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await ctx.params
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, imageUrl: true } })
  if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 })

  const mimeType = req.headers.get('content-type') ?? ''
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    return NextResponse.json({ error: 'Send raw image bytes (jpeg, png or webp).' }, { status: 415 })
  }
  if (!req.body) return NextResponse.json({ error: 'Empty body.' }, { status: 400 })

  const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
  await fs.mkdir(tmpRoot, { recursive: true })
  const rawPath = join(tmpRoot, `cover-${category.id}-${Date.now()}.bin`)
  const jpgPath = `${rawPath}.jpg`

  try {
    let bytes = 0
    await pipeline(
      Readable.fromWeb(req.body as import('node:stream/web').ReadableStream),
      async function* (source) {
        for await (const chunk of source) {
          bytes += (chunk as Buffer).length
          if (bytes > MAX_BYTES) throw new Error('Cover exceeds the 10MB limit')
          yield chunk
        }
      },
      createWriteStream(rawPath)
    )

    await sharp(rawPath).resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(jpgPath)
    const uploaded = await getStorageProvider().uploadFile({
      filePath: jpgPath,
      fileName: `category-${slug}.jpg`,
      mimeType: 'image/jpeg',
      asVideo: false,
    })
    const updated = await prisma.category.update({
      where: { slug },
      data: { imageUrl: `tg:${uploaded.fileId}` },
      select: { slug: true, imageUrl: true },
    })
    await prisma.auditLog.create({
      data: { actorId: session.userId, action: 'CATEGORY_COVER_UPDATED', targetType: 'CATEGORY', targetId: category.id },
    })
    return NextResponse.json({ ...updated, coverUrl: `/api/media/${uploaded.fileId}` })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  } finally {
    await fs.rm(rawPath, { force: true })
    await fs.rm(jpgPath, { force: true })
  }
}
