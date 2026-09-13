'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Heart, History, Crown, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ACCOUNT_TABS = [
  { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: User },
  { id: 'favorites', label: 'Favorites', href: '/dashboard/favorites', icon: Heart },
  { id: 'history', label: 'History', href: '/dashboard/history', icon: History },
  { id: 'premium', label: 'Premium', href: '/dashboard/premium', icon: Crown },
  { id: 'security', label: 'Security', href: '/dashboard/security', icon: Lock },
] as const

export function AccountNav() {
  const pathname = usePathname()
  return (
    <div className="sticky top-3 z-30 -mx-4 px-4 sm:mx-0 sm:px-0">
      <motion.nav
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Account sections"
        className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-[#121218]/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
        style={{ scrollbarWidth: 'none' }}
      >
        {ACCOUNT_TABS.map((t) => {
          const Icon = t.icon
          const active = pathname === t.href
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all',
                active
                  ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </motion.nav>
    </div>
  )
}

export function AccountPageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
