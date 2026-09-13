import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ManualPayMethod } from '@/lib/premium-payments'

/** Square brand tile that normalizes every logo aspect ratio. */
export function MethodLogo({
  method,
  size = 'h-16 w-16',
  rounded = 'rounded-2xl',
}: {
  method: ManualPayMethod
  size?: string
  rounded?: string
}) {
  return (
    <span className={cn('relative shrink-0 overflow-hidden', size, rounded, method.logoBg)}>
      <Image
        src={method.logo}
        alt={`${method.name} logo`}
        fill
        sizes="96px"
        className={method.logoFit === 'cover' ? 'object-cover' : 'object-contain p-1.5'}
      />
    </span>
  )
}
