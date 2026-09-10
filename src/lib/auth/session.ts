import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

export type SessionPayload = {
  userId: string
  role: string
  expiresAt: Date
}

function getKey() {
  const secretKey = process.env.SESSION_SECRET
  if (!secretKey) {
    throw new Error('SESSION_SECRET is not set. Generate one with `openssl rand -base64 32`.')
  }
  return new TextEncoder().encode(secretKey)
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey())
}

export async function decrypt(session: string | undefined = '') {
  if (!session) return null
  try {
    const { payload } = await jwtVerify(session, getKey(), {
      algorithms: ['HS256'],
    })
    if (!payload.userId || !payload.expiresAt) return null
    return payload as unknown as SessionPayload & { userId: string }
  } catch {
    return null
  }
}
