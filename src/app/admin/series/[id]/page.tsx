import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { EpisodesManager } from '@/components/admin/episodes-manager'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { updateSeriesAction } from '@/actions/series'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Series' }
export const dynamic = 'force-dynamic'

export default async function AdminSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const series = await prisma.series.findUnique({
    where: { id },
    select: {
      id: true, title: true, slug: true, description: true,
      thumbnail: true, coverImage: true, status: true, sortOrder: true,
      episodes: {
        orderBy: { episodeNumber: 'asc' },
        select: {
          id: true, episodeNumber: true, title: true, description: true,
          video: { select: { id: true, title: true, status: true, duration: true } },
        },
      },
    },
  })
  if (!series) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/series" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← All series
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{series.title}</h1>
          <Badge variant={series.status === 'PUBLISHED' ? 'new' : 'outline'} className="text-[10px]">{series.status}</Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-1">/{series.slug} · {series.episodes.length} episodes</p>
      </div>

      {/* Edit metadata */}
      <form action={updateSeriesAction.bind(null, series.id)} className="glass rounded-2xl p-6 space-y-4">
        <input type="hidden" name="id" value={series.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Title</Label>
            <Input id="s-title" name="title" defaultValue={series.title} minLength={2} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-status">Status</Label>
            <select id="s-status" name="status" defaultValue={series.status} className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm [&>option]:bg-[#14141c]">
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea id="s-desc" name="description" defaultValue={series.description ?? ''} maxLength={2000} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-thumb">Thumbnail URL</Label>
            <Input id="s-thumb" name="thumbnail" defaultValue={series.thumbnail ?? ''} placeholder="https://… or tg:<file_id>" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-cover">Cover URL</Label>
            <Input id="s-cover" name="coverImage" defaultValue={series.coverImage ?? ''} placeholder="https://… or tg:<file_id>" />
          </div>
        </div>
        <Button type="submit" size="sm">Save Series</Button>
      </form>

      {/* Episodes */}
      <EpisodesManager
        seriesId={series.id}
        initial={series.episodes.map((e) => ({
          id: e.id,
          episodeNumber: e.episodeNumber,
          title: e.title,
          description: e.description,
          videoId: e.video.id,
          videoTitle: e.video.title,
          videoStatus: e.video.status,
          duration: e.video.duration,
        }))}
      />
    </div>
  )
}
