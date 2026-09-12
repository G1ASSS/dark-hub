import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CreateSeriesForm, SeriesRowActions } from '@/components/admin/series-forms'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Series' }
export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'verified' | 'new' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PUBLISHED: 'new',
  ARCHIVED: 'destructive',
}

export default async function AdminSeriesPage() {
  const rows = await prisma.series.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, slug: true, status: true, updatedAt: true,
      _count: { select: { episodes: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Series</h1>
        <p className="text-sm text-muted-foreground mt-1">Collections of ordered episodes (no seasons)</p>
      </div>

      <CreateSeriesForm />

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Series</th>
                <th className="px-4 py-3 font-medium">Episodes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/series/${s.id}`} className="font-medium hover:text-cyan transition-colors">
                      {s.title}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">/{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{s._count.episodes}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'outline'} className="text-[10px]">{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end">
                      <SeriesRowActions id={s.id} slug={s.slug} status={s.status} />
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No series yet — create the first above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
