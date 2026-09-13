'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAccount } from './account-context'

export function PremiumSection() {
  const initial = useAccount()
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 p-5">
        <div className="absolute inset-0 gradient-primary opacity-15" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary"
          >
            <Crown className="h-6 w-6 text-white" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{initial.planName}</p>
              <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>Current</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {initial.planSlug === 'free'
                ? 'Streaming up to 480p. Premium unlocks 1080p and downloads.'
                : 'Higher quality and downloads are active.'}{' '}
              <strong className="text-foreground">{initial.counts.downloads}</strong> downloads on record.
            </p>
          </div>
        </div>
        {initial.planSlug === 'free' && (
          <Link href="/premium" className="relative mt-4 block">
            <Button className="w-full btn-shine">Upgrade</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
