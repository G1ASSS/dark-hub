"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Play, TrendingUp, Clock, Eye, Flame,
  Sparkles, Compass, Upload
} from 'lucide-react'
import { VideoGrid } from '@/components/video/video-grid'
import { SectionHeader } from '@/components/video/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryTile } from '@/components/video/category-tile'
import type { CategoryTileData } from '@/components/video/category-tile'
import { formatViews, formatDuration, formatTimeAgo } from '@/lib/utils'
import type { VideoCardData } from '@/types'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function HomePage() {
  const [trending, setTrending] = useState<VideoCardData[] | null>(null)
  const [fresh, setFresh] = useState<VideoCardData[] | null>(null)
  const [categories, setCategories] = useState<CategoryTileData[] | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/videos?sort=most_viewed&pageSize=8').then((r) => (r.ok ? r.json() : { data: [] })),
      fetch('/api/videos?sort=newest&pageSize=8').then((r) => (r.ok ? r.json() : { data: [] })),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : { data: [] })),
    ]).then(([t, n, c]) => {
      if (!cancelled) {
        setTrending(t.data ?? [])
        setFresh(n.data ?? [])
        setCategories(c.data ?? [])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = trending === null || fresh === null
  const featured = (trending ?? [])[0]
  const empty = !loading && (trending ?? []).length === 0 && (fresh ?? []).length === 0

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 space-y-14">

      {/* ── Hero Feature ──────────────────────────────────── */}
      {featured ? (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          aria-label="Featured content"
        >
          <div className="relative rounded-3xl overflow-hidden min-h-[360px] sm:min-h-[480px] cursor-pointer group">
            <Image
              src={featured.thumbnailUrl}
              alt={featured.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority sizes="100vw" unoptimized
            />
            {/* Layered gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            {/* Cyan accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--gradient-primary)' }} />

            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="hot" className="gap-1.5">
                    <TrendingUp className="h-3 w-3" /> Featured
                  </Badge>
                  <span className="text-xs text-white/50" suppressHydrationWarning>{formatTimeAgo(featured.publishedAt)}</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold max-w-xl leading-[1.1] mb-3">
                  {featured.title}
                </h1>
                <p className="text-sm text-white/60 mb-5 flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{formatViews(featured.views)} views</span>
                  {featured.duration > 0 && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatDuration(featured.duration)}</span>}
                </p>
                <div className="flex items-center gap-3">
                  <Link href={`/watch/${featured.id}`}>
                    <Button size="lg" className="gap-2 animate-pulse-glow">
                      <Play className="h-4 w-4" fill="white" /> Watch Now
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      ) : empty ? (
        <section aria-label="No content yet" className="relative rounded-3xl overflow-hidden glass p-10 sm:p-16 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">No videos yet</h1>
          <p className="text-sm text-muted-foreground mb-6">Be the first to publish on Dark Hubb.</p>
          <Link href="/upload">
            <Button size="lg" className="gap-2"><Upload className="h-4 w-4" /> Upload a video</Button>
          </Link>
        </section>
      ) : null}

      {/* ── Categories ───────────────────────────────────── */}
      <section aria-label="Browse categories">
        <SectionHeader title="Categories" href="/categories" icon={<Compass className="h-4 w-4 text-cyan" />} />
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
        >
          {(categories ?? []).slice(0, 12).map((cat, i) => (
            <motion.div key={cat.id} variants={itemVariants}>
              <CategoryTile
                slug={cat.slug}
                name={cat.name}
                videoCount={cat.videoCount}
                coverUrl={cat.coverUrl}
                index={i}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Trending ─────────────────────────────────────── */}
      <section aria-label="Trending videos">
        <SectionHeader
          title="Trending Now"
          href="/search?sort=most_viewed"
          icon={<Flame className="h-4 w-4 text-cyan" />}
          description="Most watched this week"
        />
        <VideoGrid videos={trending ?? []} loading={loading} />
      </section>

      {/* ── New Releases ─────────────────────────────────── */}
      <section aria-label="New releases">
        <SectionHeader
          title="New Releases"
          href="/search?sort=newest"
          icon={<Sparkles className="h-4 w-4 text-cyan" />}
          description="Fresh content, just added"
        />
        <VideoGrid videos={fresh ?? []} loading={loading} />
      </section>

    </div>
  )
}
