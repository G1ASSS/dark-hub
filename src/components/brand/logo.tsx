import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Brand mark — the Dark Hubb logo, auto-optimized by next/image. */
export function Logo({
  size = 40,
  className,
  rounded = 'rounded-xl',
}: {
  size?: number
  className?: string
  rounded?: string
}) {
  return (
    <Image
      src="/logo.png"
      alt="Dark Hubb"
      width={size}
      height={size}
      className={cn(rounded, 'object-cover', className)}
      sizes={`${size}px`}
    />
  )
}
