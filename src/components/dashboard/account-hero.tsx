'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CountUp } from '@/components/ui/count-up'
import { logout } from '@/actions/auth'
import { useAccount } from './account-context'

function initials(name: string) {
  return name.split(/[\s_]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function AccountHero() {
  const initial = useAccount()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10"
    >
      <div className="absolute inset-0 gradient-primary opacity-15" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        className="absolute -top-20 right-[10%] h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ x: [0, -28, 0], y: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-[#0A0A0F] to-transparent" aria-hidden="true" />
      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-violet-500 p-[3px] shrink-0">
            <Avatar className="h-16 w-16 border-4 border-[#0A0A0F]">
              {initial.avatarUrl ? <AvatarImage src={initial.avatarUrl} alt={initial.displayName} /> : null}
              <AvatarFallback className="text-lg font-bold">{initials(initial.displayName)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{initial.displayName}</h1>
              <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'} className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px]">
                {initial.planName}
              </Badge>
              {initial.role !== 'USER' && <Badge variant="verified" className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-[10px]">{initial.role}</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">@{initial.username}</p>
          </div>
          <form action={logout} className="ml-6">
            <button
              aria-label="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-400 transition-all hover:scale-105 hover:bg-rose-500/20"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
        <div className="mt-6 sm:mt-8 flex gap-7 sm:gap-8">
          {[
            { label: 'favourites', value: initial.counts.favorites },
            { label: 'watched', value: initial.counts.history },
            { label: 'downloads', value: initial.counts.downloads },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="text-xl font-bold tabular-nums">
                <CountUp value={s.value} />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        {initial.planSlug === 'free' && (
          <Link href="/premium" className="mt-4 block">
            <Button className="w-full gap-2 btn-shine"><Crown className="h-4 w-4" /> Go Premium</Button>
          </Link>
        )}
      </div>
    </motion.div>
  )
}
