import 'server-only'
import { prisma } from '@/lib/db/prisma'
import type { PaymentProvider } from './types'
import { ManualPaymentProvider } from './manual'

const providers: Record<string, () => PaymentProvider> = {
  manual: () => new ManualPaymentProvider(),
  // stripe: () => new StripePaymentProvider(),
  // NOWPayments / crypto / … plug in here.
}

export function getPaymentProvider(name?: string): PaymentProvider {
  const key = (name ?? process.env.PAYMENT_PROVIDER ?? 'manual').toLowerCase()
  const factory = providers[key]
  if (!factory) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${key}". Expected one of: ${Object.keys(providers).join(', ')}. ` +
        `Add an implementation of PaymentProvider in src/lib/payments/ to support it.`
    )
  }
  return factory()
}

/**
 * Activate (or extend) a subscription from a confirmed payment.
 * Shared by webhooks and admin manual-payment approval. Idempotent:
 * re-confirming an already confirmed transaction is a no-op.
 * Manual QR approvals keep status APPROVED; provider flows use SUCCEEDED.
 */
export async function confirmTransaction(transactionId: string): Promise<{ subscriptionId: string }> {
  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
  })
  if (!tx) throw new Error('Transaction not found')
  if (tx.subscriptionId && (tx.status === 'SUCCEEDED' || tx.status === 'APPROVED')) {
    return { subscriptionId: tx.subscriptionId }
  }

  const planSlug =
    (tx.raw as { planSlug?: string } | null)?.planSlug ??
    (await prisma.plan.findFirst({ where: { priceCents: tx.amountCents }, select: { slug: true } }))?.slug
  if (!planSlug) throw new Error('Cannot determine plan for transaction')
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
  if (!plan) throw new Error(`Plan "${planSlug}" not found`)

  const now = new Date()
  const periodDays = Number(process.env.SUBSCRIPTION_PERIOD_DAYS ?? 30)
  const periodEnd = new Date(now.getTime() + periodDays * 86400000)

  const existing = await prisma.subscription.findFirst({
    where: { userId: tx.userId, status: { in: ['TRIALING', 'ACTIVE'] } },
    orderBy: { currentPeriodEnd: 'desc' },
  })

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: 'ACTIVE',
          provider: tx.provider,
          providerRef: tx.providerRef,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })
    : await prisma.subscription.create({
        data: {
          userId: tx.userId,
          planId: plan.id,
          status: 'ACTIVE',
          provider: tx.provider,
          providerRef: tx.providerRef,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      })

  await prisma.paymentTransaction.update({
    where: { id: tx.id },
    // Manual QR approvals keep their APPROVED status; everything else
    // follows the legacy SUCCEEDED flow.
    data: { status: tx.status === 'APPROVED' ? 'APPROVED' : 'SUCCEEDED', subscriptionId: subscription.id },
  })
  await prisma.auditLog.create({
    data: {
      actorId: tx.userId,
      action: 'SUBSCRIPTION_ACTIVATED',
      targetType: 'SUBSCRIPTION',
      targetId: subscription.id,
      metadata: { plan: plan.slug, provider: tx.provider },
    },
  })

  return { subscriptionId: subscription.id }
}
