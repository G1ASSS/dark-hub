"use client"
import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Play, ThumbsUp, Heart, Share2, Flag, Eye, Clock,
  ChevronDown, ChevronUp, Send, Lock, ArrowLeft
} from 'lucide-react'
import { VideoPlayer } from '@/components/video/video-player'
import { DownloadButton } from '@/components/video/download-button'
// VideoCard replaced by RelatedVideoCard
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MOCK_VIDEOS, MOCK_TRENDING, formatDuration, formatViews, formatTimeAgo } from '@/lib/mock-data'
import { getInitials, anonymizeName } from '@/lib/utils'
import type { VideoCardData } from '@/types'

type SeriesInfo = {
  id: string
  title: string
  slug: string
  currentEpisode: number
  episodes: { episodeNumber: number; title: string; duration: number | null; href: string; videoId: string }[]
}

type RealVideo = VideoCardData & {
  description: string | null
  likes: number
  qualities: string[]
  series: SeriesInfo | null
}

const SAMPLE_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

interface PageProps {
  params: Promise<{ videoId: string }>
}

const MOCK_COMMENTS = [
  { id: '1', user: { username: 'alex_m', displayName: 'Alex M', avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=alex' }, body: 'Absolutely stunning production quality. The lighting work here is incredible.', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', user: { username: 'prism22', displayName: 'Prism22', avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=prism22' }, body: 'One of the best I\'ve seen this year. The cinematography is on another level.', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: '3', user: { username: 'nightv', displayName: 'Night V', avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=nightv' }, body: 'Every video on this platform is more beautiful than the last.', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
]


function NextUpCard({
  next,
  seriesTitle,
  onCancel,
}: {
  next: { episodeNumber: number; title: string; href: string }
  seriesTitle: string
  onCancel: () => void
}) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t)
          router.push(next.href)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [next.href, router])

  return (
    <div className="mb-5 rounded-2xl border border-violet-500/25 bg-violet-500/[0.07] p-5 animate-scale-in">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-1">Next Episode</p>
      <h3 className="font-bold">
        Episode {String(next.episodeNumber).padStart(2, '0')} — {next.title}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">{seriesTitle}</p>
      <div className="flex items-center gap-3">
        <Link href={next.href} className="flex-1">
          <Button className="w-full gap-2 btn-shine">
            <Play className="h-4 w-4" fill="white" /> Play Next Episode
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel{countdown > 0 ? ` (${countdown})` : ''}
        </Button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full gradient-primary rounded-full transition-all duration-1000"
          style={{ width: `${(countdown / 5) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {countdown > 0 ? `Starting in ${countdown} second${countdown === 1 ? '' : 's'}…` : 'Starting…'}
      </p>
    </div>
  )
}

function RelatedVideoCard({ video }: { video: import('@/types').VideoCardData }) {
  return (
    <Link href={`/watch/${video.id}`} className="group block">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary mb-2.5">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 1280px) 50vw, 360px"
          unoptimized
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-lg glow-cyan">
            <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/85 px-2 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm">
            {formatDuration(video.duration)}
          </div>
        )}
        {/* Gradient accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'var(--gradient-primary)' }} />
      </div>
      {/* Info */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-cyan transition-colors duration-200">
        {video.title}
      </h3>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
        <Eye className="h-3 w-3" />
        {formatViews(video.views)} · {formatTimeAgo(video.publishedAt)}
      </p>
    </Link>
  )
}

export default function WatchPage({ params }: PageProps) {
  const { videoId } = use(params)
  const router = useRouter()
  // Which video the ended-overlay belongs to — stale values can never
  // match a new videoId, so no reset effects are needed on navigation.
  const [endedFor, setEndedFor] = useState<string | null>(null)
  const goBack = () => {
    if (window.history.length > 1) router.back()
    else router.push('/home')
  }
  const mockVideo = MOCK_VIDEOS.find((v) => v.id === videoId) ?? MOCK_VIDEOS[0]
  const [real, setReal] = useState<RealVideo | null>(null)
  const [stream, setStream] = useState<{ videoId: string; url: string | null; denied: boolean } | null>(null)
  const [relatedReal, setRelatedReal] = useState<VideoCardData[] | null>(null)

  // Only the stream resolved for the currently viewed video applies —
  // this also discards stale state on navigation without resets.
  const masterUrl = stream?.videoId === videoId ? stream.url : null
  const tokenDenied = stream?.videoId === videoId ? stream.denied : false

  // Real video + signed stream URL; falls back to mock when not found.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`)
        if (!res.ok) return
        const data = (await res.json()) as RealVideo
        if (cancelled) return
        setReal(data)
        const tokRes = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ videoId }),
        })
        if (cancelled) return
        if (!tokRes.ok) {
          // Most likely signed out — the gate below explains instead of
          // silently playing an unrelated demo stream.
          setStream({ videoId, url: null, denied: true })
          return
        }
        const tok = (await tokRes.json()) as { masterUrl?: string }
        if (cancelled) return
        setStream({ videoId, url: tok.masterUrl ?? null, denied: !tok.masterUrl })
        const relRes = await fetch('/api/videos?sort=newest&pageSize=9')
        if (!relRes.ok) return
        const rel = (await relRes.json()) as { data?: VideoCardData[] }
        if (!cancelled) setRelatedReal((rel.data ?? []).filter((v) => v.id !== videoId).slice(0, 8))
      } catch {
        // mock fallback stays
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoId])

  const video = real ?? mockVideo
  const related = relatedReal ?? MOCK_TRENDING.filter((v) => v.id !== video.id).slice(0, 8)

  // Next-episode autoplay (series only): 5s countdown, cancellable.
  const series = real?.series ?? null
  const epIndex = series ? series.episodes.findIndex((e) => e.episodeNumber === series.currentEpisode) : -1
  const prevEp = series && epIndex > 0 ? series.episodes[epIndex - 1] : null
  const nextEp = series && epIndex >= 0 && epIndex < series.episodes.length - 1 ? series.episodes[epIndex + 1] : null
  const showNext = endedFor === videoId && nextEp

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState<number | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string; user: { username: string; displayName: string } }[] | null>(null)
  const [commentPosting, setCommentPosting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportReason, setReportReason] = useState<string | null>(null)
  const [reportDetails, setReportDetails] = useState('')
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  // Interaction state for real videos (likes, favs, comments)
  useEffect(() => {
    if (!real) return
    let cancelled = false
    ;(async () => {
      try {
        if (!cancelled) setLikeCount(real.likes)
        const [likeRes, favRes, comRes] = await Promise.all([
          fetch(`/api/likes?videoId=${videoId}`),
          fetch('/api/favorites'),
          fetch(`/api/videos/${videoId}/comments`),
        ])
        if (cancelled) return
        if (likeRes.ok) {
          const d = (await likeRes.json()) as { liked: boolean | null }
          if (d.liked !== null) setLiked(d.liked)
        }
        if (favRes.ok) {
          const d = (await favRes.json()) as { data?: { id: string }[] }
          setFavorited(!!d.data?.some((v) => v.id === videoId))
        }
        if (comRes.ok) {
          const d = (await comRes.json()) as { data?: typeof comments }
          setComments(d.data ?? [])
        }
      } catch {
        // logged-out or offline — local-only interactions remain
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id])

  const toggleLike = async () => {
    if (!real) {
      setLiked(!liked)
      return
    }
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ videoId }),
    })
    if (!res.ok) return
    const d = (await res.json()) as { liked: boolean; likes: number }
    setLiked(d.liked)
    setLikeCount(d.likes)
  }

  const toggleFavorite = async () => {
    if (!real) {
      setFavorited(!favorited)
      return
    }
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ videoId }),
    })
    if (!res.ok) return
    const d = (await res.json()) as { favorited: boolean }
    setFavorited(d.favorited)
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  const postComment = async () => {
    if (!comment.trim() || commentPosting) return
    if (!real) {
      setComment('')
      return
    }
    setCommentPosting(true)
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: comment.trim() }),
      })
      if (res.ok) {
        const d = (await res.json()) as { id: string; body: string; createdAt: string }
        setComments((prev) => [
          { ...d, user: { username: 'you', displayName: 'You' } },
          ...(prev ?? []),
        ])
        setComment('')
      }
    } finally {
      setCommentPosting(false)
    }
  }

  const REPORT_REASONS: { label: string; value: string }[] = [
    { label: 'Illegal content', value: 'ILLEGAL_CONTENT' },
    { label: 'Non-consensual', value: 'NON_CONSENSUAL' },
    { label: 'Copyright infringement', value: 'COPYRIGHT_INFRINGEMENT' },
    { label: 'Underage concern', value: 'UNDERAGE_CONTENT' },
    { label: 'Harassment', value: 'HARASSMENT' },
    { label: 'Spam', value: 'SPAM' },
  ]

  const submitReport = async () => {
    if (!reportReason || reportStatus === 'sending') return
    if (!real) {
      setReportStatus('done')
      return
    }
    setReportStatus('sending')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType: 'VIDEO',
          targetId: videoId,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      })
      setReportStatus(res.ok ? 'done' : 'error')
    } catch {
      setReportStatus('error')
    }
  }
  const [showReport, setShowReport] = useState(false)

  const description = real?.description
    ?? `A premium production showcasing the highest quality content on Dark Hubb. Crafted with meticulous attention to detail — lighting, composition, and direction are all top tier. All content is legal, consensual, and rights-owned.`

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">

        {/* ── Left: Player + info ────────────────────────── */}
        <div className="min-w-0">

          {/* Back */}
          <div className="mb-4">
            <button
              onClick={goBack}
              aria-label="Go back"
              className="group flex items-center gap-2 rounded-full py-2 pl-3 pr-4 transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                backdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), 0 0 0 0.5px rgba(255,255,255,0.16), 0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <ArrowLeft className="h-4 w-4 text-white/85 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="text-sm font-semibold text-white/85">Back</span>
            </button>
          </div>

          {/* Video Player */}
          <div className="rounded-2xl overflow-hidden bg-black mb-5">
            {real && tokenDenied && !masterUrl ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-bold">Sign in to watch</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Streaming is members-only. Sign in to get a secure playback session for this video.
                </p>
                <Link href={`/login?callbackUrl=/watch/${video.id}`}>
                  <Button size="lg" className="gap-2 mt-1">Sign In to Watch</Button>
                </Link>
              </div>
            ) : (
              <VideoPlayer
                src={masterUrl ?? SAMPLE_HLS_URL}
                poster={video.thumbnailUrl}
                title={video.title}
                videoId={real?.id}
                qualities={real?.qualities ?? []}
                getVariantUrl={
                  masterUrl
                    ? (q) => masterUrl.replace('/master.m3u8', `/${q}/playlist.m3u8`)
                    : undefined
                }
                onEnded={() => {
                  if (nextEp) setEndedFor(videoId)
                }}
              />
            )}
          </div>

          {/* Series strip */}
          {series && (
            <div className="mb-5 glass rounded-xl p-4">
              <Link
                href={`/series/${series.slug}`}
                className="mb-3 inline-block text-sm font-bold hover:text-cyan transition-colors"
              >
                {series.title}
              </Link>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {series.episodes.map((e) => {
                  const isCurrent = e.episodeNumber === series.currentEpisode
                  return (
                    <Link
                      key={e.videoId}
                      href={e.href}
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-label={`Episode ${e.episodeNumber}${isCurrent ? ' (current)' : ''}`}
                      className={`flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums transition-all ${
                        isCurrent
                          ? 'gradient-primary text-white'
                          : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/25'
                      }`}
                    >
                      {isCurrent ? '✓' : String(e.episodeNumber).padStart(2, '0')}
                    </Link>
                  )
                })}
              </div>
              <div className="mt-3 flex gap-2">
                {prevEp ? (
                  <Link href={prevEp.href} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      ← Previous Episode
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 opacity-40" disabled>
                    ← Previous Episode
                  </Button>
                )}
                {nextEp ? (
                  <Link href={nextEp.href} className="flex-1">
                    <Button size="sm" className="w-full gap-1.5">
                      Next Episode →
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" className="flex-1 gap-1.5 opacity-40" disabled>
                    Next Episode →
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Next episode autoplay card */}
          {showNext && nextEp && (
            <NextUpCard
              key={nextEp.videoId}
              next={nextEp}
              seriesTitle={series?.title ?? ''}
              onCancel={() => setEndedFor(null)}
            />
          )}

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold leading-tight mb-3">{video.title}</h1>

          {/* Meta + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{formatViews(video.views)} views</span>
              <span>·</span>
              <span suppressHydrationWarning>{formatTimeAgo(video.publishedAt)}</span>
              {video.duration && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatDuration(video.duration)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={liked ? 'default' : 'outline'}
                size="sm"
                onClick={toggleLike}
                className="gap-1.5"
                aria-label="Like"
              >
                <ThumbsUp className="h-4 w-4" fill={liked ? 'white' : 'none'} />
                {formatViews(likeCount ?? 24500)}
              </Button>
              <Button
                variant={favorited ? 'default' : 'outline'}
                size="sm"
                onClick={toggleFavorite}
                className="gap-1.5"
                aria-label="Favourite"
              >
                <Heart className="h-4 w-4" fill={favorited ? 'white' : 'none'} />
                Favourite
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" aria-label="Share" onClick={share}>
                <Share2 className="h-4 w-4" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
              <DownloadButton videoId={video.id} qualities={real?.qualities?.length ? real.qualities : ['360p', '480p', '720p', '1080p']} />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-rose-400"
                onClick={() => setShowReport(!showReport)}
                aria-label="Report"
              >
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>

          {/* Report panel */}
          {showReport && (
            <div className="mb-5 glass rounded-xl p-4 border border-rose-500/20 animate-slide-up">
              {reportStatus === 'done' ? (
                <div className="text-center py-4">
                  <p className="text-sm font-semibold text-emerald-400 mb-1">Report received</p>
                  <p className="text-xs text-muted-foreground">Our team reviews reports within 24 hours.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold mb-3 text-rose-400">Report Content</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => setReportReason(reason.value)}
                        className={`text-left px-3 py-2 rounded-lg text-xs border transition-colors ${reportReason === reason.value ? 'border-rose-500/50 bg-rose-500/10 text-foreground' : 'border-white/8 hover:border-rose-500/30 hover:bg-rose-500/5'}`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Details (optional, max 2000 characters)"
                    maxLength={2000}
                    rows={2}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
                  />
                  {reportStatus === 'error' && (
                    <p className="text-xs text-rose-400 mb-2">Could not submit — sign in and try again.</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-500" disabled={!reportReason || reportStatus === 'sending'} onClick={submitReport}>
                      {reportStatus === 'sending' ? 'Submitting…' : 'Submit Report'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}>Cancel</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mb-5 glass rounded-xl p-4">
            <p className={`text-sm text-muted-foreground leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
              {description}
            </p>
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="flex items-center gap-1 text-xs text-cyan mt-2 hover:opacity-80 transition-opacity"
            >
              {showFullDesc ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
            </button>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {(video.categories.length > 0 ? video.categories : ['cinematic', 'hd', 'premium']).map((tag) => (
                <Link key={tag} href={`/search?category=${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:border-cyan/40 hover:text-cyan transition-colors">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Comments ({(comments ?? MOCK_COMMENTS).length})</h2>

            {/* Comment input */}
            <div className="flex gap-3 mb-6">
              <div className="h-9 w-9 shrink-0 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground select-none">
                ?
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                  placeholder={real ? 'Add a comment…' : 'Sign in to comment…'}
                  disabled={!real}
                  maxLength={1000}
                  className="w-full h-10 pl-4 pr-12 rounded-xl border border-white/10 bg-white/5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                {comment && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg gradient-primary disabled:opacity-50"
                    aria-label="Post comment"
                    onClick={postComment}
                    disabled={commentPosting}
                  >
                    <Send className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Comment list — commenter names are anonymised for privacy */}
            <div className="space-y-5">
              {(comments ?? MOCK_COMMENTS).map((c) => {
                const anonName = anonymizeName(c.user.username)
                return (
                  <div key={c.id} className="flex gap-3">
                    {/* Generic avatar — no photo to protect identity */}
                    <div className="h-9 w-9 shrink-0 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground select-none">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">{anonName}</span>
                        <span className="text-xs text-muted-foreground/60" suppressHydrationWarning>{formatTimeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                )
              })}
              {(comments ?? []).length === 0 && real && (
                <p className="text-sm text-muted-foreground">No comments yet — start the discussion.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Related ─────────────────────────────── */}
        <aside className="min-w-0">
          <h2 className="text-lg font-semibold mb-4">Related Videos</h2>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
            {related.map((v) => (
              <RelatedVideoCard key={v.id} video={v} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
