import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'

type Ctx = { params: Promise<Record<string, string>> }

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(500).nullable().optional(),
  /** https URL or `tg:<file_id>` (set via the /cover upload endpoint). */
  imageUrl: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
})

async function staff() {
  const session = await verifySession()
  if (!session) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) }
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

function validImageUrl(value: string): boolean {
  if (value.startsWith('https://')) return true
  if (value.startsWith('tg:')) {
    const id = value.slice(3)
    return !!id && !/[/\\.]/.test(id)
  }
  return false
}

/** Staff: rename / describe / re-cover / hide a category. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await staff()
  if (error) return error

  const { slug } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  if (parsed.data.imageUrl && !validImageUrl(parsed.data.imageUrl)) {
    return NextResponse.json({ error: 'imageUrl must be an https URL or tg:<file_id>.' }, { status: 400 })
  }

  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } })
  if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 })

  const updated = await prisma.category.update({
    where: { slug },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: { id: true, name: true, slug: true, imageUrl: true },
  })
  return NextResponse.json(updated)
}
