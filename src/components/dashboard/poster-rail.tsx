'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Play, Eye } from 'lucide-react'
import { formatViews, formatDuration } from '@/lib/utils'
import type { VideoCardData } from '@/types'

export function PosterRail({ videos, emptyText }: { videos: VideoCardData[] | null; emptyText: string }) {
  if (videos === null) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-52 sm:w-60 shrink-0">
            <div className="skeleton aspect-video rounded-2xl" />
          </div>
        ))}
      </div>
    )
  }
  if (videos.length === 0) return <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 w-max">
        {videos.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link href={`/watch/${v.slug ?? v.id}`} className="group block w-52 sm:w-60">
              <div className="relative aspect-video overflow-hidden rounded-2xl mb-2">
                <Image
                  src={v.thumbnailUrl}
                  alt={v.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="240px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
                    <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                  </div>
                </div>
                {v.duration > 0 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {formatDuration(v.duration)}
                  </div>
                )}
              </div>
              <p className="truncate text-sm font-semibold group-hover:text-cyan transition-colors">{v.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" />{formatViews(v.views)}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
