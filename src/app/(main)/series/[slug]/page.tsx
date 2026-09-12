"use client"
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, Eye, Clock, ChevronLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatViews, formatDuration } from '@/lib/utils'

type EpisodeItem = {
  episodeNumber: number
  title: string
  description: string | null
  duration: number | null
  views: number
  thumbnailUrl: string | null
  href: string
  videoId: string
}

type SeriesDetail = {
  id: string
  title: string
  slug: string
  description: string | null
  coverUrl: string | null
  episodeCount: number
  episodes: EpisodeItem[]
}

type ProgressMap = Record<string, { position: number; duration: number }>

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    let cancelled = false
    fetch(`/api/series/${encodeURIComponent(slug)}`).then(async (r) => {
      if (cancelled) return
      if (!r.ok) {
        setMissing(true)
        return
      }
      setSeries(await r.json())
    })
    fetch('/api/progress')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.data) return
        const map: ProgressMap = {}
        for (const p of d.data as { video: { id: string }; position: number; duration: number }[]) {
          map[p.video.id] = { position: p.position, duration: p.duration }
        }
        setProgress(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug])

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Series not found</h1>
        <p className="text-sm text-muted-foreground mb-6">It may be a draft or removed.</p>
        <Link href="/home"><Button>Back to Home</Button></Link>
      </div>
    )
  }

  if (!series) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="skeleton aspect-video rounded-3xl" />
        <div className="skeleton h-8 w-2/3 rounded-lg" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  // First episode with real progress, else episode 1
  const resume =
    series.episodes.find((e) => {
      const p = progress[e.videoId]
      return p && p.duration > 0 && p.position / p.duration < 0.95 && p.position > 5
    }) ?? series.episodes[0]

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 pb-20">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Cover header */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[300px] mb-6">
        {series.coverUrl ? (
          <Image src={series.coverUrl} alt={series.title} fill className="object-cover" sizes="100vw" unoptimized priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-indigo-800/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <Badge variant="hot" className="gap-1.5 mb-2">
            <Layers className="h-3 w-3" /> {series.episodeCount} Episode{series.episodeCount === 1 ? '' : 's'}
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">{series.title}</h1>
          {series.description && (
            <p className="mt-2 max-w-xl text-sm text-white/65 line-clamp-2">{series.description}</p>
          )}
        </div>
      </div>

      {/* Play */}
      {resume && (
        <Link href={resume.href} className="block mb-8">
          <Button size="lg" className="w-full sm:w-auto gap-2 btn-shine animate-pulse-glow">
            <Play className="h-4 w-4" fill="white" />
            {progress[resume.videoId] ? `Resume Episode ${pad(resume.episodeNumber)}` : 'Play Episode 01'}
          </Button>
        </Link>
      )}

      {/* Episode rows (number order, big touch targets) */}
      <div className="space-y-2.5" role="list" aria-label="Episodes">
        {series.episodes.map((e) => {
          const p = progress[e.videoId]
          const pct = p && p.duration > 0 ? Math.min(100, Math.round((p.position / p.duration) * 100)) : 0
          return (
            <Link
              key={e.videoId}
              href={e.href}
              role="listitem"
              className="group flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 pr-4 min-h-[76px] transition-all hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.99]"
            >
              <span className="w-9 shrink-0 text-center text-lg font-black tabular-nums text-white/30 group-hover:text-white/60 transition-colors">
                {pad(e.episodeNumber)}
              </span>
              <span className="relative h-[68px] w-32 sm:w-40 shrink-0 overflow-hidden rounded-xl">
                {e.thumbnailUrl ? (
                  <Image src={e.thumbnailUrl} alt="" fill className="object-cover" sizes="160px" unoptimized />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-indigo-800/30" />
                )}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play className="h-6 w-6 text-white" fill="white" />
                </span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm sm:text-[15px] font-semibold group-hover:text-cyan transition-colors">
                  {e.title}
                </span>
                <span className="mt-1 flex items-center gap-2.5 text-[11px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(e.views)}</span>
                  {e.duration ? (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(e.duration)}</span>
                  ) : null}
                  {pct > 0 && <span className="text-cyan-300 font-semibold">{pct}%</span>}
                </span>
                {pct > 0 && (
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] group-hover:gradient-primary transition-all" aria-hidden="true">
                <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
