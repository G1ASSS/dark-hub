import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { CreatorModButtons } from '@/components/admin/mod-buttons'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Verification' }
export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'verified' | 'new' | 'destructive' | 'outline'> = {
  PENDING: 'verified',
  APPROVED: 'new',
  REJECTED: 'destructive',
  SUSPENDED: 'outline',
}

export default async function AdminCreatorsPage() {
  const creators = await prisma.creator.findMany({
    orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'asc' }],
    take: 50,
    select: {
      id: true, displayName: true, slug: true,
      verificationStatus: true, isVerified: true, createdAt: true,
      user: { select: { email: true } },
      _count: { select: { videos: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {creators.filter((c) => c.verificationStatus === 'PENDING').length} pending applications
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Videos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{c.slug} · {c.user.email}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c._count.videos}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[c.verificationStatus] ?? 'outline'} className="text-[10px]">
                      {c.isVerified ? '✓ ' : ''}{c.verificationStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap" suppressHydrationWarning>
                    <TimeAgo date={c.createdAt.toISOString()} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end">
                      {c.verificationStatus === 'PENDING' && <CreatorModButtons creatorId={c.id} />}
                    </span>
                  </td>
                </tr>
              ))}
              {creators.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No creators yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
