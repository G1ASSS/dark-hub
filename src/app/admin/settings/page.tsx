import { prisma } from '@/lib/db/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const plans = await prisma.plan.findMany({ orderBy: { priceCents: 'asc' } })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Plans + environment wiring. Plan edits happen in DB via seed or SQL; env lives in .env.local.</p>
      </div>
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Subscription plans (from DB)</h2>
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-sm">
              <span className="font-medium">{p.name} <span className="text-muted-foreground font-mono text-xs">· {p.slug}</span></span>
              <span className="tabular-nums">{p.priceCents} {p.currency} · {p.maxQuality}{p.allowDownload ? ` · ${p.dailyDownloadLimit}/day` : ' · stream-only'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-semibold text-foreground mb-2">Connected systems</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Database: Postgres via Prisma (DATABASE_URL / DIRECT_URL for migrations)</li>
          <li>Storage origin: Telegram bot + private chat (TELEGRAM_*), R2 staging optional</li>
          <li>Payments: manual QR (kbz/aya/uab) reviewed in /admin/payments → Subscription</li>
          <li>Shop: Product + ShopOrder tables, managed in /admin/shop, storefront at /search</li>
          <li>Worker: POST /api/worker/process with WORKER_SECRET (transcode → Telegram → HLS)</li>
        </ul>
      </div>
    </div>
  )
}
