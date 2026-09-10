import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
  client.on('error', (err: Error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Redis] Connection error:', err.message)
    }
  })
  return client
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient()
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export async function getCached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key).catch(() => null)
  if (cached) return JSON.parse(cached) as T
  const fresh = await fn()
  await redis.setex(key, ttl, JSON.stringify(fresh)).catch(() => {})
  return fresh
}

export async function invalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern).catch(() => [] as string[])
  if (keys.length > 0) await redis.del(...keys).catch(() => {})
}
