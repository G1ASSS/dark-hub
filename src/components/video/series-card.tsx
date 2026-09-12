import Link from 'next/link'
import Image from 'next/image'
import { Play, Layers } from 'lucide-react'
import type { SeriesCardData } from '@/lib/series'

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

/** One card per series — episodes never render as separate cards. */
export function SeriesCard({ series }: { series: SeriesCardData }) {
  return (
    <Link href={`/series/${series.slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary mb-2.5">
        {series.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt={series.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 360px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-indigo-800/30 flex items-center justify-center">
            <Layers className="h-10 w-10 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-lg">
            <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
        <div className="absolute top-2 left-2 rounded-lg bg-black/85 backdrop-blur-sm px-2 py-1 text-[11px] font-bold flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {series.episodeCount} Episode{series.episodeCount === 1 ? '' : 's'}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'var(--gradient-primary)' }} />
      </div>
      <h3 className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-cyan transition-colors duration-200">
        {series.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        {formatCompact(series.totalViews)} views · {series.episodeCount} episodes
      </p>
    </Link>
  )
}
