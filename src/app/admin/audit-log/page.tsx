import { ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log' }

const LOGS = Array.from({ length: 30 }, (_, i) => ({
  id: `log-${i+1}`,
  actor: ['admin_jane', 'mod_alex', 'system'][i % 3],
  action: ['HIDE_VIDEO', 'BAN_USER', 'APPROVE_CREATOR', 'REMOVE_VIDEO', 'RESOLVE_REPORT', 'REJECT_COPYRIGHT'][i % 6],
  targetType: ['VIDEO', 'USER', 'REPORT', 'COPYRIGHT'][i % 4],
  targetId: `id-${1000+i}`,
  ip: `192.168.${i%255}.${(i*7)%255}`,
  createdAt: new Date(Date.now() - i * 1800000).toISOString(),
}))

const ACTION_COLOR: Record<string,string> = {
  HIDE_VIDEO: 'text-amber-400',
  BAN_USER: 'text-rose-400',
  APPROVE_CREATOR: 'text-emerald-400',
  REMOVE_VIDEO: 'text-rose-400',
  RESOLVE_REPORT: 'text-sky-400',
  REJECT_COPYRIGHT: 'text-slate-400',
}

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Immutable record of all moderation actions</p>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-3">Timestamp</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map((log, i) => (
                <tr key={log.id} className={`border-b border-white/4 hover:bg-white/3 transition-colors text-xs ${i === LOGS.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">@{log.actor}</td>
                  <td className="px-4 py-3"><span className={`font-medium ${ACTION_COLOR[log.action] ?? 'text-foreground'}`}>{log.action.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] mr-1">{log.targetType}</Badge><span className="text-muted-foreground">{log.targetId}</span></td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
