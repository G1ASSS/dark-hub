import Link from 'next/link'
import { User, Heart, History, Crown, Lock, ChevronRight } from 'lucide-react'
import { AccountHero } from '@/components/dashboard/account-hero'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Account · Dark Hubb' }

const MENU = [
  { label: 'Profile', desc: 'Name, avatar and bio', href: '/dashboard/profile', icon: User, tile: 'bg-cyan-500/10 text-cyan-300' },
  { label: 'Favorites', desc: 'Videos you hearted', href: '/dashboard/favorites', icon: Heart, tile: 'bg-rose-500/10 text-rose-300' },
  { label: 'History', desc: 'What you watched', href: '/dashboard/history', icon: History, tile: 'bg-violet-500/10 text-violet-300' },
  { label: 'Premium', desc: 'Plan and downloads', href: '/dashboard/premium', icon: Crown, tile: 'bg-amber-500/10 text-amber-300' },
  { label: 'Security', desc: 'Password, 2FA and data', href: '/dashboard/security', icon: Lock, tile: 'bg-emerald-500/10 text-emerald-300' },
]

export default function DashboardPage() {
  return (
    <div>
      <AccountHero />
      <nav aria-label="Account sections" className="space-y-3 pb-8">
        {MENU.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', m.tile)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">{m.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{m.desc}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
