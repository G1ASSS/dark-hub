'use client'
import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { approvePaymentAction, rejectPaymentAction } from '@/actions/premium-payments'

const iconBtn =
  'h-7 min-w-7 px-1.5 flex items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40'

export function PaymentReviewButtons({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const approve = () =>
    startTransition(async () => {
      setError(null)
      const res = await approvePaymentAction(paymentId)
      if (res && 'error' in res) setError(res.error)
    })

  const reject = () =>
    startTransition(async () => {
      setError(null)
      const res = await rejectPaymentAction(paymentId, reason)
      if (res && 'error' in res) {
        setError(res.error)
      } else {
        setRejecting(false)
        setReason('')
      }
    })

  if (rejecting) {
    return (
      <span className="flex flex-col items-end gap-1.5">
        <span className="flex gap-1.5 items-center">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={500}
            disabled={pending}
            className="h-7 w-44 rounded-lg border border-white/10 bg-black/40 px-2 text-[11px] placeholder:text-muted-foreground/60 focus:border-rose-500/50 focus:outline-none"
          />
          <button
            className={`${iconBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
            disabled={pending}
            onClick={reject}
          >
            Confirm
          </button>
          <button
            className={`${iconBtn} bg-white/5 text-muted-foreground hover:bg-white/10`}
            disabled={pending}
            onClick={() => {
              setRejecting(false)
              setReason('')
              setError(null)
            }}
          >
            Back
          </button>
        </span>
        {error && <span className="text-[11px] text-rose-400">{error}</span>}
      </span>
    )
  }

  return (
    <span className="flex gap-1.5 items-center">
      <button
        className={`${iconBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
        disabled={pending}
        onClick={approve}
        title="Approve & activate Premium"
        aria-label="Approve payment"
      >
        <CheckCircle2 className="h-4 w-4" /> Approve
      </button>
      <button
        className={`${iconBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
        disabled={pending}
        onClick={() => {
          setError(null)
          setRejecting(true)
        }}
        title="Reject payment"
        aria-label="Reject payment"
      >
        <XCircle className="h-4 w-4" /> Reject
      </button>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </span>
  )
}
