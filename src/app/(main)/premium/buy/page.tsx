import Link from 'next/link'
import { Crown } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { getUserPlan } from '@/lib/subscriptions/access'
import { PREMIUM_PLAN_SLUG, formatMMK, getPayMethod } from '@/lib/premium-payments'
import { BuyPremiumClient, type PaymentRow } from '@/components/premium/buy-premium-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Premium',
  description: 'Get Dark Hubb Premium for 6,900 MMK with KBZ Pay, AYA Pay or UAB Pay.',
}

export const dynamic = 'force-dynamic'

export default async function BuyPremiumPage() {
  const session = await verifySession()
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 text-center">
        <Crown className="h-12 w-12 mx-auto mb-4 text-violet-300" />
        <h1 className="text-2xl font-bold mb-2">Sign in to go Premium</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Premium is {formatMMK(6900)} via KBZ Pay, AYA Pay or UAB Pay.
        </p>
        <Link
          href="/login?callbackUrl=/premium/buy"
          className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all"
        >
          <Crown className="h-4 w-4" /> Sign in
        </Link>
      </div>
    )
  }

  const [plan, current, payments, activeSub] = await Promise.all([
    prisma.plan.findUnique({ where: { slug: PREMIUM_PLAN_SLUG } }),
    getUserPlan(session.userId),
    prisma.paymentTransaction.findMany({
      where: { userId: session.userId, provider: { in: ['kbz_pay', 'aya_pay', 'uab_pay'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, provider: true, amountCents: true, currency: true,
        status: true, transactionRef: true, screenshotKey: true,
        rejectionReason: true, createdAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId: session.userId, status: { in: ['TRIALING', 'ACTIVE'] } },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { currentPeriodEnd: true },
    }),
  ])

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    methodId: p.provider,
    methodName: getPayMethod(p.provider)?.name ?? p.provider,
    amount: p.amountCents,
    status: p.status,
    transactionRef: p.transactionRef,
    hasScreenshot: p.screenshotKey != null,
    rejectionReason: p.rejectionReason,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <BuyPremiumClient
      initial={{
        planName: plan?.name ?? 'Premium',
        isPremium: current.planSlug !== 'free',
        expiresAt: activeSub?.currentPeriodEnd?.toISOString() ?? null,
        periodDays: Number(process.env.SUBSCRIPTION_PERIOD_DAYS ?? 30),
        payments: rows,
      }}
    />
  )
}
