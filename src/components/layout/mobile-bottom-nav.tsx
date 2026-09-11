"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Grid3X3, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { href: '/home',       icon: Home,    label: 'Home'    },
  { href: '/search',     icon: Search,  label: 'Search'  },
  { href: '/categories', icon: Grid3X3, label: 'Browse'  },
  { href: '/dashboard',  icon: User,    label: 'Account' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingLeft: 16, paddingRight: 16 }}
    >
      {/* Floating glass slab */}
      <nav
        className="pointer-events-auto relative flex items-center gap-1 px-2 py-2"
        style={{
          borderRadius: '32px',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.10) 100%)',
          backdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
          boxShadow: [
            'inset 0 1px 1px rgba(255,255,255,0.35)',
            'inset 0 -1px 1px rgba(0,0,0,0.18)',
            '0 0 0 0.5px rgba(255,255,255,0.16)',
            '0 12px 40px rgba(0,0,0,0.5)',
          ].join(', '),
        }}
        aria-label="Main navigation"
      >
        {/* Refraction sheen */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background:
              'linear-gradient(115deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 30%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        {/* Top specular streak */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 1,
            left: '12%',
            right: '12%',
            height: '1px',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.70) 50%, rgba(255,255,255,0.55) 70%, transparent)',
            pointerEvents: 'none',
          }}
        />

        {NAV.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-[3px] select-none"
              style={{ width: 68, height: 52, borderRadius: 22 }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* White frosted glass active bubble */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="nav-bubble"
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    style={{
                      borderRadius: 22,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.12) 100%)',
                      border: '0.5px solid rgba(255,255,255,0.32)',
                      boxShadow: [
                        'inset 0 1px 1px rgba(255,255,255,0.45)',
                        'inset 0 -1px 1px rgba(0,0,0,0.08)',
                        '0 4px 16px rgba(0,0,0,0.25)',
                      ].join(', '),
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ position: 'relative', zIndex: 10 }}
              >
                <Icon
                  style={{
                    width: 22,
                    height: 22,
                    color: active ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.40)',
                    strokeWidth: active ? 2.2 : 1.7,
                    filter: active ? 'drop-shadow(0 0 6px rgba(255,255,255,0.55))' : 'none',
                    transition: 'color 0.2s, filter 0.2s',
                  }}
                />
              </motion.div>

              {/* Label */}
              <span
                style={{
                  position: 'relative',
                  zIndex: 10,
                  fontSize: 10,
                  fontWeight: 600,
                  color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.36)',
                  transition: 'color 0.2s',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
