import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Short-lived playback/download authorization tokens.
 * HLS players and download links can't send Authorization headers, so
 * authorization travels as a signed `token` query param with a tight
 * expiry (minutes, not hours). Every use re-validates the token AND
 * re-checks the user's subscription from the DB — a revoked or expired
 * plan stops working within minutes.
 */

export type PlaybackKind = 'stream' | 'download'

export type PlaybackClaims = {
  videoId: string
  userId: string
  kind: PlaybackKind
  /** Rendition label (e.g. "720p"); absent = master playlist */
  quality?: string
  /** Forensic watermark payload (username + timestamp, logged on download) */
  wm?: { u: string; t: number }
}

function getKey() {
  const secret = process.env.PLAYBACK_SECRET ?? process.env.SESSION_SECRET
  if (!secret) throw new Error('PLAYBACK_SECRET (or SESSION_SECRET) is not set')
  return new TextEncoder().encode(secret)
}

export async function signPlaybackToken(claims: PlaybackClaims, ttlSeconds: number): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getKey())
}

export async function verifyPlaybackToken(token: string): Promise<PlaybackClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    if (typeof payload.videoId !== 'string' || typeof payload.userId !== 'string') return null
    if (payload.kind !== 'stream' && payload.kind !== 'download') return null
    return payload as unknown as PlaybackClaims
  } catch {
    return null
  }
}

export const STREAM_TOKEN_TTL_SECONDS = Number(process.env.STREAM_TOKEN_TTL_SECONDS ?? 900) // 15 min
export const DOWNLOAD_TOKEN_TTL_SECONDS = Number(process.env.DOWNLOAD_TOKEN_TTL_SECONDS ?? 600) // 10 min
