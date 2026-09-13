"use client"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Play, Eye, Search, SlidersHorizontal, Bell,
  ChevronRight, Flame, Sparkles, Upload, BellRing,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatViews, formatDuration } from '@/lib/utils'
import { fetchCached } from '@/lib/client-cache'
import { SeriesCard } from '@/components/video/series-card'
import type { FeedItem } from '@/app/api/feed/trending/route'
import type { VideoCardData } from '@/types'

type ProgressItem = {
  video: VideoCardData
  position: number
  duration: number
  series: { title: string; slug: string; episodeNumber: number } | null
}

type Me = { username: string; displayName: string; avatarUrl: string | null }

export default function HomePage() {
  const [feed, setFeed] = useState<FeedItem[] | null>(null)
  const [progress, setProgress] = useState<ProgressItem[] | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [heroIdx, setHeroIdx] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  const trendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // Cached: back-navigation and tab switches render instantly, and
    // concurrent mounts share one request.
    Promise.all([
      fetchCached<{ data: FeedItem[] }>('/api/feed/trending'),
      fetchCached<{ data: ProgressItem[] }>('/api/progress'),
      fetchCached<{ user: Me }>('/api/auth/me'),
    ]).then(([f, p, m]) => {
      if (cancelled) return
      setFeed(f?.data ?? [])
      setProgress(p?.data ?? [])
      setMe(m?.user ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = feed === null
  const hero = (feed ?? []).slice(0, 4)
  const empty = !loading && (feed ?? []).length === 0

  // Hero autoplay — programmatic scrolls are flagged so the scroll
  // handler ignores them; manual swipes pause autoplay for 10s.
  const autoScrolling = useRef(false)
  const lastInteract = useRef(0)

  useEffect(() => {
    if (hero.length < 2) return
    const t = setInterval(() => {
      if (Date.now() - lastInteract.current < 10000) return
      setHeroIdx((i) => (i + 1) % hero.length)
    }, 1000)
    return () => clearInterval(t)
  }, [hero.length])

  // Top Trending continuous rotation — always gliding, never stepping.
  // Content is rendered twice so the wrap point is invisible.
  const trendCount = (feed ?? []).length
  useEffect(() => {
    if (trendCount < 2) return
    let raf = 0
    let last = performance.now()
    const SPEED = 45 // px per second
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const el = trendRef.current
      if (el && Date.now() - lastInteract.current > 8000 && !document.hidden) {
        el.scrollLeft += SPEED * dt
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [trendCount])

  const onTrendScroll = () => {
    lastInteract.current = Date.now()
  }

  const scrollToHero = (idx: number) => {
    const el = heroRef.current
    const child = el?.children[idx] as HTMLElement | undefined
    if (!el || !child) return
    // Center the card (matches snap-center alignment exactly)
    const target = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2
    autoScrolling.current = true
    el.scrollTo({ left: target, behavior: 'smooth' })
    setTimeout(() => {
      autoScrolling.current = false
    }, 650)
  }

  useEffect(() => {
    scrollToHero(heroIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroIdx])

  const onHeroScroll = () => {
    if (autoScrolling.current) return
    const el = heroRef.current
    if (!el) return
    lastInteract.current = Date.now()
    // Nearest card to the snap-centered position
    const center = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement
      const dist = Math.abs(child.offsetLeft + child.clientWidth / 2 - center)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    setHeroIdx((prev) => (prev === best ? prev : best))
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-lg font-bold text-white shrink-0">
            {(me?.displayName ?? 'D').trim()[0]?.toUpperCase() ?? 'D'}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hello{me ? ',' : ''}</p>
            <p className="text-lg font-bold leading-tight">{me?.displayName ?? 'Welcome'}</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          aria-label="Account"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors"
        >
          {progress && progress.length > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </Link>
      </div>

      {/* ── Search capsule ───────────────────────────────── */}
      <Link
        href="/search"
        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-muted-foreground hover:border-white/20 transition-colors"
      >
        <Search className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-sm">Search videos, creators…</span>
        <SlidersHorizontal className="h-5 w-5 shrink-0" />
      </Link>

      {empty ? (
        <section aria-label="No content yet" className="relative rounded-3xl overflow-hidden glass p-10 sm:p-16 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">No videos yet</h1>
          <p className="text-sm text-muted-foreground mb-6">Be the first to publish on Dark Hubb.</p>
          <Link href="/upload">
            <Button size="lg" className="gap-2"><Upload className="h-4 w-4" /> Upload a video</Button>
          </Link>
        </section>
      ) : (
        <>
          {/* ── Hero carousel ────────────────────────────── */}
          {hero.length > 0 && (
            <section aria-label="Featured">
              <div
                ref={heroRef}
                onScroll={onHeroScroll}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
                style={{ scrollbarWidth: 'none' }}
              >
                {hero.map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="group relative shrink-0 w-[86%] sm:w-[64%] lg:w-[46%] snap-center rounded-3xl overflow-hidden aspect-video"
                  >
                    <Image
                      src={item.image ?? ''}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority={false}
                      sizes="(max-width: 640px) 86vw, (max-width: 1024px) 64vw, 46vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--gradient-primary)' }} />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <Badge variant="hot" className="gap-1 mb-2">
                        <Flame className="h-3 w-3" /> {item.kind === 'series' ? 'Series' : 'Featured'}
                      </Badge>
                      <h2 className="font-bold text-lg sm:text-xl leading-tight line-clamp-1">{item.title}</h2>
                      <p className="text-xs text-white/60 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(item.views)}</span>
                        <span>{item.subtitle}</span>
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Play className="h-3 w-3" fill="currentColor" /> {item.kind === 'series' ? 'Open' : 'Watch'}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              {hero.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {hero.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setHeroIdx(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${i === heroIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/25'}`}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Continue Watching ────────────────────────── */}
          {progress && progress.length > 0 && (
            <section aria-label="Continue watching">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Continue Watching</h2>
                <Link href="/dashboard" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
                {progress.map(({ video: v, position, duration, series }) => {
                  const pct = Math.min(100, Math.round((position / Math.max(duration, 1)) * 100))
                  return (
                    <Link key={v.id} href={`/watch/${v.slug ?? v.id}`} className="group shrink-0 w-64 sm:w-72">
                      <div className="relative rounded-2xl overflow-hidden aspect-video mb-2">
                        <Image
                          src={v.thumbnailUrl}
                          alt={v.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="288px"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/20 overflow-hidden">
                          <div className="h-full gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="absolute bottom-4 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                          {formatDuration(Math.max(duration - position, 0))} left
                        </div>
                      </div>
                      <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-cyan transition-colors">
                        {series ? series.title : v.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {series ? (
                          <>Episode {String(series.episodeNumber).padStart(2, '0')} · {pct}% watched · Continue →</>
                        ) : (
                          <>{v.title} · {pct}% watched</>
                        )}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Trending ranked (series + standalone, mixed) ── */}
          {(feed ?? []).length > 0 && (
            <section aria-label="Top trending">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Top Trending</h2>
                <Link href="/search?sort=most_viewed" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div
                ref={trendRef}
                onScroll={onTrendScroll}
                onPointerDown={() => {
                  lastInteract.current = Date.now()
                }}
                className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 items-end"
                style={{ scrollbarWidth: 'none' }}
              >
                {[...(feed ?? []).slice(0, 8), ...(feed ?? []).slice(0, 8)].map((item, i) => (
                  <Link
                    key={`${item.kind}-${item.id}-${i}`}
                    href={item.href}
                    aria-hidden={i >= 8}
                    className="group shrink-0 flex items-end"
                  >
                    <span
                      aria-hidden="true"
                      className="text-[64px] sm:text-[80px] font-black leading-[0.8] -mr-3 mb-1 select-none"
                      style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.35)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="relative block w-36 sm:w-44 rounded-2xl overflow-hidden aspect-video">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="176px"
                          unoptimized
                        />
                      ) : null}
                      <span className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/25 transition-colors" />
                      {item.kind === 'series' && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-bold">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Browse: series cards + standalone videos ─── */}
          <section aria-label="Browse">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Browse</h2>
              <Link href="/search" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                See More <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <div className="skeleton aspect-video" />
                    <div className="glass border-t border-white/10 p-3">
                      <div className="skeleton h-4 w-3/4 rounded mb-2" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (feed ?? []).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(feed ?? []).slice(0, 12).map((item) =>
                  item.kind === 'series' ? (
                    <SeriesCard
                      key={`series-${item.id}`}
                      series={{
                        id: item.id,
                        title: item.title,
                        slug: item.href.replace('/series/', ''),
                        description: null,
                        coverUrl: item.image,
                        episodeCount: Number(item.subtitle.split(' ')[0]) || 0,
                        totalViews: item.views,
                      }}
                    />
                  ) : (
                    <Link key={`video-${item.id}`} href={item.href} className="group rounded-2xl overflow-hidden">
                      <div className="relative aspect-video">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 25vw"
                          unoptimized
                        />
                      </div>
                      <div className="glass border-t border-white/10 p-3">
                        <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-cyan transition-colors">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(item.views)}</span>
                          <span>{item.subtitle}</span>
                        </p>
                      </div>
                    </Link>
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-10 glass rounded-2xl">
                <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
