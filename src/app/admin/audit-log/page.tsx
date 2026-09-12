import { prisma } from '@/lib/db/prisma'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

const ACTION_COLOR: Record<string, string> = {
  VIDEO_APPROVED: 'text-emerald-400',
  VIDEO_REJECTED: 'text-rose-400',
  USER_BANNED: 'text-rose-400',
  CREATOR_APPROVED: 'text-emerald-400',
  REPORT_RESOLVED: 'text-emerald-400',
}

export default async function AdminAuditLogPage() {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, action: true, targetType: true, targetId: true,
      ipAddress: true, createdAt: true,
      actor: { select: { username: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Immutable record of staff and user actions</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className={`px-4 py-3 font-medium text-xs whitespace-nowrap ${ACTION_COLOR[r.action] ?? ''}`}>
                    {r.action.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.actor ? `@${r.actor.username}` : 'system'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {r.targetType ? `${r.targetType} ${r.targetId?.slice(0, 10)}…` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap" suppressHydrationWarning>
                    <TimeAgo date={r.createdAt.toISOString()} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
