import 'server-only'

/**
 * Watermarking, two layers:
 *
 * 1. FORENSIC (always on): every download token carries {username, timestamp}
 *    and every download is audit-logged with IP + user agent. This traces
 *    leaks back to an account without touching the bytes.
 *
 * 2. BURN-IN (optional job): visible user-id overlay via FFmpeg drawtext,
 *    for high-risk content. Heavy (per-download transcode), so it belongs
 *    in an async job — `burnInArgs()` below builds the filter; the worker
 *    calls it only when WATERMARK_BURN_IN=true.
 */

export type ForensicMark = { u: string; t: number }

export function forensicMark(username: string): ForensicMark {
  return { u: username, t: Date.now() }
}

/** drawtext filter args overlaying "user • timestamp" bottom-right. */
export function burnInArgs(username: string): string[] {
  const font = process.env.WATERMARK_FONT_PATH
  if (!font) {
    throw new Error('WATERMARK_FONT_PATH is not set — burn-in needs an explicit font file.')
  }
  const text = `${username} • %{localtime\\:%Y-%m-%d %H\\\\:%M}`
  return [
    '-vf',
    `drawtext=fontfile=${font}:text='${text}':fontsize=18:fontcolor=white@0.55:x=w-text_w-16:y=h-text_h-12`,
  ]
}

export function burnInEnabled(): boolean {
  return (process.env.WATERMARK_BURN_IN ?? 'false').toLowerCase() === 'true'
}
