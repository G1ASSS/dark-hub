"use client"
import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, TrendingUp, Clock, ThumbsUp, Play } from 'lucide-react'
import { VideoGrid } from '@/components/video/video-grid'
import { SeriesCard } from '@/components/video/series-card'
import type { SeriesCardData } from '@/lib/series'
import type { EpisodeMatch } from '@/app/api/search/route'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MOCK_CATEGORIES } from '@/lib/mock-data'
import type { SearchFilters, VideoCardData } from '@/types'

const DURATION_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Short (< 4 min)', value: 'short' },
  { label: 'Medium (4–20 min)', value: 'medium' },
  { label: 'Long (20+ min)', value: 'long' },
]

const DATE_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
]

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance', icon: Search },
  { label: 'Newest', value: 'newest', icon: Clock },
  { label: 'Most Viewed', value: 'most_viewed', icon: TrendingUp },
  { label: 'Most Liked', value: 'most_liked', icon: ThumbsUp },
]

function SearchInner() {
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<VideoCardData[]>([])
  const [series, setSeries] = useState<SeriesCardData[]>([])
  const [episodes, setEpisodes] = useState<EpisodeMatch[]>([])
  const [total, setTotal] = useState(0)
  const [kindTab, setKindTab] = useState<'all' | 'series' | 'videos'>('all')
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    sort: (params.get('sort') as SearchFilters['sort']) || 'relevance',
    category: params.get('category') || undefined,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(async (
    q: string,
    f: Partial<SearchFilters>,
    signal: AbortSignal
  ) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (q.trim()) {
        sp.set('q', q.trim())
        if (f.sort) sp.set('sort', f.sort)
        if (f.duration) sp.set('duration', f.duration)
        if (f.uploadDate) sp.set('uploadDate', f.uploadDate)
        if (f.category) sp.set('category', f.category)
        const res = await fetch(`/api/search?${sp}`, { signal })
        const data = (await res.json()) as {
          data?: VideoCardData[]
          videos?: VideoCardData[]
          series?: SeriesCardData[]
          episodes?: EpisodeMatch[]
          total?: number
        }
        if (signal.aborted) return
        setResults(data.videos ?? data.data ?? [])
        setSeries(data.series ?? [])
        setEpisodes(data.episodes ?? [])
        setTotal(data.total ?? 0)
      } else {
        if (f.sort && f.sort !== 'relevance') sp.set('sort', f.sort)
        if (f.category) sp.set('category', f.category)
        const res = await fetch(`/api/videos?${sp}`, { signal })
        const data = (await res.json()) as { data?: VideoCardData[]; total?: number }
        if (signal.aborted) return
        setResults(data.data ?? [])
        setSeries([])
        setEpisodes([])
        setTotal(data.total ?? 0)
      }
    } catch {
      if (!signal.aborted) {
        setResults([])
        setSeries([])
        setEpisodes([])
        setTotal(0)
      }
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  // Debounced search on query/filter change
  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => runSearch(query, filters, ctrl.signal), 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, filters, runSearch])

  const suggestions = query.length > 1
    ? results.filter((v) => v.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)
    : []

  const setFilter = (key: keyof SearchFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
      {/* Search header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Search</h1>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos, creators, categories…"
            className="w-full h-14 pl-12 pr-14 rounded-2xl border border-white/10 bg-white/5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            aria-label="Search"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-white/10 overflow-hidden z-20 animate-scale-in">
              {suggestions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setQuery(v.title)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{v.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{v.creator.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {query ? `${total} result${total === 1 ? '' : 's'} for "${query}"` : `${total} video${total === 1 ? '' : 's'} available`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {Object.values(filters).filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-8 glass rounded-2xl p-5 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Sort */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Sort By
              </label>
              <div className="flex flex-col gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter('sort', opt.value as SearchFilters['sort'])}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      filters.sort === opt.value
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Duration
              </label>
              <div className="flex flex-col gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter('duration', (opt.value || undefined) as SearchFilters['duration'])}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      filters.duration === opt.value || (!filters.duration && !opt.value)
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload date */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Upload Date
              </label>
              <div className="flex flex-col gap-1.5">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter('uploadDate', (opt.value || undefined) as SearchFilters['uploadDate'])}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      filters.uploadDate === opt.value || (!filters.uploadDate && !opt.value)
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="mt-5 pt-5 border-t border-white/6">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {MOCK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter('category', filters.category === cat.slug ? '' : cat.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filters.category === cat.slug
                      ? 'gradient-primary text-white'
                      : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Kind tabs: All / Series / Videos */}
      {query.trim() && (series.length > 0 || episodes.length > 0) && (
        <div className="flex gap-2 mb-6">
          {(['all', 'series', 'videos'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindTab(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                kindTab === k
                  ? 'gradient-primary text-white'
                  : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Series matches (grouped — episodes collapse into the card) */}
      {(kindTab === 'all' || kindTab === 'series') && series.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Series</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {series.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        </div>
      )}

      {/* Direct episode matches */}
      {(kindTab === 'all' || kindTab === 'videos') && episodes.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Episodes</p>
          <div className="space-y-2">
            {episodes.map((e) => (
              <Link
                key={e.videoId}
                href={e.href}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 pr-4 transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="w-9 shrink-0 text-center text-base font-black tabular-nums text-white/35">
                  {String(e.episodeNumber).padStart(2, '0')}
                </span>
                <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg">
                  {e.thumbnailUrl ? (
                    <Image src={e.thumbnailUrl} alt="" fill className="object-cover" sizes="80px" unoptimized />
                  ) : null}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.seriesTitle}</span>
                </span>
                <Play className="h-4 w-4 text-white/50 shrink-0" fill="currentColor" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {(kindTab === 'all' || kindTab === 'videos') && (
        <>
          {((kindTab === 'all' && (series.length > 0 || episodes.length > 0)) || kindTab === 'videos') && results.length > 0 && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Videos</p>
          )}
          <VideoGrid videos={results} loading={loading} />
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && series.length === 0 && episodes.length === 0 && (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {query ? `No results for "${query}"` : 'No videos yet'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'Try different keywords or browse categories' : 'Be the first to upload'}
          </p>
          {query ? (
            <Button variant="outline" onClick={() => setQuery('')}>
              Clear search
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  )
}
