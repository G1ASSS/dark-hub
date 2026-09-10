import { Users, Video, Flag, BadgeCheck, TrendingUp, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }

const STATS = [
  { label: 'Total Users', value: '248,431', change: '+2.4%', icon: Users, color: 'text-violet-400' },
  { label: 'Published Videos', value: '84,218', change: '+1.1%', icon: Video, color: 'text-sky-400' },
  { label: 'Pending Reports', value: '143', change: '+12', icon: Flag, color: 'text-rose-400' },
  { label: 'Pending Verification', value: '28', change: '+5', icon: BadgeCheck, color: 'text-amber-400' },
  { label: 'Total Views (30d)', value: '42.1M', change: '+18.2%', icon: Eye, color: 'text-emerald-400' },
  { label: 'New Users (30d)', value: '12,840', change: '+8.7%', icon: TrendingUp, color: 'text-fuchsia-400' },
]

const RECENT_REPORTS = [
  { id: 'r1', type: 'VIDEO', reason: 'ILLEGAL_CONTENT', title: 'Reported Video #7291', time: '5 min ago', severity: 'high' },
  { id: 'r2', type: 'USER', reason: 'HARASSMENT', title: 'User @darkuser22', time: '18 min ago', severity: 'medium' },
  { id: 'r3', type: 'VIDEO', reason: 'COPYRIGHT_INFRINGEMENT', title: 'Reported Video #6880', time: '34 min ago', severity: 'medium' },
  { id: 'r4', type: 'VIDEO', reason: 'NON_CONSENSUAL', title: 'Reported Video #7105', time: '1h ago', severity: 'high' },
  { id: 'r5', type: 'COMMENT', reason: 'SPAM', title: 'Comment by @spambot', time: '2h ago', severity: 'low' },
]

const PENDING_CREATORS = [
  { id: 'c1', name: 'Stella Noir', slug: 'stella-noir', appliedAt: '2 hours ago', docs: 3 },
  { id: 'c2', name: 'Axe Media', slug: 'axe-media', appliedAt: '5 hours ago', docs: 2 },
  { id: 'c3', name: 'Luna Spark', slug: 'luna-spark', appliedAt: '1 day ago', docs: 4 },
]

export default function AdminOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform health and moderation queue</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.change} vs last period</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Reports</h2>
            <a href="/admin/reports" className="text-xs text-violet-400 hover:text-violet-300">View all →</a>
          </div>
          <div className="space-y-3">
            {RECENT_REPORTS.map((report) => (
              <div key={report.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                <div className={`h-2 w-2 rounded-full shrink-0 ${report.severity === 'high' ? 'bg-rose-500' : report.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{report.title}</p>
                  <p className="text-xs text-muted-foreground">{report.reason.replace(/_/g, ' ')} · {report.time}</p>
                </div>
                <Badge variant={report.severity === 'high' ? 'hot' : report.severity === 'medium' ? 'verified' : 'outline'} className="text-[10px] shrink-0">
                  {report.severity}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Creator verification queue */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Verification Queue</h2>
            <a href="/admin/creators" className="text-xs text-violet-400 hover:text-violet-300">View all →</a>
          </div>
          <div className="space-y-3">
            {PENDING_CREATORS.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-rose-500/20 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Applied {c.appliedAt} · {c.docs} docs</p>
                </div>
                <div className="flex gap-1.5">
                  <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
