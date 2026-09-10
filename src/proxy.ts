import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth/session'

// Routes that require age confirmation
const AGE_GATED_PATHS = ['/home', '/search', '/watch', '/creator', '/categories', '/upload', '/dashboard']
// Routes that require authentication
const AUTH_REQUIRED_PATHS = ['/dashboard', '/upload']
// Routes that require admin role
const ADMIN_PATHS = ['/admin']
const STAFF_ROLES = ['ADMIN', 'MODERATOR']

function securityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for hls.js worker; tighten in prod
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://cdn.yourdomain.com",
      "media-src 'self' blob: https://test-streams.mux.dev https://cdn.yourdomain.com",
      "connect-src 'self' https://cdn.yourdomain.com https://test-streams.mux.dev",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}

// Optimistic check only: verifies JWT signature/expiry from the cookie.
// Authoritative checks (isActive/isBanned/current role) happen in the DAL
// close to the data source. See src/lib/auth/dal.ts.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  securityHeaders(res)

  // ── Skip proxy for API, static, Next.js internals ─────────────────────
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2)$/)
  ) {
    return res
  }

  // ── Age Gate Check ────────────────────────────────────────────────────
  const isAgeGated = AGE_GATED_PATHS.some((p) => pathname.startsWith(p))
  if (isAgeGated) {
    const ageConfirmed = req.cookies.get('age_confirmed')?.value === '1'
    if (!ageConfirmed) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── Optimistic session check (verified JWT, no DB) ────────────────────
  const session = await decrypt(req.cookies.get('session')?.value)
  const userId = session?.userId

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && userId) {
    return NextResponse.redirect(new URL('/home', req.nextUrl))
  }

  // ── Auth Check ────────────────────────────────────────────────────────
  const requiresAuth = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p))
  if (requiresAuth && !userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // ── Admin Access Check (optimistic role gate; DAL enforces) ───────────
  const requiresAdmin = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  if (requiresAdmin) {
    if (!userId) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (!session?.role || !STAFF_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL('/home', req.nextUrl))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
