import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { VideoModButtons } from '@/components/admin/mod-buttons'
import { formatDuration } from '@/lib/utils'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Video Moderation' }
export const dynamic = 'force-dynamic'

export default async function AdminVideosPage() {
  const [pending, decided] = await Promise.all([
    prisma.video.findMany({
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      orderBy: { updatedAt: 'asc' },
      take: 30,
      select: {
        id: true, title: true, duration: true, updatedAt: true,
        creator: { select: { displayName: true } },
        qualities: { select: { resolution: true } },
      },
    }),
    prisma.video.findMany({
      where: { status: { in: ['PUBLISHED', 'REJECTED'] }, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, title: true, status: true, updatedAt: true, creator: { select: { displayName: true } } },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Video Moderation</h1>
        <p className="text-sm text-muted-foreground mt-1">{pending.length} awaiting review</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Pending Review</h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Queue clear.</p>
          )}
          {pending.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground">
                  {v.creator.displayName} · {v.duration ? formatDuration(v.duration) : '—'} · {v.qualities.map((q) => q.resolution).join('/')} ·{' '}
                  <TimeAgo date={v.updatedAt.toISOString()} />
                </p>
              </div>
              <VideoModButtons videoId={v.id} />
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Recently Decided</h2>
        <div className="space-y-2">
          {decided.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.creator.displayName}</p>
              </div>
              <Badge variant={v.status === 'PUBLISHED' ? 'new' : 'destructive'} className="text-[10px]">{v.status}</Badge>
              <Link href={`/watch/${v.id}`} className="text-xs text-violet-400 hover:text-violet-300 shrink-0">View →</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
