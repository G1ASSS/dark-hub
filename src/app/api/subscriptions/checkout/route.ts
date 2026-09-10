import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { getPaymentProvider } from '@/lib/payments'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

const bodySchema = z.object({ planSlug: z.string().min(1) })

/** Start checkout for a paid plan. Free plans need no payment. */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return Response.json({ error: 'Sign in to subscribe.' }, { status: 401 })

  const rl = await checkRateLimit(`checkout:${session.userId}`, 5, 3600)
  if (!rl.allowed) return rateLimitedResponse(rl)

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'planSlug is required.' }, { status: 400 })

  const plan = await prisma.plan.findUnique({ where: { slug: parsed.data.planSlug } })
  if (!plan || !plan.isActive) return Response.json({ error: 'Plan not found.' }, { status: 404 })
  if (plan.priceCents <= 0) {
    return Response.json({ error: 'This plan is free — no checkout needed.' }, { status: 400 })
  }

  const result = await getPaymentProvider().createCheckout({
    userId: session.userId,
    planSlug: plan.slug,
    amountCents: plan.priceCents,
    currency: plan.currency,
  })

  return Response.json(result, { status: 201 })
}
