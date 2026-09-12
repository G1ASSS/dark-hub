"use client"
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play, Eye, Zap, ChevronRight, ChevronDown,
  CheckCircle2, Crown, Flame
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgeGate } from '@/components/auth/age-gate'
import { CountUp } from '@/components/ui/count-up'
import { formatViews } from '@/lib/utils'
import type { VideoCardData } from '@/types'

/** Animated count-up for stat chips. */
function StatCount({ value }: { value: number | undefined }) {
  return (
    <span className="tabular-nums">
      <CountUp value={value} compact />
    </span>
  )
}

function LandingInner() {
  const [ageVerified, setAgeVerified] = useState(false)
  const [stats, setStats] = useState<{ videos: number; creators: number; views: number } | null>(null)
  const [trending, setTrending] = useState<VideoCardData[]>([])
  const [trendIdx, setTrendIdx] = useState(0)
  const trendRef = useRef<HTMLDivElement>(null)
  const trendAuto = useRef(false)
  const trendTouched = useRef(0)
  const router = useRouter()
  const params = useSearchParams()
  const redirectTarget = params.get('redirect')

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {})
    fetch('/api/videos?sort=most_viewed&pageSize=8')
      .then((r) => r.json())
      .then((d) => setTrending(d.data ?? []))
      .catch(() => {})
  }, [])

  // Trending auto-rail (mirrors the home hero treatment)
  useEffect(() => {
    if (trending.length < 2) return
    const t = setInterval(() => {
      if (Date.now() - trendTouched.current < 10000) return
      setTrendIdx((i) => (i + 1) % trending.length)
    }, 4000)
    return () => clearInterval(t)
  }, [trending.length])

  useEffect(() => {
    const el = trendRef.current
    const child = el?.children[trendIdx] as HTMLElement | undefined
    if (!el || !child) return
    trendAuto.current = true
    el.scrollTo({ left: Math.max(child.offsetLeft - 16, 0), behavior: 'smooth' })
    const timer = setTimeout(() => {
      trendAuto.current = false
    }, 650)
    return () => clearTimeout(timer)
  }, [trendIdx])

  const onTrendScroll = () => {
    if (trendAuto.current) return
    const el = trendRef.current
    if (!el || el.children.length === 0) return
    trendTouched.current = Date.now()
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement
      const dist = Math.abs(child.offsetLeft - 16 - el.scrollLeft)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    setTrendIdx((prev) => (prev === best ? prev : best))
  }

  const confirm = () => {
    setAgeVerified(true)
    if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
      router.push(redirectTarget)
    }
  }

  if (!ageVerified) {
    return <AgeGate onConfirm={confirm} />
  }

  const heroVideo = trending[0]

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden text-center px-4">
        {heroVideo && (
          <div className="absolute inset-0">
            <Image
              src={heroVideo.thumbnailUrl}
              alt="Featured"
              fill
              className="object-cover opacity-25"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>
        )}
        <div className="bg-orb-1 pointer-events-none" />
        <div className="bg-orb-2 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-cyan" />
            Premium adult streaming · 18+ only
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
            className="mb-5 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Premium Content,
            <br />
            <motion.span
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24, ease: 'easeOut' }}
              className="gradient-text animate-gradient-x inline-block"
            >
              Beautifully Delivered
            </motion.span>
          </motion.h1>

          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Dark Hubb is a curated, private streaming platform for adults.
            Cinematic quality, seamless playback, and total privacy.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/home">
              <Button size="xl" className="gap-2 btn-shine animate-pulse-glow">
                <Play className="h-5 w-5" fill="white" />
                Start Browsing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="glass" size="xl">Sign In</Button>
            </Link>
          </motion.div>

          {/* Live stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            className="mt-10 flex items-center justify-center gap-3 flex-wrap"
          >
            {[
              { label: 'videos', value: stats?.videos },
              { label: 'creators', value: stats?.creators },
              { label: 'views', value: stats?.views },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl px-5 py-3 min-w-[110px]">
                <div className="text-xl font-bold tabular-nums">
                  <StatCount value={s.value} />
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30"
            aria-hidden="true"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Poster marquee (real catalog in motion) ──────── */}
      {trending.length > 1 && (
        <section aria-label="Fresh posters" className="marquee-hover overflow-hidden py-6 border-y border-white/5">
          <div className="animate-marquee flex w-max gap-4">
            {[...trending, ...trending].map((v, i) => (
              <Link key={`${v.id}-${i}`} href={`/watch/${v.id}`} className="group relative block w-56 sm:w-64 shrink-0 overflow-hidden rounded-2xl" aria-hidden={i >= trending.length}>
                <div className="relative aspect-video">
                  <Image
                    src={v.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="256px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <p className="absolute bottom-2 left-3 right-3 truncate text-xs font-semibold">{v.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending rail (auto-advancing) ─────────────── */}
      {trending.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-cyan" /> Trending Now
            </h2>
            <Link href="/home" className="flex items-center gap-1 text-sm text-cyan hover:opacity-80 transition-opacity">
              Browse all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div
            ref={trendRef}
            onScroll={onTrendScroll}
            className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {trending.map((v) => (
              <Link
                key={v.id}
                href={`/watch/${v.id}`}
                className="group w-[78%] sm:w-[46%] lg:w-[31%] shrink-0 snap-start"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-video mb-2.5">
                  <Image
                    src={v.thumbnailUrl}
                    alt={v.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 31vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-[11px] text-white/80 flex items-center gap-1">
                      <Eye className="h-3 w-3" />{formatViews(v.views)}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-3.5 w-3.5 text-white ml-0.5" fill="white" />
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-cyan transition-colors">{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.creator.displayName}</p>
              </Link>
            ))}
          </div>
          {trending.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {trending.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setTrendIdx(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === trendIdx % trending.length ? 'w-6 bg-white' : 'w-1.5 bg-white/25'}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Premium band ─────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 p-10 sm:p-14 text-center">
          <div className="absolute inset-0 gradient-primary opacity-15" aria-hidden="true" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
              <Crown className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Go Premium</h2>
            <p className="text-muted-foreground mb-2 max-w-xl mx-auto">
              1080p streaming, offline downloads, priority processing.
            </p>
            <div className="mb-7 flex items-center justify-center gap-5 text-xs text-muted-foreground">
              {['HD downloads', 'No waiting', 'Watch history sync'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> {t}
                </span>
              ))}
            </div>
            <Link href="/premium">
              <Button size="xl" className="gap-2">
                <Crown className="h-5 w-5" /> See Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to explore?</h2>
        <p className="text-muted-foreground mb-6">Premium content, cinematic quality, total privacy.</p>
        <Link href="/home">
          <Button size="xl" className="gap-2">
            <Play className="h-5 w-5" fill="white" />
            Browse Content
          </Button>
        </Link>
      </section>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingInner />
    </Suspense>
  )
}
