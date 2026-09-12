"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ShieldCheck, AlertTriangle, ChevronRight, EyeOff, Lock, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgeGateProps {
  onConfirm: () => void
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [posters, setPosters] = useState<string[]>([])

  // Real catalog posters drift behind the sheet
  useEffect(() => {
    fetch('/api/videos?sort=most_viewed&pageSize=6')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const urls = (d?.data ?? []).map((v: { thumbnailUrl: string }) => v.thumbnailUrl).filter(Boolean)
        if (urls.length > 0) setPosters(urls)
      })
      .catch(() => {})
  }, [])

  const handleConfirm = async () => {
    if (!checked || loading) return
    setLoading(true)
    try { await fetch('/api/age-gate', { method: 'POST' }) } catch {}
    setTimeout(() => { setLoading(false); onConfirm() }, 350)
  }

  const toggle = () => setChecked((prev) => !prev)

  return (
    <div className="age-gate-overlay fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      {posters.length > 0 && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="animate-kenburns grid h-full w-full grid-cols-3 gap-2 opacity-20">
            {[...posters, ...posters].slice(0, 9).map((src, i) => (
              <div key={i} className="relative min-h-[33vh]">
                <Image src={src} alt="" fill className="object-cover" unoptimized sizes="33vw" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/60 via-[#0A0A0F]/70 to-[#0A0A0F]" aria-hidden="true" />
      <div className="bg-orb-1" aria-hidden="true" />
      <div className="bg-orb-2" aria-hidden="true" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '104%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 210, damping: 30 }}
        className="liquid-glass relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] border border-white/12 p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:max-w-[430px] sm:rounded-[32px] sm:p-8"
        style={{
          boxShadow: '0 -20px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 1px rgba(255,255,255,0.25)',
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />

        {/* Header row */}
        <div className="mb-5 flex items-center gap-3.5">
          <div className="animate-pulse-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary">
            <span className="text-2xl font-extrabold text-white">V</span>
          </div>
          <div className="min-w-0 text-left">
            <h1 className="gradient-text animate-gradient-x text-[22px] font-extrabold leading-tight">
              Dark Hubb
            </h1>
            <p className="text-xs text-white/45">Premium Adult Streaming</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-500">18+</span>
          </div>
        </div>

        <p className="mb-5 text-left text-[13px] leading-relaxed text-white/55">
          This site contains adult content. By entering you confirm you meet the
          minimum age requirement in your jurisdiction.
        </p>

        {/* Confirm row with iOS switch */}
        <div
          onClick={toggle}
          className="mb-4 flex cursor-pointer items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left select-none"
          style={{ WebkitTapHighlightColor: 'rgba(125,60,220,0.15)', touchAction: 'manipulation' }}
        >
          <button
            role="switch"
            aria-checked={checked}
            aria-label="Confirm you are 18 or older"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); toggle() }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                toggle()
              }
            }}
            className={cn(
              'relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200',
              checked ? 'gradient-primary' : 'bg-white/15'
            )}
          >
            <motion.span
              animate={{ x: checked ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-[3px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white shadow"
            >
              {checked && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="check-draw" />
                </svg>
              )}
            </motion.span>
          </button>
          <p className="m-0 text-[13px] leading-relaxed text-white/75">
            I am <strong className="text-white">18 years or older</strong> and agree to the{' '}
            <Link
              href="/legal/terms-of-service"
              onClick={(e) => e.stopPropagation()}
              className="text-violet-400 underline hover:text-violet-300"
            >
              Terms
            </Link>
            {' & '}
            <Link
              href="/legal/privacy-policy"
              onClick={(e) => e.stopPropagation()}
              className="text-violet-400 underline hover:text-violet-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Enter */}
        <button
          onClick={handleConfirm}
          disabled={!checked || loading}
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all duration-200',
            checked
              ? 'btn-shine animate-pulse-glow gradient-primary cursor-pointer text-white active:scale-[0.98]'
              : 'cursor-not-allowed bg-white/[0.06] text-white/25'
          )}
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Enter Dark Hubb <ChevronRight size={18} /></>
          )}
        </button>

        {/* Exit */}
        <button
          onClick={() => window.location.assign('https://www.google.com')}
          className="mt-1 w-full cursor-pointer border-none bg-transparent py-3 text-xs text-white/35 transition-colors hover:text-white/60"
          style={{ touchAction: 'manipulation' }}
        >
          I am under 18 — Exit
        </button>

        {/* Trust row */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-white/30">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Private
          </span>
          <span className="flex items-center gap-1.5">
            <EyeOff className="h-3 w-3" /> No tracking
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Encrypted
          </span>
        </div>
      </motion.div>
    </div>
  )
}
