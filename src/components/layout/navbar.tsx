"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, LogIn, LayoutDashboard, Zap } from 'lucide-react'

const NAV_LINKS = [
  { href: '/home',       label: 'Browse' },
  { href: '/categories', label: 'Categories' },
  { href: '/search',     label: 'Search' },
]

const pillStyle = {
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.10) 100%)',
  backdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%) brightness(1.12)',
  boxShadow: [
    'inset 0 1px 1px rgba(255,255,255,0.35)',
    'inset 0 -1px 1px rgba(0,0,0,0.18)',
    '0 0 0 0.5px rgba(255,255,255,0.16)',
    '0 12px 40px rgba(0,0,0,0.45)',
  ].join(', '),
  borderRadius: '999px',
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const closeMenu = () => setMobileOpen(false)

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex flex-col items-center pointer-events-none"
      style={{ padding: '12px 16px 0' }}
    >
      {/* Main pill */}
      <header
        className="pointer-events-auto relative w-full"
        style={{ maxWidth: 1200, ...pillStyle }}
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
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 25%, rgba(255,255,255,0.70) 50%, rgba(255,255,255,0.55) 75%, transparent)',
            pointerEvents: 'none',
          }}
        />

        <div className="relative flex h-[50px] items-center justify-between px-4">

          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center group-hover:scale-105 transition-transform duration-200"
              style={{
                borderRadius: '12px',
                background: 'linear-gradient(135deg, hsl(258,85%,65%), hsl(190,100%,55%))',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.18) inset, 0 4px 12px rgba(100,60,220,0.35)',
              }}
            >
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
            <span
              className="text-[17px] font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, hsl(258,85%,72%), hsl(190,100%,65%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Dark Hubb
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-1.5 text-sm font-medium transition-colors duration-200"
                  style={{
                    color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.50)',
                    borderRadius: '999px',
                    background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                    boxShadow: active
                      ? '0 0 0 0.5px rgba(255,255,255,0.20), inset 0 1px 1px rgba(255,255,255,0.30)'
                      : 'none',
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="md:hidden flex h-8 w-8 items-center justify-center"
              style={{ borderRadius: '999px' }}
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px] text-white/55" />
            </Link>

            <Link
              href="/dashboard"
              className="hidden md:flex h-8 w-8 items-center justify-center hover:bg-white/8 transition-colors"
              style={{ borderRadius: '999px' }}
              aria-label="Dashboard"
            >
              <LayoutDashboard className="h-[17px] w-[17px] text-white/55" />
            </Link>

            {/* Sign In — glass button matching nav pill */}
            <Link href="/login">
              <div
                className="flex items-center gap-1.5 px-3.5 h-8 text-[13px] font-semibold cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all duration-150"
                style={{
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, hsl(258,85%,65%), hsl(190,100%,55%))',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.18) inset, 0 4px 14px rgba(100,60,220,0.35)',
                  color: 'white',
                }}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </div>
            </Link>

            <button
              className="md:hidden flex h-8 w-8 items-center justify-center text-white/55 hover:text-white transition-colors"
              style={{ borderRadius: '999px' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="pointer-events-auto w-full mt-1.5 overflow-hidden animate-slide-up"
          style={{ maxWidth: 1200, ...pillStyle, borderRadius: '24px' }}
        >
          <nav className="px-3 py-2 space-y-0.5" onClick={closeMenu}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-4 py-3 text-sm font-medium transition-all"
                style={{
                  borderRadius: '13px',
                  color: pathname.startsWith(link.href) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                  background: pathname.startsWith(link.href) ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-3 text-sm font-medium transition-all"
              style={{ borderRadius: '13px', color: 'rgba(255,255,255,0.55)' }}
            >
              Dashboard
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
