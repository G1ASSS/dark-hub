import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { slugify } from '@/lib/utils'

const bodySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
})

async function staff() {
  const session = await verifySession()
  if (!session) return { error: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) }
  if (!['ADMIN', 'MODERATOR'].includes(session.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

/** Staff: create a category (e.g. BDSM). Slug auto-derives from the name. */
export async function POST(req: NextRequest) {
  const { error, session } = await staff()
  if (error) return error

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Name (2–60 chars) is required.' }, { status: 400 })

  const slug = parsed.data.slug ?? slugify(parsed.data.name)
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } })
  if (existing) return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 })

  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug, description: parsed.data.description },
    select: { id: true, name: true, slug: true },
  })
  await prisma.auditLog.create({
    data: { actorId: session!.userId, action: 'CATEGORY_CREATED', targetType: 'CATEGORY', targetId: category.id },
  })
  return NextResponse.json(category, { status: 201 })
}
