import 'server-only'
import { cookies } from 'next/headers'
import { encrypt, decrypt } from './session'

const COOKIE_NAME = 'session'

export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSessionCookie() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export { decrypt }
