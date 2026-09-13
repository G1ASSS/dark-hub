'use client'
import { useState, useEffect, useRef, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Check, X, QrCode, Upload, Download,
  Loader2, Receipt, Ban, Expand,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { submitPaymentAction, cancelPaymentAction } from '@/actions/premium-payments'
import {
  PREMIUM_PRICE, formatMMK, MANUAL_PAY_METHODS, getPayMethod,
  paymentStatusLabel, type ManualPayMethodId,
} from '@/lib/premium-payments'
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

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-lg shadow-violet-500/30"
        >
          <Crown className="h-8 w-8 text-white" />
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">DarkHubb Premium</p>
        <p className="mt-2 text-4xl sm:text-5xl font-bold gradient-text tabular-nums">{formatMMK(PREMIUM_PRICE)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Unlock Premium features · {initial.periodDays} days · pay with your bank app
        </p>
      </div>

      {/* ── Active banner ──────────────────────────────── */}
      {initial.isPremium && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-300">
            <Check className="h-5 w-5" /> PREMIUM ACTIVE
          </p>
          <p className="mt-1 text-xs text-emerald-200/70">
            Your Premium membership is now active.
            {initial.expiresAt && <> Valid until {formatDate(initial.expiresAt)}.</>}
          </p>
        </div>
      )}

      {/* ── Pending banner ─────────────────────────────── */}
      {pendingPayment && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-amber-300">PENDING VERIFICATION</p>
              <p className="mt-1 text-xs text-amber-200/70">
                Your {pendingPayment.methodName} payment of {formatMMK(pendingPayment.amount)} has been
                submitted and is waiting for verification.
                {pendingPayment.transactionRef && <> Ref: <span className="font-mono">{pendingPayment.transactionRef}</span>.</>}
              </p>
            </div>
            <Button
              variant="outline" size="sm" disabled={cancelling}
              onClick={() => cancel(pendingPayment.id)}
              className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Method selection ───────────────────────────── */}
      {!pendingPayment && (
        <>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Select payment method
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {MANUAL_PAY_METHODS.map((m, i) => {
              const active = methodId === m.id
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.35 }}
                  onClick={() => setMethodId(m.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    active
                      ? 'border-violet-500/60 bg-violet-500/10 shadow-lg shadow-violet-500/20 scale-[1.02]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  )}
                >
                  <div className="relative h-12 w-full overflow-hidden rounded-xl bg-white">
                    <Image src={m.logo} alt={`${m.name} logo`} fill className="object-contain p-1" sizes="200px" />
                  </div>
                  <p className="mt-3 font-bold">{m.name}</p>
                  <p className="text-sm font-semibold text-muted-foreground tabular-nums">{formatMMK(PREMIUM_PRICE)}</p>
                </motion.button>
              )
            })}
          </div>

          {/* ── QR + instructions + submit ─────────────── */}
          <AnimatePresence mode="wait" initial={false}>
            {method && (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Pay with {method.name}</h3>
                    <span className="text-lg font-bold gradient-text tabular-nums">{formatMMK(PREMIUM_PRICE)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="group relative mx-auto mt-5 block w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white"
                    aria-label={`Enlarge ${method.name} QR code`}
                  >
                    <Image
                      src={method.qr}
                      alt={`${method.name} payment QR code`}
                      width={800}
                      height={800}
                      className="h-auto w-full"
                      priority={false}
                    />
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Expand className="h-3.5 w-3.5" /> Tap to enlarge
                    </span>
                  </button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Scan or tap the QR code to make payment.
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/[0.07] p-4">
                    <p className="mb-2 text-sm font-bold uppercase tracking-wider">Pay with {method.name}</p>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                      <li>Open {method.appName}.</li>
                      <li>Scan the QR code.</li>
                      <li>Pay {formatMMK(PREMIUM_PRICE)}.</li>
                      <li>Complete the payment.</li>
                      <li>Submit your payment information below.</li>
                    </ol>
                  </div>

                  <form action={submitAction} className="mt-5 space-y-4">
                    <input type="hidden" name="method" value={method.id} />
                    <div className="rounded-2xl border border-white/[0.07] p-4 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="font-semibold">{method.name}</span></div>
                      <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold tabular-nums">{formatMMK(PREMIUM_PRICE)}</span></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="txid">Transaction last 5 digit ID / Reference</Label>
                      <Input id="txid" name="transactionId" placeholder="Enter transaction ID" required minLength={4} maxLength={64} autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="shot">Payment Screenshot</Label>
                      <label
                        htmlFor="shot"
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-sm text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
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
                      <p role="alert" className="text-xs text-rose-400">{submitState.error}</p>
                    )}
                    {submitState && 'ok' in submitState && (
                      <p className="text-xs text-emerald-400">Payment submitted — waiting for verification.</p>
                    )}
                    <Button type="submit" loading={submitPending} className="w-full gap-2 btn-shine">
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
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-[min(92vw,440px)] rounded-3xl border border-white/15 bg-[#121218] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">{method.name} · <span className="tabular-nums">{formatMMK(PREMIUM_PRICE)}</span></p>
                <button
                  onClick={() => setLightbox(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all"
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
            {initial.payments.map((p) => {
              const m = getPayMethod(p.methodId)
              return (
                <div key={p.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    {m && (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
                        <Image src={m.logo} alt="" fill className="object-contain p-1" sizes="40px" />
                      </span>
                    )}
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
