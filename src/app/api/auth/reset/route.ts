import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128).regex(/[A-Z]/, 'Must contain an uppercase letter').regex(/[0-9]/, 'Must contain a number'),
})

/** Consume a reset token and set a new password. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password must be 8+ chars with an uppercase letter and a number.' }, { status: 400 })
  }

  const rl = await checkRateLimit(`reset:${parsed.data.token.slice(0, 12)}`, 5, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const user = await prisma.user.findFirst({
    where: { resetToken: parsed.data.token, resetTokenExpiry: { gt: new Date() } },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'This link is invalid or expired — request a new one.' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      resetToken: null,
      resetTokenExpiry: null,
    },
  })
  await prisma.auditLog.create({
    data: { actorId: user.id, action: 'PASSWORD_RESET', targetType: 'USER', targetId: user.id },
  })
  return NextResponse.json({ ok: true })
}
