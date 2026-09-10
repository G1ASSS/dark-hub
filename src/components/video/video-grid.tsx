import { VideoCard } from './video-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { VideoCardData } from '@/types'

interface VideoGridProps {
  videos: (VideoCardData & { progress?: number })[]
  loading?: boolean
  skeletonCount?: number
  className?: string
  variant?: 'default' | 'compact'
}

export function VideoGrid({
  videos,
  loading = false,
  skeletonCount = 12,
  className,
  variant = 'default',
}: VideoGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className ?? ''}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-video-thumb w-full rounded-xl" />
            <div className="flex gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!videos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-2xl">🎬</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Check back soon — new content from verified creators is always being added.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className ?? ''}`}
    >
      {videos.map((video, i) => (
        <VideoCard key={video.id} video={video}  />
      ))}
    </div>
  )
}
