'use client'
import { useState } from 'react'
import { Crown, Check, Loader2 } from 'lucide-react'

/** Starts checkout for a paid plan; surfaces provider instructions. */
export function SubscribeButton({ planSlug, planName }: { planSlug: string; planName: string }) {
  const [pending, setPending] = useState(false)
  const [instructions, setInstructions] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subscribe = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planSlug }),
      })
      const data = (await res.json()) as { checkoutUrl?: string; instructions?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Checkout failed. Try again later.')
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setInstructions(data.instructions ?? 'Checkout started. Follow the emailed instructions.')
    } catch {
      setError('Checkout failed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button
        onClick={subscribe}
        disabled={pending || instructions !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : instructions ? <Check className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
        {instructions ? `${planName} checkout started` : `Get ${planName}`}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-400">{error}</p>}
      {instructions && (
        <p className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-200">
          {instructions}
        </p>
      )}
    </div>
  )
}
