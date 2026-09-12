"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, AlertTriangle, ChevronRight, EyeOff, Lock, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgeGateProps {
  onConfirm: () => void
}

const card = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [posters, setPosters] = useState<string[]>([])

  // Real catalog posters drift behind the card
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
    <div className="age-gate-overlay fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
      {/* Poster collage backdrop */}
      {posters.length > 0 && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="animate-kenburns grid h-full w-full grid-cols-3 gap-2 opacity-[0.16]">
            {[...posters, ...posters].slice(0, 9).map((src, i) => (
              <div key={i} className="relative min-h-[33vh]">
                <Image src={src} alt="" fill className="object-cover" unoptimized sizes="33vw" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/70 via-[#0A0A0F]/80 to-[#0A0A0F]" />
        </div>
      )}
      <div className="bg-orb-1" aria-hidden="true" />
      <div className="bg-orb-2" aria-hidden="true" />

      <motion.div variants={card} initial="hidden" animate="show" className="relative w-full max-w-[420px] py-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.8)] backdrop-blur-[40px]"
        >
          {/* Logo */}
          <motion.div variants={item} className="mb-5 flex justify-center">
            <div className="animate-pulse-ring animate-float flex h-16 w-16 items-center justify-center rounded-[20px] gradient-primary">
              <span className="text-[26px] font-extrabold text-white">V</span>
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="gradient-text animate-gradient-x mb-1 text-[26px] font-extrabold"
          >
            Dark Hubb
          </motion.h1>
          <motion.p variants={item} className="mb-6 text-[13px] text-white/45">
            Premium Adult Streaming
          </motion.p>

          {/* Warning */}
          <motion.div
            variants={item}
            className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3"
          >
            <div className="mb-1.5 flex items-center justify-center gap-2">
              <AlertTriangle className="h-[15px] w-[15px] text-amber-500" />
              <span className="text-[13px] font-bold text-amber-500">Adults Only — 18+</span>
            </div>
            <p className="m-0 text-xs leading-relaxed text-amber-200/60">
              This site contains adult content for adults 18+ only. By entering you confirm you meet the
              minimum age requirement in your jurisdiction.
            </p>
          </motion.div>

          {/* Tap card */}
          <motion.div variants={item}>
            <div
              onClick={toggle}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  toggle()
                }
              }}
              className={cn(
                'mb-5 flex cursor-pointer items-center gap-4 rounded-[20px] p-[18px] text-left transition-all duration-200 select-none',
                checked
                  ? 'border-[1.5px] border-violet-500/50 shadow-[0_0_0_4px_rgba(125,60,220,0.12)]'
                  : 'border-[1.5px] border-white/10 hover:border-white/20'
              )}
              style={{
                background: checked
                  ? 'linear-gradient(135deg, rgba(125,60,220,0.20), rgba(0,200,230,0.12))'
                  : 'rgba(255,255,255,0.04)',
                WebkitTapHighlightColor: 'rgba(125,60,220,0.15)',
                touchAction: 'manipulation',
              }}
            >
              <motion.div
                animate={checked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  checked ? 'gradient-primary shadow-[0_4px_20px_rgba(125,60,220,0.45)]' : 'border-2 border-white/20 bg-white/[0.07]'
                )}
              >
                <AnimatePresence>
                  {checked && (
                    <motion.svg
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" className="check-draw" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.div>

              <p className="m-0 text-sm leading-relaxed text-white/80">
                I confirm I am <strong className="text-white">18 years or older</strong>, agree to the{' '}
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
                , and understand this site contains adult content.
              </p>
            </div>
          </motion.div>

          {/* Enter */}
          <motion.div variants={item}>
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
          </motion.div>

          {/* Exit */}
          <motion.button
            variants={item}
            onClick={() => window.location.assign('https://www.google.com')}
            className="mt-1 w-full cursor-pointer border-none bg-transparent py-3 text-xs text-white/35 hover:text-white/60 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            I am under 18 — Exit
          </motion.button>

          {/* Trust row */}
          <motion.div variants={item} className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/30">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Private
            </span>
            <span className="flex items-center gap-1.5">
              <EyeOff className="h-3 w-3" /> No tracking
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Encrypted
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
