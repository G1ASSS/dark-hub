import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { getSessionCookie, decrypt } from './cookies'

export type VerifiedSession = {
  isAuth: true
  userId: string
  role: string
}

/**
 * Secure session check — verifies the JWT, then confirms the user
 * still exists, is active, and is not banned. Use in pages,
 * Server Actions, and Route Handlers (never trust the JWT alone).
 */
export const verifySession = cache(async (): Promise<VerifiedSession | null> => {
  const cookie = await getSessionCookie()
  const payload = await decrypt(cookie)

  if (!payload?.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true, isBanned: true },
  })

  if (!user || !user.isActive || user.isBanned) return null

  // Role from DB is authoritative (proxy only sees the JWT claim)
  return { isAuth: true, userId: user.id, role: user.role }
})

export const getUser = cache(async () => {
  const session = await verifySession()
  if (!session) return null

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      profile: { select: { displayName: true, avatarUrl: true, bio: true, website: true, location: true } },
    },
  })
})

/** Redirects to /login when unauthenticated. */
export async function requireSession(): Promise<VerifiedSession> {
  const session = await verifySession()
  if (!session) redirect('/login')
  return session
}

const ADMIN_ROLES = ['ADMIN', 'MODERATOR']

/** Redirects to /login (unauthenticated) or /home (non-staff). */
export async function requireAdmin(): Promise<VerifiedSession> {
  const session = await requireSession()
  if (!ADMIN_ROLES.includes(session.role)) redirect('/home')
  return session
}
