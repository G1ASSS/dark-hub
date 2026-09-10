'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Download, Crown, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

/**
 * Download button with plan gating.
 * FREE / capped users always see the button — clicking it opens the
 * subscription upsell instead of failing silently. Premium users get a
 * quality picker backed by short-lived signed download URLs.
 */
export function DownloadButton({
  videoId,
  qualities,
}: {
  videoId: string
  qualities: string[]
}) {
  const [open, setOpen] = useState(false)
  const [upsell, setUpsell] = useState<null | { maxQuality: string }>(null)
  const [pendingQuality, setPendingQuality] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const requestDownload = async (quality: string) => {
    setPendingQuality(quality)
    setError(null)
    try {
      const res = await fetch('/api/download/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ videoId, quality }),
      })
      const data = (await res.json()) as { url?: string; error?: string; maxQuality?: string }
      if (res.status === 402 || data.error === 'UPGRADE_REQUIRED') {
        setOpen(false)
        setUpsell({ maxQuality: data.maxQuality ?? '480p' })
        return
      }
      if (!res.ok || !data.url) {
        setError(downloadErrorMessage(res.status, data.error));
        return
      }
      const a = document.createElement('a')
      a.href = data.url
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setDone(quality)
      setTimeout(() => setDone(null), 4000)
    } catch {
      setError('Download failed. Check your connection and try again.');
    } finally {
      setPendingQuality(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        aria-label="Download"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        <Download className="h-4 w-4" />
        Download
      </Button>

      {/* Quality picker */}
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 glass rounded-2xl border border-white/10 p-6">
            <AlertDialog.Title className="text-base font-bold mb-1">Download video</AlertDialog.Title>
            <AlertDialog.Description className="text-xs text-muted-foreground mb-4">
              Premium quality, watermarked to your account. Links expire after 10 minutes and every
              download is logged.
            </AlertDialog.Description>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {qualities.map((q) => (
                <button
                  key={q}
                  disabled={pendingQuality !== null}
                  onClick={() => requestDownload(q)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
                >
                  {pendingQuality === q ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done === q ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {q}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="text-xs text-rose-400 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 mb-4">
                {error}
              </p>
            )}
            <AlertDialog.Cancel asChild>
              <button className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </AlertDialog.Cancel>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Subscription upsell for free users */}
      <AlertDialog.Root open={upsell !== null} onOpenChange={(v) => !v && setUpsell(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 glass rounded-2xl border border-violet-500/25 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <AlertDialog.Title className="text-lg font-bold mb-1">Downloads are Premium</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-1">
              Free streaming is unlimited — but downloads need Premium.
            </AlertDialog.Description>
            <p className="text-xs text-muted-foreground mb-5">
              Your plan streams up to {upsell?.maxQuality}. Premium unlocks 720p/1080p downloads.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/premium"
                className="flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all"
              >
                <Crown className="h-4 w-4" />
                Go Premium
              </Link>
              <AlertDialog.Cancel asChild>
                <button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Keep streaming free
                </button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}

function downloadErrorMessage(status: number, code?: string): string {
  if (status === 401) return 'Sign in to download videos.'
  if (status === 429) return 'Daily download limit reached. Try again tomorrow or upgrade.'
  if (status === 404) return 'This quality is not available for download yet.'
  if (code === 'QUALITY_NOT_ALLOWED') return 'This quality is not included in your plan.'
  return 'Download unavailable right now. Try again later.'
}
