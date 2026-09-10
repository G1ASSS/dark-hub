"use client"
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Play, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatViews, formatTimeAgo } from '@/lib/mock-data'

import type { VideoCardData } from '@/types'

interface VideoCardProps {
  video: VideoCardData
  variant?: 'default' | 'compact'
  priority?: boolean
}

export function VideoCard({ video, variant = 'default', priority }: VideoCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/watch/${video.id}`} className="flex gap-3 group">
        <div className="relative h-20 w-32 shrink-0 rounded-xl overflow-hidden bg-secondary">
          <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="128px" unoptimized />
          {video.duration && (
            <div className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-cyan transition-colors">{video.title}</h3>
          <p className="text-xs text-muted-foreground mt-1.5">{formatViews(video.views)} views</p>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>{formatTimeAgo(video.publishedAt)}</p>
        </div>
      </Link>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/watch/${video.id}`} className="group block">
        {/* Thumbnail */}
        <div className="relative aspect-video-thumb rounded-2xl overflow-hidden bg-secondary mb-3 shadow-[var(--shadow-card)]">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Duration pill */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-sm">
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1 }}
              className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary shadow-xl glow-cyan"
            >
              <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
            </motion.div>
          </div>

          {/* Progress bar (continue watching) */}
          {'progress' in video && typeof (video as { progress?: number }).progress === 'number' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full gradient-primary transition-all"
                style={{ width: `${(video as { progress: number }).progress}%` }}
              />
            </div>
          )}

          {/* New badge */}
          {'isNew' in video && (video as { isNew?: boolean }).isNew && (
            <div className="absolute top-2 left-2">
              <Badge variant="new" className="text-[10px] px-1.5 py-0">New</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-cyan transition-colors duration-200">
            {video.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(video.views)}
            </span>
            <span>·</span>
            <span suppressHydrationWarning>{formatTimeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
