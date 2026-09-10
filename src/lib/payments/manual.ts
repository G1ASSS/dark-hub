import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import type { PaymentProvider, CheckoutInput, CheckoutResult, PaymentEvent } from './types'

/**
 * Manual/offline provider: creates a PENDING transaction with a payment
 * reference the user quotes in their transfer. Funds are confirmed via
 * the webhook endpoint (secured by MANUAL_WEBHOOK_SECRET) or a future
 * admin action — both funnel into confirmTransaction().
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual'

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const providerRef = `manual-${randomUUID().slice(0, 8)}`
    const tx = await prisma.paymentTransaction.create({
      data: {
        userId: input.userId,
        provider: this.name,
        providerRef,
        amountCents: input.amountCents,
        currency: input.currency,
        status: 'PENDING',
        raw: { planSlug: input.planSlug },
      },
      select: { id: true },
    })
    return {
      transactionId: tx.id,
      providerRef,
      instructions:
        `Send ${formatMoney(input.amountCents, input.currency)} using reference "${providerRef}". ` +
        `Your premium activates automatically once the payment is confirmed.`,
    }
  }

  async verifyWebhook(req: Request): Promise<PaymentEvent> {
    const secret = process.env.MANUAL_WEBHOOK_SECRET
    if (!secret || req.headers.get('x-manual-secret') !== secret) {
      throw new Error('Invalid manual webhook secret')
    }
    const parsed = z
      .object({
        providerRef: z.string().min(1),
        status: z.enum(['succeeded', 'failed']),
        reason: z.string().max(500).optional(),
      })
      .safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) throw new Error('Invalid manual webhook body')
    if (parsed.data.status === 'succeeded') {
      return { type: 'payment.succeeded', providerRef: parsed.data.providerRef }
    }
    return { type: 'payment.failed', providerRef: parsed.data.providerRef, reason: parsed.data.reason }
  }
}

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`
}
