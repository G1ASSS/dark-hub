'use client'

/**
 * Tiny client fetch cache: repeat visits (back button, tab switches)
 * render instantly from memory instead of refetching. TTL-guarded,
 * GET-only, same-origin JSON.
 */
type Entry = { at: number; data: unknown }

const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

export async function fetchCached<T>(url: string, ttlMs = 60_000): Promise<T | null> {
  const now = Date.now()
  const hit = cache.get(url)
  if (hit && now - hit.at < ttlMs) return hit.data as T

  const ongoing = inflight.get(url)
  if (ongoing) return (await ongoing) as T | null

  const job = (async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const data = (await res.json()) as T
      cache.set(url, { at: Date.now(), data })
      return data
    } catch {
      return null
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, job)
  return job
}

export function bustFetchCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k)
}
