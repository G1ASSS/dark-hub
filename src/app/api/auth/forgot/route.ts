import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { isEmailConfigured, sendMail, resetEmailHtml } from '@/lib/email'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({ email: z.string().email() })

/** Request a reset link. Truthful responses: unavailable when SMTP is down. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const rl = await checkRateLimit(`forgot:${parsed.data.email}`, 3, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { sent: false, message: 'Password reset by email is not available yet — contact support.' },
      { status: 503 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  })
  // Same response either way (no account enumeration); email only if found.
  if (user) {
    const token = randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 3600000) },
    })
    const base = (process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    try {
      await sendMail(parsed.data.email, 'Reset your Dark Hubb password', resetEmailHtml(`${base}/reset-password?token=${token}`))
    } catch (err) {
      console.error('[forgot] send failed:', (err as Error).message)
      return NextResponse.json({ sent: false, message: 'Could not send the email — try again later.' }, { status: 502 })
    }
  }
  return NextResponse.json({ sent: true, message: 'If an account exists for this email, a reset link is on its way (expires in 1 hour).' })
}
