import { Users, Video, Flag, BadgeCheck, Eye, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { VideoModButtons, CreatorModButtons } from '@/components/admin/mod-buttons'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Users; color: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

export default async function AdminOverview() {
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const [
    userCount,
    newUsers,
    publishedCount,
    pendingVideos,
    pendingReports,
    pendingCreators,
    viewAgg,
    recentReports,
    reviewQueue,
    creatorQueue,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.video.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.video.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
    prisma.report.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.creator.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.video.aggregate({ _sum: { views: true }, where: { status: 'PUBLISHED' } }),
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, targetType: true, targetId: true, reason: true, createdAt: true, status: true },
    }),
    prisma.video.findMany({
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { id: true, title: true, duration: true, updatedAt: true, creator: { select: { displayName: true } } },
    }),
    prisma.creator.findMany({
      where: { verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: { id: true, displayName: true, slug: true, createdAt: true },
    }),
  ])

  const totalViews = Number(viewAgg._sum.views ?? BigInt(0))
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform health and moderation queue</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Total Users" value={fmt(userCount)} icon={Users} color="text-violet-400" />
        <Stat label="New Users (30d)" value={fmt(newUsers)} icon={Eye} color="text-emerald-400" />
        <Stat label="Published Videos" value={fmt(publishedCount)} icon={Video} color="text-sky-400" />
        <Stat label="Total Views" value={fmt(totalViews)} icon={Clapperboard} color="text-fuchsia-400" />
        <Stat label="Pending Reports" value={fmt(pendingReports)} icon={Flag} color="text-rose-400" />
        <Stat label="Pending Verification" value={fmt(pendingCreators)} icon={BadgeCheck} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review queue */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Review Queue ({pendingVideos})</h2>
            <Link href="/admin/videos" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {reviewQueue.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Queue clear — nothing awaiting review.</p>
            )}
            {reviewQueue.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.creator.displayName} · {v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '—'} · <TimeAgo date={v.updatedAt.toISOString()} />
                  </p>
                </div>
                <VideoModButtons videoId={v.id} />
              </div>
            ))}
          </div>
        </div>

        {/* Creator queue */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Verification Queue ({pendingCreators})</h2>
            <Link href="/admin/creators" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {creatorQueue.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending applications.</p>
            )}
            {creatorQueue.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-rose-500/20 flex items-center justify-center shrink-0">
                  <BadgeCheck className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{c.slug} · <TimeAgo date={c.createdAt.toISOString()} /></p>
                </div>
                <CreatorModButtons creatorId={c.id} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Reports</h2>
          <Link href="/admin/reports" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        <div className="space-y-3">
          {recentReports.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No reports filed.</p>
          )}
          {recentReports.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
              <div className={`h-2 w-2 rounded-full shrink-0 ${r.status === 'PENDING' ? 'bg-rose-500' : 'bg-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.targetType} · {r.targetId.slice(0, 12)}…</p>
                <p className="text-xs text-muted-foreground">{r.reason.replace(/_/g, ' ')} · <TimeAgo date={r.createdAt.toISOString()} /></p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{r.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
