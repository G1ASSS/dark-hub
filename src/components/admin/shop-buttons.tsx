"use client"
import { useState, useTransition } from 'react'
import { toggleProductAction, deleteProductAction, updateShopOrderAction } from '@/actions/shop'

export function ProductRowButtons({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <span className="flex items-center justify-end gap-2">
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await toggleProductAction(id) as { error?: string }
          if (r.error) setMsg(r.error)
        })}
        className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/5 disabled:opacity-50"
      >
        {isActive ? 'Hide' : 'Show'}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm('Delete this product? (orders keep their history)')) return
          start(async () => {
            const r = await deleteProductAction(id) as { error?: string }
            if (r.error) setMsg(r.error)
          })
        }}
        className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
      >
        Delete
      </button>
      {msg && <span className="text-[10px] text-rose-400">{msg}</span>}
    </span>
  )
}

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELED'],
  PAID: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELED: [],
  REFUNDED: [],
}

export function OrderStatusButtons({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition()
  const next = NEXT_STATUS[status] ?? []
  if (next.length === 0) return <span className="text-[11px] text-muted-foreground">—</span>
  return (
    <span className="flex justify-end gap-1.5">
      {next.map((s) => (
        <button
          key={s}
          disabled={pending}
          onClick={() => start(async () => { await updateShopOrderAction(orderId, s) })}
          className="rounded-lg gradient-primary px-2.5 py-1 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </span>
  )
}
