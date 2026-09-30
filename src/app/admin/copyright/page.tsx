import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Copyright' }
export const dynamic = 'force-dynamic'

export default async function AdminCopyrightPage() {
  const requests = await prisma.copyrightRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, claimantName: true, claimantEmail: true, description: true,
      status: true, createdAt: true,
      video: { select: { id: true, title: true } },
      requester: { select: { username: true } },
    },
  })
  const open = requests.filter((r) => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Copyright Takedowns</h1>
        <p className="text-sm text-muted-foreground mt-1">{open} pending · DMCA queue wired to Video + AuditLog</p>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Claimant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/watch/${r.video.id}`} className="font-medium hover:text-violet-300">{r.video.title}</Link>
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-sm">{r.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.claimantName}<br /><span className="text-muted-foreground">{r.claimantEmail} · @{r.requester.username}</span></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{r.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"><TimeAgo date={r.createdAt.toISOString()} /></td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No takedown requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
