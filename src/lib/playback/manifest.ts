import 'server-only'

export function appBaseUrl(): string {
  const base =
    process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return base.replace(/\/$/, '')
}

type HeaderReader = { headers: { get(name: string): string | null } }

/**
 * Origin of the incoming request (phones use a LAN IP, laptops use
 * localhost). Playlist/download URLs MUST use this — an env-configured
 * host would point other devices at themselves. Falls back to the env
 * base URL when no usable Host header is present.
 */
export function requestOrigin(req: HeaderReader): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = forwardedHost || req.headers.get('host')?.trim()
  if (!host || /[\s<>]/.test(host)) return appBaseUrl()
  const proto = forwardedProto === 'https' ? 'https' : 'http'
  return `${proto}://${host}`.replace(/\/$/, '')
}

/**
 * Playlist URLs MUST be built from the incoming request's origin
 * (req.nextUrl.origin), not the env base URL — phones/tablets reach the
 * server via a LAN IP, where "localhost" would point at themselves.
 */
export function masterPlaylistUrl(videoId: string, token: string, base = appBaseUrl()): string {
  return `${base}/api/stream/${videoId}/master.m3u8?token=${encodeURIComponent(token)}`
}

export function variantPlaylistUrl(videoId: string, quality: string, token: string, base = appBaseUrl()): string {
  return `${base}/api/stream/${videoId}/${quality}/playlist.m3u8?token=${encodeURIComponent(token)}`
}

export function segmentUrl(videoId: string, quality: string, index: number, token: string, base = appBaseUrl()): string {
  return `${base}/api/stream/${videoId}/${quality}/seg/${index}?token=${encodeURIComponent(token)}`
}

export type RenditionInfo = {
  resolution: string
  bitrate: number | null
  width: number | null
  height: number | null
}

/** Rough BANDWIDTH fallback (bits/sec) when the pipeline didn't record one. */
function fallbackBandwidth(resolution: string): number {
  const h = Number(/^(\d+)\s*p$/i.exec(resolution.trim())?.[1] ?? 480)
  return Math.round(h * 1500)
}

export function buildMasterPlaylist(
  videoId: string,
  renditions: RenditionInfo[],
  token: string,
  base = appBaseUrl()
): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3']
  for (const r of renditions) {
    const bw = r.bitrate ?? fallbackBandwidth(r.resolution)
    const res = r.width && r.height ? `,RESOLUTION=${r.width}x${r.height}` : ''
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw}${res},CODECS="avc1.64001f,mp4a.40.2"`)
    lines.push(variantPlaylistUrl(videoId, r.resolution, token, base))
  }
  return lines.join('\n') + '\n'
}

export type SegmentInfo = { index: number; duration: number }

export function buildVariantPlaylist(
  videoId: string,
  quality: string,
  segments: SegmentInfo[],
  token: string,
  base = appBaseUrl()
): string {
  const target = Math.max(1, Math.ceil(Math.max(...segments.map((s) => s.duration), 1)))
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${target}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
  ]
  for (const s of segments) {
    lines.push(`#EXTINF:${s.duration.toFixed(3)},`)
    lines.push(segmentUrl(videoId, quality, s.index, token, base))
  }
  lines.push('#EXT-X-ENDLIST')
  return lines.join('\n') + '\n'
}
