"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Play, Shield, Lock, Eye, Star, Zap, ChevronRight,
  CheckCircle2, Sparkles, Film
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoCard } from '@/components/video/video-card'
import { AgeGate } from '@/components/auth/age-gate'
import { MOCK_TRENDING } from '@/lib/mock-data'

const FEATURES = [
  { icon: Shield, title: 'Verified Legal Content', desc: 'All content is rights-owned, consensual, and legally compliant.' },
  { icon: Film, title: 'Cinematic Quality', desc: 'Premium productions in up to 4K with full HLS adaptive streaming.' },
  { icon: Lock, title: 'Private & Secure', desc: 'Your data is encrypted, never shared, and always under your control.' },
  { icon: Star, title: 'Curated Collection', desc: 'Hand-picked premium content — no spam, no low-effort uploads.' },
  { icon: Eye, title: 'Seamless Playback', desc: 'Custom HLS player with adaptive bitrate for any connection speed.' },
  { icon: Sparkles, title: 'New Every Week', desc: 'Fresh content added regularly, organized and easy to browse.' },
]

export default function LandingPage() {
  const [ageVerified, setAgeVerified] = useState(false)

  if (!ageVerified) {
    return <AgeGate onConfirm={() => setAgeVerified(true)} />
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden text-center px-4">
        {/* Background thumbnail */}
        <div className="absolute inset-0">
          <Image
            src={MOCK_TRENDING[0].thumbnailUrl}
            alt="Dark Hubb Hero"
            fill className="object-cover opacity-20" unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        {/* Orbs */}
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

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            {['Legal & consensual', 'Private & encrypted', '4K quality'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan" /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Featured videos ──────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Trending Now</h2>
          <Link href="/home" className="flex items-center gap-1 text-sm text-cyan hover:opacity-80 transition-opacity">
            Browse all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MOCK_TRENDING.slice(0, 8).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </section>

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

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="gradient-border rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-3">Ready to explore?</h2>
          <p className="text-muted-foreground mb-6">Premium content, cinematic quality, total privacy.</p>
          <Link href="/home">
            <Button size="xl" className="gap-2">
              <Play className="h-5 w-5" fill="white" />
              Browse Content
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
