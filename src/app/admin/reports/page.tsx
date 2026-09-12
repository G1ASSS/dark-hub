import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { ReportModButtons } from '@/components/admin/mod-buttons'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'destructive' | 'verified' | 'new' | 'outline'> = {
  PENDING: 'destructive',
  UNDER_REVIEW: 'verified',
  RESOLVED: 'new',
  DISMISSED: 'outline',
}

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, targetType: true, targetId: true, reason: true,
      details: true, status: true, createdAt: true,
      reporter: { select: { username: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reports.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length} open
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Filed</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{r.targetType}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.targetId.slice(0, 14)}…</p>
                    {r.details && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-xs">{r.details}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{r.reason.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs">@{r.reporter.username}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'} className="text-[10px]">{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap" suppressHydrationWarning>
                    <TimeAgo date={r.createdAt.toISOString()} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end">
                      {(r.status === 'PENDING' || r.status === 'UNDER_REVIEW') && (
                        <ReportModButtons reportId={r.id} />
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No reports filed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
