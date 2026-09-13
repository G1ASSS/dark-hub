"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Video, Flag, BadgeCheck,
  BarChart2, Settings, ClipboardList, Copyright, LayoutGrid, Layers, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/creators', label: 'Creator Verification', icon: BadgeCheck },
  { href: '/admin/videos', label: 'Video Moderation', icon: Video },
  { href: '/admin/series', label: 'Series', icon: Layers },
  { href: '/admin/categories', label: 'Categories & Covers', icon: LayoutGrid },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/payments', label: 'Premium Payments', icon: CreditCard },
  { href: '/admin/copyright', label: 'Copyright', icon: Copyright },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 bottom-0 z-40 w-64 glass border-r border-white/6 flex flex-col hidden md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-white/6">
        <Logo size={32} rounded="rounded-lg" />
        <div>
          <span className="font-semibold text-sm gradient-text">Dark Hubb</span>
          <div className="text-[10px] text-muted-foreground -mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/6">
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
