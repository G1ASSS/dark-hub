import { prisma } from '@/lib/db/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const [users, videos, views, subs, orders, products] = await Promise.all([
    prisma.user.count(),
    prisma.video.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.video.aggregate({ _sum: { views: true }, where: { status: 'PUBLISHED' } }),
    prisma.subscription.count({ where: { status: { in: ['TRIALING', 'ACTIVE'] } } }),
    prisma.shopOrder.aggregate({
      _sum: { totalCents: true }, _count: { _all: true },
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    }),
    prisma.product.count({ where: { isActive: true } }),
  ])

  const cards = [
    { label: 'Users', value: `${users}` },
    { label: 'Published videos', value: `${videos}` },
    { label: 'Total views', value: `${Number(views._sum.views ?? BigInt(0)).toLocaleString()}` },
    { label: 'Active subscriptions', value: `${subs}` },
    { label: 'Shop orders (paid+)', value: `${orders._count._all}` },
    { label: 'Shop revenue (paid+)', value: `$${((orders._sum.totalCents ?? 0) / 100).toFixed(2)}` },
    { label: 'Live products', value: `${products}` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Live aggregates straight from Postgres — users, videos, subscriptions, shop.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{c.label}</p>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
