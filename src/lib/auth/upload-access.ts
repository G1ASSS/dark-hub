import 'server-only'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifySession, type VerifiedSession } from './dal'

/**
 * Owner-only upload gate.
 *
 * The upload UI + API previously allowed any ADMIN/MODERATOR (layout) and,
 * worse, any logged-in user hitting the API directly (routes only checked
 * verifySession). For a single-owner site this locks everything to you:
 *
 *   UPLOAD_OWNER_EMAILS="you@example.com"  (comma-separated, optional)
 *
 * - When set: only those emails (case-insensitive) may upload, regardless
 *   of role. Everyone else gets 403 / redirect to /home.
 * - When unset: only role ADMIN may upload (MODERATOR is excluded).
 *
 * The user's email is read from the DB (authoritative), not the JWT claim.
 */
function allowlist(): string[] {
  const raw =
    process.env.UPLOAD_OWNER_EMAILS ?? process.env.OWNER_EMAIL ?? process.env.ADMIN_EMAIL ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function isUploader(session: VerifiedSession): Promise<boolean> {
  const owners = allowlist()
  if (owners.length === 0) {
    // No allowlist configured — ADMIN role only (not MODERATOR).
    return session.role === 'ADMIN'
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  })
  return !!user?.email && owners.includes(user.email.toLowerCase())
}

/** API guard: 401 when signed out, 403 when not the owner. */
export async function requireUploader(): Promise<VerifiedSession> {
  const session = await verifySession()
  if (!session) {
    // Throw a JSON-friendly error — route handlers turn this into 401.
    const err = new Error('Sign in to upload.') as Error & { status?: number }
    err.status = 401
    throw err
  }
  if (!(await isUploader(session))) {
    const err = new Error('Uploads are restricted to the site owner.') as Error & { status?: number }
    err.status = 403
    throw err
  }
  return session
}

/** Layout/page guard: redirects to /login (anon) or /home (non-owner). */
export async function requireUploaderPage(): Promise<VerifiedSession> {
  const session = await verifySession()
  if (!session) redirect('/login')
  if (!(await isUploader(session))) redirect('/home')
  return session
}

/** Map requireUploader() throws to {status, message} for route handlers. */
export function uploaderErrorStatus(err: unknown): { status: number; message: string } {
  const status = (err as { status?: number } | null)?.status
  if (status === 401) return { status: 401, message: 'Sign in to upload.' }
  if (status === 403) return { status: 403, message: 'Uploads are restricted to the site owner.' }
  throw err
}
