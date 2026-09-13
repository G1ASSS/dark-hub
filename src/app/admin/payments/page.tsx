import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { TimeAgo } from '@/components/ui/time-ago'
import { PaymentReviewButtons } from '@/components/admin/payment-review-buttons'
import { formatMMK, getPayMethod, paymentStatusLabel } from '@/lib/premium-payments'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Premium Payments' }
export const dynamic = 'force-dynamic'

const MANUAL_PROVIDERS = ['kbz_pay', 'aya_pay', 'uab_pay']

const STATUS_VARIANT: Record<string, 'verified' | 'new' | 'destructive' | 'outline' | 'secondary'> = {
  PENDING: 'verified',
  APPROVED: 'new',
  SUCCEEDED: 'new',
  REJECTED: 'destructive',
  FAILED: 'destructive',
  CANCELED: 'secondary',
}

export default async function AdminPaymentsPage() {
  const payments = await prisma.paymentTransaction.findMany({
    where: { provider: { in: MANUAL_PROVIDERS } },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    take: 100,
    select: {
      id: true, provider: true, amountCents: true, currency: true,
      status: true, transactionRef: true, screenshotKey: true,
      rejectionReason: true, reviewedAt: true, createdAt: true,
      user: { select: { email: true, username: true } },
      reviewedBy: { select: { email: true } },
    },
  })

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Premium Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} pending verification · fixed price {formatMMK(6900)}
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium">Screenshot</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const methodName = getPayMethod(p.provider)?.name ?? p.provider
                return (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium break-all">{p.user.email}</p>
                      <p className="text-xs text-muted-foreground">@{p.user.username}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{methodName}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatMMK(p.amountCents)}
                      {p.amountCents !== 6900 && (
                        <span className="ml-1 text-[10px] font-bold text-rose-400">MISMATCH</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs break-all">{p.transactionRef ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.screenshotKey ? (
                        <a
                          href={`/api/admin/payments/${p.id}/screenshot`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap" suppressHydrationWarning>
                      <TimeAgo date={p.createdAt.toISOString()} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'} className="text-[10px] whitespace-nowrap">
                        {paymentStatusLabel(p.status).toUpperCase()}
                      </Badge>
                      {p.status === 'REJECTED' && p.rejectionReason && (
                        <p className="mt-1 max-w-[180px] text-[11px] text-muted-foreground">{p.rejectionReason}</p>
                      )}
                      {(p.status === 'APPROVED' || p.status === 'SUCCEEDED') && p.reviewedBy && (
                        <p className="mt-1 max-w-[180px] truncate text-[11px] text-muted-foreground">
                          by {p.reviewedBy.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex justify-end">
                        {p.status === 'PENDING' && <PaymentReviewButtons paymentId={p.id} />}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No manual payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className={cn('text-xs text-muted-foreground/70')}>
        Approving activates (or extends) the buyer&apos;s Premium subscription immediately and writes an audit log.
        Screenshots are only visible to staff through this page.
      </p>
    </div>
  )
}
