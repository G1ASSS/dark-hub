"use client"
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play, Shield, Lock, Eye, Star, Zap, ChevronRight,
  CheckCircle2, Sparkles, Film, Crown, Flame
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgeGate } from '@/components/auth/age-gate'
import { formatViews } from '@/lib/utils'
import type { VideoCardData } from '@/types'

const FEATURES = [
  { icon: Shield, title: 'Verified Legal Content', desc: 'All content is rights-owned, consensual, and legally compliant.' },
  { icon: Film, title: 'Cinematic Quality', desc: 'Adaptive HLS streaming with renditions up to 1080p.' },
  { icon: Lock, title: 'Private & Secure', desc: 'Signed playback URLs, watermarked downloads, and a real audit trail.' },
  { icon: Star, title: 'Curated Collection', desc: 'Human moderation before anything publishes — no spam.' },
  { icon: Eye, title: 'Seamless Playback', desc: 'Origin-cached segments for instant start on any connection.' },
  { icon: Sparkles, title: 'Premium Downloads', desc: 'Offline copies for members, with fair daily limits.' },
]

function LandingInner() {
  const [ageVerified, setAgeVerified] = useState(false)
  const [stats, setStats] = useState<{ videos: number; creators: number; views: number } | null>(null)
  const [trending, setTrending] = useState<VideoCardData[]>([])
  const railRef = useRef<HTMLDivElement>(null)
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

          <h1 className="mb-5 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Premium Content,
            <br />
            <span className="gradient-text">Beautifully Delivered</span>
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Dark Hubb is a curated, private streaming platform for adults.
            Cinematic quality, seamless playback, and total privacy.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/home">
              <Button size="xl" className="gap-2 animate-pulse-glow">
                <Play className="h-5 w-5" fill="white" />
                Start Browsing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="glass" size="xl">Sign In</Button>
            </Link>
          </div>

          {/* Live stats */}
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: 'videos', value: stats?.videos },
              { label: 'creators', value: stats?.creators },
              { label: 'views', value: stats?.views },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl px-5 py-3 min-w-[110px]">
                <div className="text-xl font-bold tabular-nums">
                  {s.value === undefined ? '…' : s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}K` : s.value}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Trending rail (real catalog) ─────────────────── */}
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
            ref={railRef}
            className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {trending.map((v) => (
              <Link key={v.id} href={`/watch/${v.id}`} className="group shrink-0 w-64 sm:w-72">
                <div className="relative rounded-2xl overflow-hidden aspect-video mb-2.5">
                  <Image
                    src={v.thumbnailUrl}
                    alt={v.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="288px"
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
        </section>
      )}

      {/* ── Features ─────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Why Dark Hubb?</h2>
          <p className="text-muted-foreground">Built different. Built premium.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="glass rounded-2xl p-6 hover:border-white/12 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-subtle mb-4">
                  <Icon className="h-5 w-5 text-cyan" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

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
