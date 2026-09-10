import 'server-only'
import { redis } from '@/lib/redis/client'

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number }

/**
 * Fixed-window rate limiter. Redis first, in-memory fallback so a Redis
 * outage degrades to per-instance limiting instead of failing open or
 * taking auth/download endpoints down with it.
 */
const memory = new Map<string, { count: number; resetAt: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
}, 60_000).unref?.()

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(`rl:${key}`)
    if (count === 1) await redis.expire(`rl:${key}`, windowSeconds)
    const ttl = await redis.ttl(`rl:${key}`)
    const retryAfter = ttl > 0 ? ttl : windowSeconds
    return { allowed: count <= max, remaining: Math.max(0, max - count), retryAfterSeconds: retryAfter }
  } catch {
    const now = Date.now()
    const entry = memory.get(key)
    if (!entry || entry.resetAt <= now) {
      memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return { allowed: true, remaining: max - 1, retryAfterSeconds: windowSeconds }
    }
    entry.count += 1
    return {
      allowed: entry.count <= max,
      remaining: Math.max(0, max - entry.count),
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
}

export function rateLimitedResponse(result: RateLimitResult) {
  return Response.json(
    { error: 'Too many requests. Slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  )
}
