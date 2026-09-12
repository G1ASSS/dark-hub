'use client'
import { formatTimeAgo } from '@/lib/utils'

/** Relative timestamp rendered on the client (avoids SSR impurity + hydration drift). */
export function TimeAgo({ date, className }: { date: string | Date; className?: string }) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatTimeAgo(date)}
    </span>
  )
}
