import Link from 'next/link'
import { Check, Crown, Play, Download, Gauge } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { getUserPlan } from '@/lib/subscriptions/access'
import { SubscribeButton } from '@/components/premium/subscribe-button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Premium',
  description: 'Dark Hubb Premium — higher quality, downloads, and priority access.',
}

function formatPrice(cents: number, currency: string): string {
  if (cents <= 0) return 'Free'
  return `${(cents / 100).toFixed(2)} ${currency} / mo`
}

export default async function PremiumPage() {
  const session = await verifySession()
  const [plans, current] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceCents: 'asc' } }),
    session ? getUserPlan(session.userId) : null,
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
          <Crown className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Dark Hubb <span className="gradient-text">Premium</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Free streaming forever. Premium unlocks the full ladder, downloads,
          and priority everything.
        </p>
        {current && (
          <p className="mt-3 text-sm text-muted-foreground">
            Current plan: <span className="font-semibold text-foreground">{current.planName}</span>
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = current?.planSlug === plan.slug
          const isFree = plan.priceCents <= 0
          return (
            <div
              key={plan.id}
              className={`glass rounded-2xl border p-6 ${isCurrent ? 'border-violet-500/40' : 'border-white/10'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold">{plan.name}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    Current
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold gradient-text mb-5">{formatPrice(plan.priceCents, plan.currency)}</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-cyan" /> Streaming up to {plan.maxQuality}
                </li>
                <li className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-cyan" />
                  {plan.allowDownload
                    ? `Downloads included (${plan.dailyDownloadLimit > 0 ? `${plan.dailyDownloadLimit}/day` : 'unlimited'})`
                    : 'No downloads (stream only)'}
                </li>
                <li className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-cyan" />
                  {isFree ? 'Standard access' : 'Priority access & processing'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan" /> Watch history sync
                </li>
              </ul>
              {isFree ? (
                <Link
                  href="/home"
                  className="flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  {isCurrent ? 'Continue watching' : 'Start free'}
                </Link>
              ) : isCurrent ? (
                <p className="text-center text-sm text-emerald-300">You&apos;re premium — enjoy.</p>
              ) : session ? (
                <SubscribeButton planSlug={plan.slug} planName={plan.name} />
              ) : (
                <Link
                  href="/login?callbackUrl=/premium"
                  className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all"
                >
                  <Crown className="h-4 w-4" /> Sign in to go {plan.name}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
        Downloads are for personal offline viewing. Every download is watermarked to your
        account and logged — sharing downloaded files violates the terms and gets
        accounts suspended. Browser playback can always be screen-captured; no
        technical measure can prevent that, so we protect with short-lived URLs,
        limits, and traceability instead of false promises.
      </p>
    </div>
  )
}
