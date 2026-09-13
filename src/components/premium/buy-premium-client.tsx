'use client'
import { useState, useEffect, useRef, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Check, X, QrCode, Upload, Download,
  Loader2, Receipt, Ban, Expand, Smartphone, ScanLine,
  Banknote, CheckCircle2, Play, Zap, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CountUp } from '@/components/ui/count-up'
import { submitPaymentAction, cancelPaymentAction } from '@/actions/premium-payments'
import {
  PREMIUM_PRICE, formatMMK, MANUAL_PAY_METHODS, getPayMethod,
  paymentStatusLabel, type ManualPayMethodId,
} from '@/lib/premium-payments'
import { MethodLogo } from './method-logo'
import { cn } from '@/lib/utils'

export type PaymentRow = {
  id: string
  methodId: string
  methodName: string
  amount: number
  status: string
  transactionRef: string | null
  hasScreenshot: boolean
  rejectionReason: string | null
  createdAt: string
}

export type BuyPremiumInitial = {
  planName: string
  isPremium: boolean
  expiresAt: string | null
  periodDays: number
  payments: PaymentRow[]
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  APPROVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  SUCCEEDED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REJECTED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  FAILED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  CANCELED: 'border-white/15 bg-white/5 text-white/50',
}

const PERKS = [
  { icon: Play, label: 'Full 1080p' },
  { icon: Download, label: 'Downloads' },
  { icon: Zap, label: 'Priority access' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BuyPremiumClient({ initial }: { initial: BuyPremiumInitial }) {
  const router = useRouter()
  const [methodId, setMethodId] = useState<ManualPayMethodId | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitState, submitAction, submitPending] = useActionState(submitPaymentAction, undefined)
  const [cancelling, startCancel] = useTransition()
  const wasSubmitted = useRef(false)

  const method = methodId ? getPayMethod(methodId) : undefined
  const pendingPayment = initial.payments.find((p) => p.status === 'PENDING') ?? null

  // After a successful submit, reload server data once: the new PENDING
  // payment arrives via props and the form swaps to the pending banner.
  useEffect(() => {
    const ok = !!submitState && 'ok' in submitState
    if (ok && !wasSubmitted.current) router.refresh()
    wasSubmitted.current = ok
  }, [submitState, router])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox])

  const cancel = (id: string) => {
    startCancel(async () => {
      const res = await cancelPaymentAction(id)
      if (!('error' in res)) router.refresh()
    })
  }

  const steps = method
    ? [
        { icon: Smartphone, text: `Open ${method.appName}.` },
        { icon: ScanLine, text: 'Scan the QR code.' },
        { icon: Banknote, text: `Pay ${formatMMK(PREMIUM_PRICE)}.` },
        { icon: CheckCircle2, text: 'Complete the payment.' },
        { icon: Receipt, text: 'Submit your payment information below.' },
      ]
    : []

  return (
    <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {/* ── Aurora background ──────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -top-24 left-1/2 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl"
          animate={{ x: ['-50%', 'calc(-50% - 48px)', '-50%'], y: [0, 32, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -top-10 right-[8%] h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl"
          animate={{ x: [0, -36, 0], y: [0, 28, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-24 left-[6%] h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -24, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative text-center mb-8">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="relative mx-auto mb-5 h-20 w-20"
        >
          <motion.div
            className="absolute inset-0 rounded-[26px] gradient-primary"
            animate={{ rotate: [0, -7, 7, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Crown className="h-9 w-9 text-white drop-shadow-lg" />
          </div>
          <motion.span
            className="absolute -right-2 -top-2 text-amber-300"
            animate={{ y: [0, -6, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">DarkHubb Premium</p>
          <p className="mt-2 text-4xl sm:text-5xl font-bold gradient-text tabular-nums">
            <CountUp value={PREMIUM_PRICE} /> MMK
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock Premium features · {initial.periodDays} days · pay with your bank app
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {PERKS.map((p, i) => {
              const Icon = p.icon
              return (
                <motion.span
                  key={p.label}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-300" /> {p.label}
                </motion.span>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Active banner ──────────────────────────────── */}
      {initial.isPremium && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center"
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            aria-hidden="true"
          />
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-300">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/25"
            >
              <Check className="h-4 w-4" />
            </motion.span>
            PREMIUM ACTIVE
          </p>
          <p className="mt-1 text-xs text-emerald-200/70">
            Your Premium membership is now active.
            {initial.expiresAt && <> Valid until {formatDate(initial.expiresAt)}.</>}
          </p>
        </motion.div>
      )}

      {/* ── Pending banner ─────────────────────────────── */}
      {pendingPayment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
                <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
              </span>
              <div>
                <p className="font-bold text-amber-300">PENDING VERIFICATION</p>
                <p className="mt-0.5 text-xs text-amber-200/70">
                  Your {pendingPayment.methodName} payment of {formatMMK(pendingPayment.amount)} has been
                  submitted and is waiting for verification.
                  {pendingPayment.transactionRef && <> Ref: <span className="font-mono">{pendingPayment.transactionRef}</span>.</>}
                </p>
              </div>
            </div>
            <Button
              variant="outline" size="sm" disabled={cancelling}
              onClick={() => cancel(pendingPayment.id)}
              className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Method selection ───────────────────────────── */}
      {!pendingPayment && (
        <>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Select payment method
          </h2>
          <div className="grid gap-3">
            {MANUAL_PAY_METHODS.map((m, i) => {
              const active = methodId === m.id
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.09, type: 'spring', stiffness: 200, damping: 22 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMethodId(m.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                    active
                      ? 'border-violet-500/60 bg-violet-500/[0.08]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="pay-method-glow"
                      className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_36px_-8px] shadow-violet-500/50"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <MethodLogo method={m} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold">{m.name}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-muted-foreground tabular-nums">
                      {formatMMK(PREMIUM_PRICE)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      active ? 'border-transparent gradient-primary' : 'border-white/20'
                    )}
                  >
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        >
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* ── QR + instructions + submit ─────────────── */}
          <AnimatePresence mode="wait" initial={false}>
            {method && (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
              >
                <div
                  className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <MethodLogo method={method} size="h-11 w-11" rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold">Pay with {method.name}</h3>
                      <p className="text-xs text-muted-foreground">Scan the code with {method.appName}</p>
                    </div>
                    <span className="shrink-0 text-lg font-bold gradient-text tabular-nums">{formatMMK(PREMIUM_PRICE)}</span>
                  </div>

                  {/* Scan-frame QR */}
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="group relative mx-auto mt-5 block w-full max-w-sm"
                    aria-label={`Enlarge ${method.name} QR code`}
                  >
                    <span className="absolute -left-1.5 -top-1.5 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-cyan-300" aria-hidden="true" />
                    <span className="absolute -right-1.5 -top-1.5 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-cyan-300" aria-hidden="true" />
                    <span className="absolute -bottom-1.5 -left-1.5 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-cyan-300" aria-hidden="true" />
                    <span className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-cyan-300" aria-hidden="true" />
                    <span className="relative block overflow-hidden rounded-2xl bg-white">
                      <Image
                        src={method.qr}
                        alt={`${method.name} payment QR code`}
                        width={800}
                        height={800}
                        className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
                        priority={false}
                      />
                      {/* one-time shine sweep (decorative, outside the code area timing) */}
                      <motion.span
                        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: '-120%' }}
                        animate={{ x: '420%' }}
                        transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.35 }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <Expand className="h-3.5 w-3.5" /> Tap to enlarge
                    </span>
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Scan or tap the QR code to make payment.
                  </p>

                  {/* Steps timeline */}
                  <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                      Pay with {method.name}
                    </p>
                    <ol className="space-y-1">
                      {steps.map((s, si) => {
                        const Icon = s.icon
                        const last = si === steps.length - 1
                        return (
                          <motion.li
                            key={s.text}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + si * 0.08, duration: 0.3 }}
                            className="relative flex items-center gap-3 pb-3 last:pb-0"
                          >
                            {!last && (
                              <span className="absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-violet-500/40 to-transparent" aria-hidden="true" />
                            )}
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
                              <Icon className="h-[18px] w-[18px] text-violet-300" />
                            </span>
                            <span className="text-sm text-white/85">
                              <span className="mr-2 font-bold text-violet-300/80 tabular-nums">{si + 1}</span>
                              {s.text}
                            </span>
                          </motion.li>
                        )
                      })}
                    </ol>
                  </div>

                  <form action={submitAction} className="mt-5 space-y-4">
                    <input type="hidden" name="method" value={method.id} />
                    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground"><Receipt className="h-4 w-4" /> Payment Method</span>
                        <span className="font-semibold">{method.name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold gradient-text tabular-nums">{formatMMK(PREMIUM_PRICE)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="txid">Transaction last 5 digit ID / Reference</Label>
                      <Input id="txid" name="transactionId" placeholder="e.g. 83421" required minLength={4} maxLength={64} autoComplete="off" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="shot">Payment Screenshot</Label>
                      <label
                        htmlFor="shot"
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-sm text-muted-foreground transition-colors hover:border-violet-400/50 hover:text-foreground"
                      >
                        {fileName ? <Check className="h-4 w-4 shrink-0 text-emerald-400" /> : <Upload className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{fileName ?? 'Upload screenshot (JPEG, PNG or WebP, ≤5MB)'}</span>
                      </label>
                      <input
                        id="shot" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp"
                        className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                      />
                    </div>
                    {submitState && 'error' in submitState && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="alert"
                        className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                      >
                        {submitState.error}
                      </motion.p>
                    )}
                    {submitState && 'ok' in submitState && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Payment submitted — waiting for verification.
                      </p>
                    )}
                    <Button type="submit" loading={submitPending} className="w-full gap-2 btn-shine py-3 text-[15px]">
                      {submitPending ? null : <Receipt className="h-4 w-4" />} Submit Payment
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Status stays PENDING until an admin verifies your payment.
                    </p>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── QR lightbox ────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && method && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${method.name} QR code enlarged`}
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-[min(92vw,440px)] rounded-3xl border border-white/15 bg-[#121218] p-4 shadow-2xl shadow-violet-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <MethodLogo method={method} size="h-9 w-9" rounded="rounded-lg" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold">
                  {method.name} · <span className="tabular-nums">{formatMMK(PREMIUM_PRICE)}</span>
                </p>
                <button
                  onClick={() => setLightbox(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white">
                <Image src={method.qr} alt={`${method.name} payment QR code`} width={880} height={880} className="h-auto w-full" />
              </div>
              <a
                href={method.qr}
                download={`${method.id}-qr.jpg`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                <Download className="h-4 w-4" /> Download QR
              </a>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <QrCode className="h-3.5 w-3.5" /> Point your {method.appName} scanner at the code
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Payment history ────────────────────────────── */}
      <div className="mt-10" id="history">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Payment history</h2>
        {initial.payments.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.07] p-5 text-center text-sm text-muted-foreground">
            No payments yet. Your submissions will appear here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {initial.payments.map((p, i) => {
              const m = getPayMethod(p.methodId)
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    {m && <MethodLogo method={m} size="h-11 w-11" rounded="rounded-xl" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.methodName} · <span className="tabular-nums">{formatMMK(p.amount)}</span></p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(p.createdAt)}
                        {p.transactionRef && <> · Ref: <span className="font-mono">{p.transactionRef}</span></>}
                      </p>
                    </div>
                    <Badge className={cn('border text-[10px]', STATUS_STYLE[p.status] ?? 'border-white/15 bg-white/5 text-white/60')}>
                      {paymentStatusLabel(p.status)}
                    </Badge>
                  </div>
                  {p.status === 'REJECTED' && (
                    <p className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      Payment rejected.{p.rejectionReason && <> Reason: {p.rejectionReason}</>} You may submit a new payment above.
                    </p>
                  )}
                  {p.status === 'PENDING' && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost" size="sm" disabled={cancelling}
                        onClick={() => cancel(p.id)}
                        className="gap-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                      >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel payment
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
