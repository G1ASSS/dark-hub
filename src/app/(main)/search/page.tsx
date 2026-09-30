"use client"
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  ShoppingCart, ShoppingBag, Star, Heart, Zap, Package, Shield, Truck,
  ChevronRight, X, Plus, Minus, Sparkles, Crown, Flame,
  Tag, Filter, Search, Check, ArrowRight, Gift, Lock, Copy,
  ReceiptText, CircleAlert, Banknote, Smartphone, ScanLine, CheckCircle2,
  Receipt, Expand, QrCode, Download, RotateCcw,
} from 'lucide-react'
import { MANUAL_PAY_METHODS, getPayMethod } from '@/lib/premium-payments'
import { MethodLogo } from '@/components/premium/method-logo'

// ── MAISON NOIR · champagne gold on warm near-black ───────────────────────────
const GOLD_TEXT: CSSProperties = {
  background: 'linear-gradient(115deg,#F7E7BE 0%,#E7C37E 35%,#C9963E 65%,#F7E7BE 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}
const GOLD_BTN: CSSProperties = {
  background: 'linear-gradient(135deg,#F3D9A0 0%,#E2B96A 45%,#C9963E 100%)',
  color: '#1B1206',
  boxShadow: '0 8px 30px rgba(201,150,62,0.35)',
}
const GOLD_GLOW = '0 0 30px rgba(201,150,62,0.35)'

/** Product badges may carry legacy emoji from the seed data — strip to text. */
const stripEmoji = (s: string) =>
  s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '').trim()

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  slug?: string
  tagline: string | null
  price: number
  originalPrice?: number | null
  rating: number
  reviews: number
  category: string
  badge?: string | null
  badgeColor?: string | null
  image: string
  gradient: string
  glow: string
  features: string[]
  isNew?: boolean
  isBestseller?: boolean
  stock: number
}

interface CartItem extends Product { qty: number }

interface ShopOrderDTO {
  id: string
  status: string
  totalCents: number
  subtotalCents: number
  shippingCents: number
  createdAt: string
  payMethod: string | null
  items: { name: string; qty: number; priceCents: number; imageUrl: string | null }[]
}

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Aurora Pulse Wand', tagline: 'Whisper-quiet, 10 vibration modes', price: 89, originalPrice: 129, rating: 4.9, reviews: 2341, category: 'vibrators', badge: 'Hot', badgeColor: '', image: '/product-aurora-wand.jpg', gradient: '', glow: '', features: ['Waterproof', 'USB-C Charge', 'Body-safe Silicone'], isBestseller: true, stock: 14 },
  { id: 'p2', name: 'Velvet Crown Set', tagline: 'Premium bondage starter kit', price: 64, originalPrice: 89, rating: 4.8, reviews: 1872, category: 'bondage', badge: 'Premium', badgeColor: '', image: '/product-velvet-crown.jpg', gradient: '', glow: '', features: ['Vegan Leather', 'Satin Lining', '4-piece Set'], stock: 8 },
  { id: 'p3', name: 'NovaSense Gel Lube', tagline: 'Long-lasting, paraben-free formula', price: 24, rating: 4.7, reviews: 5102, category: 'lubricants', badge: 'Lab Tested', badgeColor: '', image: '/product-nova-lube.jpg', gradient: '', glow: '', features: ['Water-based', 'Condom safe', 'pH-balanced'], stock: 50 },
  { id: 'p4', name: 'Phantom Prostate Pro', tagline: 'Curved for targeted stimulation', price: 119, originalPrice: 159, rating: 4.9, reviews: 987, category: 'anal', badge: 'New', badgeColor: '', image: '/product-phantom-pro.jpg', gradient: '', glow: '', features: ['Remote Control', '12 Modes', 'Rechargeable'], isNew: true, stock: 21 },
  { id: 'p5', name: 'Silk Secrets Lingerie', tagline: 'French lace, all-size inclusive', price: 49, rating: 4.6, reviews: 3210, category: 'lingerie', badge: 'Romantic', badgeColor: '', image: '/product-silk-lingerie.jpg', gradient: '', glow: '', features: ['XS–4XL', '100% Silk', 'Gift Wrapped'], stock: 30 },
  { id: 'p6', name: 'Cosmos Couples Kit', tagline: 'Sync via app, play anywhere', price: 149, originalPrice: 199, rating: 4.8, reviews: 1440, category: 'couples', badge: 'Featured', badgeColor: '', image: '/product-cosmos-kit.jpg', gradient: '', glow: '', features: ['Long Distance', 'App Controlled', '5h Battery'], isBestseller: true, stock: 6 },
  { id: 'p7', name: 'Marble Massage Oil', tagline: 'Warming sensation, intoxicating scent', price: 32, rating: 4.5, reviews: 2870, category: 'lubricants', image: '/product-marble-oil.jpg', gradient: '', glow: '', features: ['Edible', 'Warming', '200ml bottle'], stock: 42 },
  { id: 'p8', name: 'Eclipse Clitoral Air', tagline: 'Air pulse technology, 11 intensities', price: 99, originalPrice: 139, rating: 5.0, reviews: 4320, category: 'vibrators', badge: 'Top Rated', badgeColor: '', image: '/product-eclipse-air.jpg', gradient: '', glow: '', features: ['No-contact', 'Near-silent', 'Magnetic charge'], isBestseller: true, stock: 18 },
]

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'vibrators', label: 'Vibrators', icon: Zap },
  { id: 'couples', label: 'Couples', icon: Heart },
  { id: 'bondage', label: 'Bondage', icon: Crown },
  { id: 'anal', label: 'Anal', icon: Flame },
  { id: 'lingerie', label: 'Lingerie', icon: Gift },
  { id: 'lubricants', label: 'Lube & Care', icon: Package },
]

const PERKS = [
  { icon: Package, title: 'Discreet packaging', desc: 'Plain box, no branding' },
  { icon: Shield, title: 'Body-safe certified', desc: 'Lab-tested materials' },
  { icon: Truck, title: 'Free ship $50+', desc: 'Tracked 2–3 day delivery' },
  { icon: Banknote, title: 'Pay on delivery', desc: 'KBZ · AYA · UAB · Cash' },
]

const TICKER = [
  { icon: Truck, text: 'Free shipping over $50' },
  { icon: Package, text: 'Discreet plain-box packaging' },
  { icon: Shield, text: 'Body-safe certified' },
  { icon: Banknote, text: 'KBZ · AYA · UAB · Cash on delivery' },
  { icon: RotateCcw, text: '30-day easy returns' },
  { icon: Lock, text: '256-bit encrypted checkout' },
]

const FREE_SHIP_AT = 50
const SHIP_FLAT = 5.99

const fmt = (n: number) => `$${n.toFixed(2)}`
const uid = () => Math.random().toString(36).slice(2, 9)

// ── Toasts ────────────────────────────────────────────────────────────────────
interface Toast { id: string; msg: string; kind: 'ok' | 'info' | 'err' }
function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className="pointer-events-auto flex w-full items-center gap-2.5 rounded-2xl border px-4 py-3 text-[13px] font-semibold shadow-2xl"
            style={{
              background: 'rgba(16,13,10,0.96)',
              borderColor: t.kind === 'err' ? 'rgba(244,63,94,0.4)' : t.kind === 'ok' ? 'rgba(231,195,126,0.4)' : 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(20px)',
            }}>
            {t.kind === 'err'
              ? <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" />
              : t.kind === 'ok'
                ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={GOLD_BTN}><Check className="h-3 w-3" strokeWidth={3.5} /></span>
                : <Sparkles className="h-4 w-4 shrink-0 text-[#E7C37E]" />}
            <span className="leading-snug">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-[2px]" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="h-3 w-3"
          style={{ fill: i <= Math.round(rating) ? '#E7C37E' : 'transparent', color: i <= Math.round(rating) ? '#E7C37E' : 'rgba(255,255,255,0.22)', strokeWidth: 1.5 }} />
      ))}
    </span>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ no, title, action }: { no: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#E7C37E]/70">{no}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#F5EFE2]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, onWish, wished, cartQty, index }: {
  product: Product; onAdd: (p: Product) => void; onWish: (id: string) => void
  wished: boolean; cartQty: number; index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [hover, setHover] = useState(false)
  const [added, setAdded] = useState(false)
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0
  const badgeText = product.badge ? stripEmoji(product.badge) : ''

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="group relative flex flex-col overflow-hidden rounded-[22px] bg-[#14110D]"
      style={{
        border: '1px solid rgba(231,195,126,0.12)',
        boxShadow: hover ? `0 24px 60px rgba(0,0,0,0.6), ${GOLD_GLOW}` : '0 10px 36px rgba(0,0,0,0.5)',
        transform: hover ? 'translateY(-4px)' : 'none', transition: 'all .3s ease',
      }}>
      <div className="pointer-events-none absolute inset-x-10 top-0 z-10 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(231,195,126,0.5), transparent)' }} />
      <div className="relative h-60 overflow-hidden bg-black">
        <motion.div className="absolute inset-0" animate={{ scale: hover ? 1.07 : 1 }} transition={{ duration: 0.6 }}>
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width:640px)100vw,(max-width:1024px)50vw,25vw" unoptimized />
        </motion.div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,5,0.9) 0%, rgba(10,8,5,0.2) 48%, transparent 75%)' }} />
        <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
          {product.isBestseller ? (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ ...GOLD_BTN, boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}>
              <Crown className="h-3 w-3" strokeWidth={2.5} /> Bestseller
            </span>
          ) : product.isNew ? (
            <span className="flex items-center gap-1 rounded-full border border-[#E7C37E]/40 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#E7C37E]" style={{ backdropFilter: 'blur(8px)' }}>
              <Sparkles className="h-3 w-3" /> New
            </span>
          ) : badgeText ? (
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/85" style={{ backdropFilter: 'blur(8px)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#E7C37E' }} />{badgeText}
            </span>
          ) : null}
          {discount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ ...GOLD_BTN }}>−{discount}%</span>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onWish(product.id)} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: wished ? 'rgba(244,63,94,0.22)' : 'rgba(0,0,0,0.5)', border: `1px solid ${wished ? 'rgba(244,63,94,0.55)' : 'rgba(255,255,255,0.2)'}`, backdropFilter: 'blur(10px)' }}>
          <Heart className="h-4 w-4" style={{ fill: wished ? '#fb7185' : 'transparent', color: wished ? '#fb7185' : '#fff' }} />
        </motion.button>
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E7C37E]/70">{product.category}</span>
          {product.stock <= 0
            ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">Sold out</span>
            : product.stock <= 8
              ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-200" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)' }}>Only {product.stock} left</span>
              : <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-200" style={{ background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.4)' }}>In stock</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div>
          <h3 className="text-[16px] font-extrabold leading-tight tracking-tight text-[#F5EFE2]">{product.name}</h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/45">{product.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} />
          <span className="text-xs font-bold text-[#F5EFE2]">{product.rating.toFixed(1)}</span>
          <span className="text-xs text-white/35">({product.reviews.toLocaleString()})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.features.slice(0, 2).map((f) => (
            <span key={f} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/55">{f}</span>
          ))}
          {product.features.length > 2 && (
            <span className="rounded-full border border-[#E7C37E]/25 bg-[#E7C37E]/[0.07] px-2 py-0.5 text-[10px] font-bold text-[#E7C37E]/90">+{product.features.length - 2} more</span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-4">
          <div>
            <span className="text-[22px] font-black tracking-tight text-[#F5EFE2]">{fmt(product.price)}</span>
            {product.originalPrice && <span className="ml-2 text-[13px] text-white/30 line-through">{fmt(product.originalPrice)}</span>}
          </div>
          <motion.button whileTap={{ scale: 0.93 }} disabled={product.stock <= 0}
            onClick={() => { onAdd(product); setAdded(true); setTimeout(() => setAdded(false), 1600) }}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-[13px] font-black disabled:opacity-40"
            style={added
              ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 6px 22px rgba(16,185,129,0.4)' }
              : { ...GOLD_BTN }}>
            {added ? <><Check className="h-4 w-4" strokeWidth={3.5} /> Added</> : <><ShoppingCart className="h-4 w-4" strokeWidth={2.5} />{cartQty > 0 ? `Add (${cartQty})` : 'Add'}</>}
          </motion.button>
        </div>
      </div>
    </motion.article>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.02]">
      <div className="skeleton h-60" />
      <div className="space-y-3 p-5"><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-3 w-1/2 rounded" /><div className="skeleton h-10 w-full rounded-2xl" /></div>
    </div>
  )
}

// ── Order status timeline ─────────────────────────────────────────────────────
const ORDER_STEPS = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'] as const
function OrderTimeline({ status }: { status: string }) {
  if (status === 'CANCELED' || status === 'REFUNDED') {
    return <span className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', color: '#fda4af' }}>{status}</span>
  }
  const idx = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number])
  return (
    <div className="flex items-center gap-1">
      {ORDER_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black"
            style={i <= idx ? { ...GOLD_BTN } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
            {i < idx ? <Check className="h-3 w-3" strokeWidth={3.5} /> : i + 1}
          </div>
          {i < ORDER_STEPS.length - 1 && <div className="h-px w-4" style={{ background: i < idx ? '#C9963E' : 'rgba(255,255,255,0.12)' }} />}
        </div>
      ))}
    </div>
  )
}

// ── My orders drawer ──────────────────────────────────────────────────────────
function OrdersDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [orders, setOrders] = useState<ShopOrderDTO[] | null>(null)
  useEffect(() => {
    if (!open) return
    fetch('/api/shop/orders').then((r) => r.json()).then((j) => setOrders(j.data ?? [])).catch(() => setOrders([]))
  }, [open])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed bottom-0 right-0 top-0 z-[71] flex w-full max-w-md flex-col" style={{ background: '#100D0A', borderLeft: '1px solid rgba(231,195,126,0.15)' }}>
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div><h2 className="text-lg font-black tracking-tight text-[#F5EFE2]">My orders</h2><p className="text-xs text-white/40">Tracked live from the database</p></div>
              <button onClick={onClose} aria-label="Close orders" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {orders === null ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#E7C37E]/25 bg-[#E7C37E]/[0.07]">
                    <ReceiptText className="h-7 w-7 text-[#E7C37E]" />
                  </span>
                  <p className="font-bold text-[#F5EFE2]">No orders yet</p>
                  <p className="mt-1 max-w-[250px] text-sm text-white/45">Sign in when you check out and your orders will appear here with live tracking.</p>
                </div>
              ) : orders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-[#E7C37E]/80">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-xs font-bold text-white">${(o.totalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="mb-3"><OrderTimeline status={o.status} /></div>
                  <div className="space-y-1.5">
                    {o.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {it.imageUrl && <Image src={it.imageUrl} alt={it.name} fill className="object-cover" sizes="36px" unoptimized />}
                        </div>
                        <p className="flex-1 truncate text-[13px] font-medium">{it.qty}× {it.name}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-white/35">{new Date(o.createdAt).toLocaleString()} · {o.payMethod || '—'}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Cart drawer ───────────────────────────────────────────────────────────────
function CartDrawer({ items, open, onClose, onInc, onDec, onRemove, onCheckout }: {
  items: CartItem[]; open: boolean; onClose: () => void
  onInc: (id: string) => void; onDec: (id: string) => void; onRemove: (id: string) => void; onCheckout: () => void
}) {
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_AT ? 0 : SHIP_FLAT
  const total = subtotal + shipping
  const savings = items.reduce((a, i) => a + ((i.originalPrice ?? i.price) - i.price) * i.qty, 0)
  const qty = items.reduce((a, i) => a + i.qty, 0)
  const pct = Math.min((subtotal / FREE_SHIP_AT) * 100, 100)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }} />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 35 }}
            className="fixed bottom-0 right-0 top-0 z-[61] flex w-full flex-col sm:max-w-md"
            style={{ background: 'linear-gradient(180deg,#171208 0%,#0C0A07 100%)', borderLeft: '1px solid rgba(231,195,126,0.15)', boxShadow: '-30px 0 80px rgba(0,0,0,0.6)' }}
            role="dialog" aria-label="Shopping bag">
            <div className="h-[2px] w-full overflow-hidden">
              <motion.div className="h-full w-1/2" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                style={{ background: 'linear-gradient(90deg,transparent,#E7C37E,#F7E7BE,transparent)' }} />
            </div>
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={GOLD_BTN}>
                  <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div><h2 className="text-lg font-black tracking-tight text-[#F5EFE2]">Your bag {qty > 0 && <span className="text-white/40">({qty})</span>}</h2>
                <p className="text-[11px] text-white/40">Discreet · Secure · Tracked</p></div>
              </div>
              <button onClick={onClose} aria-label="Close bag" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] transition hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>

            {items.length > 0 && (
              <div className="mx-6 mb-3 rounded-2xl border border-[#E7C37E]/15 bg-[#E7C37E]/[0.05] p-3.5">
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-white/55"><Truck className="h-3.5 w-3.5 text-[#E7C37E]" />{pct >= 100 ? 'Free express shipping unlocked' : `${fmt(FREE_SHIP_AT - subtotal)} away from free shipping`}</span>
                  <span className="font-black tabular-nums" style={{ color: pct >= 100 ? '#34d399' : '#E7C37E' }}>{pct >= 100 ? 'FREE' : `${Math.round(pct)}%`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: 'linear-gradient(90deg,#C9963E,#E7C37E,#F7E7BE)' }} />
                </div>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#E7C37E]/20 bg-[#E7C37E]/[0.06]">
                    <ShoppingBag className="h-8 w-8 text-[#E7C37E]/60" />
                  </span>
                  <p className="font-bold text-[#F5EFE2]">Your bag is empty</p>
                  <p className="mt-1 max-w-[230px] text-[13px] text-white/45">Beautiful, body-safe pieces are one tap away.</p>
                  <button onClick={onClose} className="mt-5 rounded-2xl px-6 py-2.5 text-sm font-bold" style={{ ...GOLD_BTN }}>Start browsing</button>
                </div>
              ) : items.map((item) => (
                <motion.div layout key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex gap-3.5 rounded-[20px] border border-white/[0.07] bg-white/[0.035] p-3">
                  <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-black">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="84px" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-[14px] font-bold text-[#F5EFE2]">{item.name}</p><p className="text-[11px] text-white/40">{fmt(item.price)} each</p></div>
                      <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} className="text-[11px] font-medium text-white/35 transition hover:text-rose-300">Remove</button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.06]">
                        <button onClick={() => onDec(item.id)} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center text-white/60 hover:text-white"><Minus className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
                        <span className="w-8 text-center text-sm font-black tabular-nums">{item.qty}</span>
                        <button onClick={() => onInc(item.id)} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center text-white/60 hover:text-white"><Plus className="h-3.5 w-3.5" strokeWidth={2.5} /></button>
                      </div>
                      <p className="text-[15px] font-black tabular-nums text-[#F5EFE2]">{fmt(item.price * item.qty)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/[0.08] bg-[#0C0A07]/95 px-6 pb-6 pt-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                <div className="mb-3 flex items-end justify-between">
                  <div className="space-y-1 text-[13px]">
                    <p className="text-white/50">Subtotal <span className="ml-2 font-semibold text-white">{fmt(subtotal)}</span></p>
                    <p className="text-white/50">Shipping <span className="ml-2 font-semibold" style={{ color: shipping === 0 ? '#34d399' : '#fff' }}>{shipping === 0 ? 'Free' : fmt(shipping)}</span></p>
                    {savings > 0 && <p className="font-semibold text-emerald-300">You save {fmt(savings)}</p>}
                  </div>
                  <div className="text-right"><p className="text-[11px] text-white/40">Total</p><p className="text-[28px] font-black leading-none tracking-tight text-[#F5EFE2]">{fmt(total)}</p></div>
                </div>
                <motion.button whileTap={{ scale: 0.98 }} onClick={onCheckout}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] py-4 text-[15px] font-black"
                  style={{ ...GOLD_BTN, boxShadow: '0 10px 44px rgba(201,150,62,0.4)' }}>
                  <Lock className="h-4 w-4" strokeWidth={2.5} /> Checkout · {fmt(total)} <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </motion.button>
                <p className="mt-2.5 text-center text-[11px] text-white/35">256-bit encrypted · Plain-box shipping · 30-day returns</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Checkout ──────────────────────────────────────────────────────────────────
type Step = 'info' | 'pay' | 'review'
const COD_ID = 'cod'

function CheckoutModal({ open, onClose, items, total, shipping, onPlaced, notify }: {
  open: boolean; onClose: () => void; items: CartItem[]; total: number; shipping: number
  onPlaced: () => void; notify: (msg: string, kind: Toast['kind']) => void
}) {
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState({ email: '', name: '', address: '', city: '', zip: '', country: 'MM' })
  const [payId, setPayId] = useState<string>('kbz_pay')
  const [txRef, setTxRef] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const method = getPayMethod(payId)
  const isCod = payId === COD_ID
  const payName = isCod ? 'Cash on Delivery' : method?.name ?? ''
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  const paySteps = method
    ? [
        { icon: Smartphone, text: `Open ${method.appName}.` },
        { icon: ScanLine, text: 'Scan the QR code below.' },
        { icon: Banknote, text: `Pay ${fmt(total)}.` },
        { icon: CheckCircle2, text: 'Complete the payment in your bank app.' },
        { icon: Receipt, text: 'Paste the transaction ID below — staff verify it before shipping.' },
      ]
    : []

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const reset = () => { setStep('info'); setOrderId(null); setError(null); setTxRef(''); setLightbox(false); onClose() }

  const place = async () => {
    if (placing) return
    setPlacing(true); setError(null)
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(), name: form.name.trim(), address: form.address.trim(),
          city: form.city.trim(), zip: form.zip.trim(), country: form.country.trim() || 'MM',
          payMethod: payName,
          transactionRef: txRef.trim(),
          items: items.map((i) => ({ productId: i.id, qty: i.qty })),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error ?? 'Order failed — please try again.')
      setOrderId(j.order.id)
      onPlaced()
      notify('Order confirmed — thank you!', 'ok')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPlacing(false)
    }
  }

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(total.toFixed(2))
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  const input = 'h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#E7C37E]/60 focus:ring-2 focus:ring-[#E7C37E]/25'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(14px)' }} onClick={(e) => e.target === e.currentTarget && !placing && reset()}>
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-[#E7C37E]/25 bg-[#14110C] sm:rounded-[28px]"
            style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}
            role="dialog" aria-label="Checkout">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#8A6420,#E7C37E,#F7E7BE,#E7C37E,#8A6420)' }} />

            {orderId ? (
              <div className="flex flex-col items-center px-8 py-14 text-center">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 60px rgba(16,185,129,0.5)' }}>
                  <Check className="h-9 w-9 text-white" strokeWidth={3} />
                </motion.div>
                <h2 className="text-3xl font-black tracking-tight text-[#F5EFE2]">Order confirmed</h2>
                <p className="mt-2 font-mono text-sm" style={GOLD_TEXT}>#{orderId.slice(0, 8).toUpperCase()} · {fmt(total)}</p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
                  We saved your order{form.email ? <> and will confirm <span className="font-semibold text-white">{form.email}</span></> : null}.
                  Track it anytime under <span className="font-semibold text-white">My orders</span>. Ships in a plain box within 2–3 days.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] text-white/55">
                  {[
                    { icon: Package, text: 'Plain packaging' },
                    { icon: Lock, text: 'Privacy guaranteed' },
                    { icon: Truck, text: '2–3 day delivery' },
                  ].map((t) => (
                    <span key={t.text} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"><t.icon className="h-3 w-3 text-[#E7C37E]" />{t.text}</span>
                  ))}
                </div>
                <button onClick={reset} className="mt-6 rounded-2xl px-8 py-3 text-sm font-black" style={GOLD_BTN}>Keep shopping</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-5 sm:px-8">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#F5EFE2]">Checkout</h2>
                    <div className="mt-2 flex items-center gap-2">
                      {(['info', 'pay', 'review'] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
                            style={s === step ? { ...GOLD_BTN } : (['info', 'pay', 'review'].indexOf(step) > i ? { background: 'rgba(16,185,129,0.25)', color: '#6ee7b7' } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' })}>
                            {['info', 'pay', 'review'].indexOf(step) > i ? <Check className="h-3 w-3" strokeWidth={3.5} /> : i + 1}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${s === step ? 'text-white' : 'text-white/35'}`}>{s === 'info' ? 'Shipping' : s === 'pay' ? 'Payment' : 'Review'}</span>
                          {i < 2 && <span className="mx-1 h-px w-6 bg-white/15" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => !placing && reset()} aria-label="Close checkout" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[1fr_280px]">
                  <div className="min-h-0 overflow-y-auto px-6 pb-5 sm:px-8">
                    {error && <p className="mb-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-[13px] font-semibold text-rose-200">{error}</p>}

                    {step === 'info' && (
                      <div className="space-y-3.5">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-email">Email for confirmation</label>
                          <input id="co-email" className={input} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                        </div>
                        <div className="grid gap-3.5">
                          <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-name">Full name</label>
                            <input id="co-name" className={input} autoComplete="name" placeholder="Aye Chan" value={form.name} onChange={(e) => set('name', e.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-addr">Street address</label>
                            <input id="co-addr" className={input} autoComplete="street-address" placeholder="No. 123, Anawrahta Road" value={form.address} onChange={(e) => set('address', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-city">City</label>
                              <input id="co-city" className={input} autoComplete="address-level2" placeholder="Yangon" value={form.city} onChange={(e) => set('city', e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-zip">ZIP</label>
                              <input id="co-zip" className={input} autoComplete="postal-code" placeholder="11181" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-[#E7C37E]/20 bg-[#E7C37E]/[0.06] p-4">
                          <Package className="mt-0.5 h-4 w-4 shrink-0 text-[#E7C37E]" />
                          <p className="text-xs leading-relaxed text-white/55"><span className="font-semibold text-white">100% discreet.</span> Plain brown box, sender “DH Group”. Billing descriptor <span className="font-semibold text-white">DH GROUP LLC</span>.</p>
                        </div>
                      </div>
                    )}

                    {step === 'pay' && (
                      <div className="space-y-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Pay {fmt(total)}</p>
                          <button onClick={copyAmount} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/70 hover:text-white">
                            <Copy className="h-3 w-3" /> {copied ? 'Copied!' : 'Copy amount'}
                          </button>
                        </div>
                        <div className="grid gap-2.5">
                          {MANUAL_PAY_METHODS.map((m, i) => {
                            const active = payId === m.id
                            return (
                              <motion.button key={m.id} type="button"
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.07, type: 'spring', stiffness: 220, damping: 22 }}
                                whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                                onClick={() => setPayId(m.id)} aria-pressed={active}
                                className={`relative flex w-full items-center gap-3.5 rounded-[20px] border p-3.5 text-left transition-colors ${active ? 'border-[#E7C37E]/60 bg-[#E7C37E]/[0.07]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                                {active && (
                                  <motion.span layoutId="shop-pay-glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[0_0_30px_-6px] shadow-[#C9963E]/60" />
                                )}
                                <MethodLogo method={m} size="h-12 w-12" rounded="rounded-2xl" />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[15px] font-bold">{m.name}</span>
                                  <span className="block text-xs font-semibold tabular-nums text-white/45">{fmt(total)}</span>
                                </span>
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${active ? 'border-transparent' : 'border-white/20'}`} style={active ? GOLD_BTN : undefined}>
                                  <AnimatePresence>
                                    {active && (
                                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                                        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </span>
                              </motion.button>
                            )
                          })}
                          <motion.button type="button"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: MANUAL_PAY_METHODS.length * 0.07, type: 'spring', stiffness: 220, damping: 22 }}
                            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setPayId(COD_ID)} aria-pressed={isCod}
                            className={`relative flex w-full items-center gap-3.5 rounded-[20px] border p-3.5 text-left transition-colors ${isCod ? 'border-emerald-500/60 bg-emerald-500/[0.08]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                            {isCod && (
                              <motion.span layoutId="shop-pay-glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[0_0_30px_-6px] shadow-emerald-500/50" />
                            )}
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                              <Banknote className="h-6 w-6 text-white" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-bold">Cash on Delivery</span>
                              <span className="block text-xs text-white/45">Pay cash when your parcel arrives</span>
                            </span>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isCod ? 'border-transparent bg-emerald-500' : 'border-white/20'}`}>
                              <AnimatePresence>
                                {isCod && (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                          </motion.button>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                          {method && !isCod && (
                            <motion.div key={method.id}
                              initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
                              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                              className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
                              <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-[#C9963E]/20 blur-3xl" aria-hidden="true" />
                              <div className="relative p-4">
                                <div className="flex items-center gap-3">
                                  <MethodLogo method={method} size="h-11 w-11" rounded="rounded-xl" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">Pay with {method.name}</p>
                                    <p className="text-[11px] text-white/45">Scan the code with {method.appName}</p>
                                  </div>
                                  <span className="shrink-0 text-lg font-black tabular-nums" style={GOLD_TEXT}>{fmt(total)}</span>
                                </div>

                                <button type="button" onClick={() => setLightbox(true)} aria-label={`Enlarge ${method.name} QR code`}
                                  className="group relative mx-auto mt-4 block w-full max-w-[220px]">
                                  <span className="absolute -left-1.5 -top-1.5 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-[#E7C37E]" aria-hidden="true" />
                                  <span className="absolute -right-1.5 -top-1.5 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-[#E7C37E]" aria-hidden="true" />
                                  <span className="absolute -bottom-1.5 -left-1.5 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#E7C37E]" aria-hidden="true" />
                                  <span className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-[#E7C37E]" aria-hidden="true" />
                                  <span className="relative block overflow-hidden rounded-2xl bg-white">
                                    <Image src={method.qr} alt={`${method.name} payment QR code`} width={440} height={440} className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]" />
                                    <motion.span
                                      className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                      initial={{ x: '-120%' }} animate={{ x: '420%' }}
                                      transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.35 }} aria-hidden="true" />
                                  </span>
                                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                    <Expand className="h-3 w-3" /> Tap to enlarge
                                  </span>
                                </button>
                                <p className="mt-2.5 text-center text-[11px] text-white/45">Scan or tap the QR to pay <span className="font-bold text-white">{fmt(total)}</span></p>

                                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E7C37E]/80">How to pay</p>
                                  <ol className="space-y-1">
                                    {paySteps.map((s, si) => {
                                      const Icon = s.icon
                                      const last = si === paySteps.length - 1
                                      return (
                                        <motion.li key={s.text}
                                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.1 + si * 0.07, duration: 0.3 }}
                                          className="relative flex items-center gap-3 pb-3 last:pb-0">
                                          {!last && <span className="absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-[#C9963E]/50 to-transparent" aria-hidden="true" />}
                                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E7C37E]/25 bg-[#E7C37E]/10">
                                            <Icon className="h-[18px] w-[18px] text-[#E7C37E]" />
                                          </span>
                                          <span className="text-[13px] text-white/85">
                                            <span className="mr-2 font-bold tabular-nums text-[#E7C37E]/70">{si + 1}</span>{s.text}
                                          </span>
                                        </motion.li>
                                      )
                                    })}
                                  </ol>
                                </div>

                                <div className="mt-3">
                                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40" htmlFor="co-tx">Transaction ID / last digits</label>
                                  <input id="co-tx" className={`${input} font-mono tracking-widest`} placeholder="e.g. 83421" value={txRef} onChange={(e) => setTxRef(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24))} />
                                  <p className="mt-1.5 text-[11px] text-white/35">Find it in your {method.appName} receipt — staff verify it before shipping.</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isCod && (
                          <div className="rounded-[20px] border border-emerald-400/25 bg-emerald-400/[0.07] p-4 text-[13px] leading-relaxed text-white/65">
                            No prepayment needed. Our courier collects <span className="font-bold text-white">{fmt(total)}</span> in cash when your discreet parcel arrives.
                          </div>
                        )}
                      </div>
                    )}

                    {step === 'review' && (
                      <div className="space-y-3.5">
                        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">Ship to</p>
                          <p className="text-sm font-bold">{form.name}</p>
                          <p className="text-[13px] text-white/55">{form.address}, {form.city} {form.zip}</p>
                          <p className="text-[13px] text-white/55">{form.email}</p>
                        </div>
                        <div className="rounded-[20px] border border-[#E7C37E]/20 bg-[#E7C37E]/[0.05] p-4 text-sm">
                          <div className="flex justify-between"><span className="text-white/50">Payment</span><span className="font-bold">{payName}{txRef && !isCod ? ` · ${txRef}` : ''}</span></div>
                          <div className="mt-1.5 flex justify-between"><span className="text-white/50">Total charged</span><span className="text-lg font-black" style={GOLD_TEXT}>{fmt(total)}</span></div>
                        </div>
                        <p className="flex items-center gap-2 text-[12px] text-white/40"><Shield className="h-3.5 w-3.5 text-emerald-300" /> Placing this order reserves stock instantly and writes an audit record.</p>
                      </div>
                    )}
                  </div>

                  <div className="hidden border-l border-white/[0.07] bg-black/30 p-5 md:block">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/40">Order summary</p>
                    <div className="mb-4 max-h-56 space-y-2.5 overflow-y-auto">
                      {items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2.5">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
                            <Image src={i.image} alt={i.name} fill className="object-cover" sizes="44px" unoptimized />
                            <span className="absolute -right-0 -top-0 rounded-bl-lg bg-black/70 px-1.5 text-[10px] font-black">×{i.qty}</span>
                          </div>
                          <p className="min-w-0 flex-1 truncate text-[12px] font-medium">{i.name}</p>
                          <span className="text-[12px] font-bold tabular-nums">{fmt(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5 border-t border-white/10 pt-3 text-[13px]">
                      <div className="flex justify-between text-white/55"><span>Subtotal</span><span className="text-white">{fmt(total - shipping)}</span></div>
                      <div className="flex justify-between text-white/55"><span>Shipping</span><span className="text-white">{shipping === 0 ? 'Free' : fmt(shipping)}</span></div>
                      <div className="flex justify-between pt-1 text-[16px] font-black"><span>Total</span><span style={GOLD_TEXT}>{fmt(total)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-white/[0.07] px-6 py-4 sm:px-8" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  {step !== 'info' && (
                    <button disabled={placing} onClick={() => { setError(null); setStep(step === 'review' ? 'pay' : 'info') }} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] py-3.5 text-sm font-bold disabled:opacity-50">← Back</button>
                  )}
                  <button
                    disabled={placing}
                    onClick={() => {
                      setError(null)
                      if (step === 'info') {
                        if (!emailOk) return setError('Enter a valid email so we can confirm your order.')
                        if (!form.name.trim()) return setError('Your full name is required for delivery.')
                        if (!form.address.trim() || !form.city.trim()) return setError('Street address and city are required.')
                        setStep('pay')
                      } else if (step === 'pay') {
                        if (!payName) return
                        if (!isCod && !txRef.trim()) return setError('Add your transaction ID from the e-wallet receipt (or choose Cash on Delivery).')
                        setStep('review')
                      } else void place()
                    }}
                    className="flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black disabled:opacity-60"
                    style={{ ...GOLD_BTN, boxShadow: '0 0 30px rgba(201,150,62,0.4)' }}>
                    {placing ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : step === 'review' ? <><Lock className="h-4 w-4" strokeWidth={2.5} /> Pay {fmt(total)}</> : <>Continue <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></>}
                  </button>
                </div>
              </>
            )}
          </motion.div>

          <AnimatePresence>
            {lightbox && method && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 p-4"
                style={{ backdropFilter: 'blur(8px)' }}
                onClick={() => setLightbox(false)}
                role="dialog" aria-modal="true" aria-label={`${method.name} QR code enlarged`}>
                <motion.div
                  initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="w-[min(92vw,440px)] rounded-3xl border border-[#E7C37E]/20 bg-[#14110C] p-4"
                  style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.8), 0 0 60px rgba(201,150,62,0.2)' }}
                  onClick={(e) => e.stopPropagation()}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <MethodLogo method={method} size="h-9 w-9" rounded="rounded-lg" />
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{method.name} · <span className="tabular-nums">{fmt(total)}</span></p>
                    <button onClick={() => setLightbox(false)} aria-label="Close"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-white">
                    <Image src={method.qr} alt={`${method.name} payment QR code`} width={880} height={880} className="h-auto w-full" />
                  </div>
                  <a href={method.qr} download={`${method.id}-qr.jpg`}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:brightness-110" style={GOLD_BTN}>
                    <Download className="h-4 w-4" strokeWidth={2.5} /> Download QR
                  </a>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/45">
                    <QrCode className="h-3.5 w-3.5" /> Point your {method.appName} scanner at the code
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [bounce, setBounce] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const prevQty = useRef(0)

  const notify = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = uid()
    setToasts((t) => [...t.slice(-2), { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/shop/products')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (alive) { setProducts(j.data?.length ? j.data : FALLBACK_PRODUCTS); setOffline(!j.data?.length); setLoading(false) } })
      .catch(() => { if (alive) { setProducts(FALLBACK_PRODUCTS); setOffline(true); setLoading(false) } })
    return () => { alive = false }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect -- intentional client hydration */
  useEffect(() => {
    try {
      const c = localStorage.getItem('dh_cart_v1')
      const w = localStorage.getItem('dh_wishlist_v1')
      if (c) setCart(JSON.parse(c))
      if (w) setWishlist(new Set(JSON.parse(w)))
    } catch { /* corrupted storage */ }
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { if (hydrated) { try { localStorage.setItem('dh_cart_v1', JSON.stringify(cart)) } catch { /* private mode */ } } }, [cart, hydrated])
  useEffect(() => { if (hydrated) { try { localStorage.setItem('dh_wishlist_v1', JSON.stringify([...wishlist])) } catch { /* private mode */ } } }, [wishlist, hydrated])

  const qty = cart.reduce((a, i) => a + i.qty, 0)
  useEffect(() => {
    if (qty > prevQty.current) { setBounce(true); setTimeout(() => setBounce(false), 550) }
    prevQty.current = qty
  }, [qty])

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === 'all' ? products.length : products.filter((p) => p.category === c.id).length]))
  const avg = products.length ? products.reduce((a, p) => a + p.rating, 0) / products.length : 0
  const reviews = products.reduce((a, p) => a + p.reviews, 0)

  const filtered = products
    .filter((p) => category === 'all' || p.category === category)
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || (p.tagline ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : sort === 'rating' ? b.rating - a.rating : b.reviews - a.reviews)

  const loved = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 6)

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_AT ? 0 : SHIP_FLAT

  const add = (p: Product) => {
    if (p.stock <= 0) return notify('Sorry — this item just sold out.', 'err')
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id)
      if (ex) {
        if (ex.qty >= Math.min(p.stock, 10)) { notify(`Only ${p.stock} available.`, 'err'); return prev }
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...p, qty: 1 }]
    })
    notify(`${p.name} added to bag`, 'ok')
  }
  const wish = (id: string) => {
    setWishlist((prev) => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id); notify('Removed from wishlist', 'info') } else { n.add(id); notify('Saved to wishlist', 'ok') }
      return n
    })
  }

  return (
    <div className="min-h-screen pb-40">
      {/* Warm maison wash over the shared ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(900px 480px at 50% -10%, rgba(201,150,62,0.10), transparent 70%)' }} />

      {/* top bar */}
      <div className="sticky top-0 z-40 border-b border-[#E7C37E]/10" style={{ background: 'rgba(12,9,6,0.88)', backdropFilter: 'blur(24px) saturate(180%)' }}>
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(231,195,126,0.5), transparent)' }} />
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ ...GOLD_BTN, boxShadow: '0 4px 20px rgba(201,150,62,0.45)' }}>
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-black leading-none tracking-tight text-[#F5EFE2]">Maison Noir</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                {loading ? 'Preparing the boutique…' : offline ? 'Offline catalog' : (
                  <>{products.length} pieces · <Star className="h-2.5 w-2.5" style={{ fill: '#E7C37E', color: '#E7C37E' }} /> {avg.toFixed(1)} · live</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOrdersOpen(true)} className="hidden items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13px] font-bold text-white/70 transition hover:text-white sm:flex">
              <ReceiptText className="h-4 w-4" /> Orders
            </button>
            <div className="relative hidden items-center md:flex">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/35" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the boutique…"
                className="h-10 w-44 rounded-2xl border border-white/10 bg-white/[0.05] pl-9 pr-8 text-sm outline-none transition-all placeholder:text-white/30 focus:w-60 focus:border-[#E7C37E]/50" />
              {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 text-white/40 hover:text-white"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <motion.button onClick={() => setCartOpen(true)} animate={bounce ? { scale: [1, 1.22, 0.94, 1.07, 1] } : {}} transition={{ duration: 0.5 }}
              className="relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black"
              style={{ ...GOLD_BTN, boxShadow: qty > 0 ? '0 0 24px rgba(201,150,62,0.5)' : 'none' }}
              aria-label={`Open bag, ${qty} items`}>
              <ShoppingCart className="h-4 w-4" strokeWidth={2.5} /><span className="hidden sm:inline">Bag</span>
              {qty > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B1206] px-1 text-[10px] font-black text-[#F3D9A0]">{qty}</span>}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* HERO */}
        <div className="relative mt-4 overflow-hidden rounded-[26px] border border-[#E7C37E]/15 sm:mt-6 sm:rounded-[30px]" style={{ boxShadow: '0 26px 90px rgba(0,0,0,0.6)' }}>
          <div className="absolute inset-0 overflow-hidden">
            <Image src="/shop-hero.jpg" alt="" fill className="animate-kenburns object-cover" priority sizes="100vw" />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(8,6,3,0.97) 0%, rgba(8,6,3,0.88) 44%, rgba(8,6,3,0.42) 72%, rgba(8,6,3,0.18) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 h-44" style={{ background: 'linear-gradient(to top, rgba(8,6,3,0.92), transparent)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(560px 260px at 12% 85%, rgba(201,150,62,0.28), transparent 70%)' }} />
          <div className="absolute inset-x-10 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(231,195,126,0.5), transparent)' }} />
          <div className="relative grid gap-8 px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-[#E7C37E]/25 bg-black/45 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ backdropFilter: 'blur(12px)' }}>
                <span className="h-1 w-6 rounded-full" style={{ background: 'linear-gradient(90deg,#E7C37E,#C9963E)' }} />
                <span className="text-[#F5EFE2]/85">Dark Hubb · The Shop</span>
                <span className="h-3 w-px bg-white/20" />
                <span className="flex items-center gap-1 text-[#E7C37E]"><Lock className="h-3 w-3" /> Secure checkout</span>
              </div>
              <h1 className="text-balance mb-4 text-[40px] font-black leading-[0.98] tracking-[-0.03em] text-[#F7F2E7] sm:text-6xl">
                Pleasure,<br /><span className="animate-gradient-x italic" style={GOLD_TEXT}>perfected.</span>
              </h1>
              <p className="mb-6 max-w-md text-sm leading-relaxed text-white/60 sm:text-[15px]">
                An intimate edit of body-safe essentials — wrapped plain, priced honestly, and tracked from our shelves to your door.
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <button onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black sm:flex-none"
                  style={GOLD_BTN}>
                  Shop the collection <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button onClick={() => setOrdersOpen(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-5 py-3.5 text-sm font-bold text-white/85 transition hover:text-white sm:flex-none" style={{ backdropFilter: 'blur(12px)' }}>
                  <ReceiptText className="h-4 w-4" /> Track order
                </button>
              </div>
              <dl className="mt-7 grid max-w-md grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/45 px-1 py-3" style={{ backdropFilter: 'blur(14px)' }}>
                <div className="px-3 text-center">
                  <dt className="sr-only">Average rating</dt>
                  <dd className="flex items-center justify-center gap-1 text-sm font-black text-[#F5EFE2]"><Star className="h-3.5 w-3.5" style={{ fill: '#E7C37E', color: '#E7C37E' }} />{avg ? avg.toFixed(1) : '—'}</dd>
                  <dd className="mt-0.5 text-[10px] font-medium text-white/45">{reviews.toLocaleString()} reviews</dd>
                </div>
                <div className="px-3 text-center">
                  <dt className="sr-only">Shipping</dt>
                  <dd className="flex items-center justify-center gap-1 text-sm font-black text-[#F5EFE2]"><Truck className="h-3.5 w-3.5 text-[#E7C37E]" /> Free</dd>
                  <dd className="mt-0.5 text-[10px] font-medium text-white/45">ship over {fmt(FREE_SHIP_AT)}</dd>
                </div>
                <div className="px-3 text-center">
                  <dt className="sr-only">Returns</dt>
                  <dd className="flex items-center justify-center gap-1 text-sm font-black text-[#F5EFE2]"><Shield className="h-3.5 w-3.5 text-[#E7C37E]" /> 30-day</dd>
                  <dd className="mt-0.5 text-[10px] font-medium text-white/45">easy returns</dd>
                </div>
              </dl>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
              className="hidden gap-3 lg:grid">
              <div className="rounded-[22px] border border-[#E7C37E]/15 bg-black/45 p-5" style={{ backdropFilter: 'blur(16px)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#E7C37E]/70">Tonight in the boutique</p>
                <p className="mt-1 text-2xl font-black text-[#F5EFE2]">{loading ? '…' : products.length} pieces</p>
                <p className="mt-1 text-xs text-white/50">Stock synced live — when it sells out, it disappears.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-black/45 p-4" style={{ backdropFilter: 'blur(16px)' }}>
                  <Tag className="mb-1.5 h-4 w-4 text-[#E7C37E]" /><p className="text-sm font-black text-[#F5EFE2]">Real savings</p><p className="text-[11px] text-white/50">Sale prices honored at checkout</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/45 p-4" style={{ backdropFilter: 'blur(16px)' }}>
                  <Banknote className="mb-1.5 h-4 w-4 text-[#E7C37E]" /><p className="text-sm font-black text-[#F5EFE2]">Flexible pay</p><p className="text-[11px] text-white/50">KBZ · AYA · UAB · Cash</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* gold ticker */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#E7C37E]/15 bg-[#E7C37E]/[0.04]">
          <div className="animate-marquee flex w-max items-center gap-10 py-2.5 pr-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E7C37E]/75">
                <t.icon className="h-3.5 w-3.5" /> {t.text}
              </span>
            ))}
          </div>
        </div>

        {/* perks */}
        <div className="mb-8 mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {PERKS.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 sm:px-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E7C37E]/25 bg-[#E7C37E]/[0.08]">
                <p.icon className="h-4 w-4 text-[#E7C37E]" />
              </span>
              <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-[#F5EFE2]">{p.title}</span><span className="block truncate text-[11px] text-white/45">{p.desc}</span></span>
            </motion.div>
          ))}
        </div>

        {/* 01 · most loved */}
        {!loading && loved.length > 0 && (
          <section aria-label="Most loved" className="mb-9">
            <SectionHead no="01 · Coveted" title="Most loved right now"
              action={
                <button onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-xs font-bold text-[#E7C37E] transition hover:text-[#F3D9A0]">View all →</button>
              } />
            <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
              {loved.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.45 }}
                  className="relative w-[208px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-white/10 bg-[#14110D]">
                  <span className="pointer-events-none absolute -top-4 right-1 z-0 text-[72px] font-black leading-none text-white/[0.05]" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative z-10 h-28 overflow-hidden bg-black">
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="208px" unoptimized />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,5,0.75), transparent 65%)' }} />
                    <button onClick={() => add(p)} disabled={p.stock <= 0} aria-label={`Quick add ${p.name}`}
                      className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40"
                      style={GOLD_BTN}>
                      <Plus className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                  <div className="relative z-10 p-3">
                    <p className="truncate text-[13px] font-bold text-[#F5EFE2]">{p.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-white/50"><Star className="h-3 w-3" style={{ fill: '#E7C37E', color: '#E7C37E' }} />{p.rating.toFixed(1)} · {(p.reviews / 1000).toFixed(1)}k</span>
                      <span className="text-[13px] font-black text-[#F5EFE2]">{fmt(p.price)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* filter row */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              const active = category === c.id
              return (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className="relative shrink-0 whitespace-nowrap rounded-2xl px-4 py-2.5 text-[13px] font-bold transition-colors"
                  style={!active ? { background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' } : { border: '1px solid transparent', color: '#1B1206' }}>
                  {active && (
                    <motion.span layoutId="shop-cat-gold" transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: 'linear-gradient(135deg,#F3D9A0,#C9963E)', boxShadow: '0 4px 20px rgba(201,150,62,0.4)' }} />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />{c.label}<span className="text-[10px] font-black tabular-nums opacity-70">{counts[c.id] ?? 0}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex flex-1 items-center md:hidden">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/35" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-9 pr-8 text-sm outline-none placeholder:text-white/30 focus:border-[#E7C37E]/50" />
              {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-2.5 text-white/40"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px]">
              <Filter className="h-3.5 w-3.5 text-[#E7C37E]/70" />
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-transparent outline-none" aria-label="Sort">
                <option value="popular">Popular</option>
                <option value="rating">Top rated</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </label>
          </div>
        </div>

        {/* 02 · collection */}
        <SectionHead no={category === 'all' ? '02 · The collection' : '02 · Browse'}
          title={category === 'all' ? 'Shop all pieces' : (CATEGORIES.find((c) => c.id === category)?.label ?? '')}
          action={
            <span className="flex items-center gap-2">
              <span className="rounded-full border border-[#E7C37E]/25 bg-[#E7C37E]/[0.07] px-2.5 py-1 text-xs font-black tabular-nums text-[#E7C37E]">{filtered.length}</span>
              {wishlist.size > 0 && <span className="flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-300"><Heart className="h-3.5 w-3.5" style={{ fill: '#fb7185' }} />{wishlist.size}</span>}
            </span>
          } />

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <div id="grid" className="grid scroll-mt-24 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} index={i} product={p} onAdd={add} onWish={wish} wished={wishlist.has(p.id)} cartQty={cart.find((x) => x.id === p.id)?.qty ?? 0} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#E7C37E]/25 bg-[#E7C37E]/[0.07]">
              <Search className="h-7 w-7 text-[#E7C37E]" />
            </span>
            <h2 className="font-bold text-[#F5EFE2]">Nothing matches</h2>
            <p className="mt-1 text-sm text-white/45">Try another category or search term.</p>
            <button onClick={() => { setCategory('all'); setQ('') }} className="mt-4 rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-bold">Show everything</button>
          </div>
        )}

        {/* 03 · promise */}
        <motion.section initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative mb-6 mt-16 overflow-hidden rounded-[28px] border border-[#E7C37E]/20 p-10 text-center sm:p-14" style={{ background: 'linear-gradient(135deg, rgba(201,150,62,0.10), rgba(201,150,62,0.03))' }}>
          <div className="absolute inset-x-16 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(231,195,126,0.7), transparent)' }} />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px]" style={GOLD_BTN}>
            <Lock className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#E7C37E]/70">03 · Our promise</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#F5EFE2]">Private by design</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
            Orders live in our secured database, parcels ship with zero branding, and payment goes through your own e-wallet — we never see or store card numbers.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-2.5 text-left sm:grid-cols-4">
            {[
              { icon: Lock, text: 'SSL encrypted' },
              { icon: Package, text: 'Plain-box shipping' },
              { icon: Banknote, text: 'Cash on delivery' },
              { icon: RotateCcw, text: '30-day returns' },
            ].map((t) => (
              <span key={t.text} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-white/65">
                <t.icon className="h-4 w-4 shrink-0 text-[#E7C37E]" />{t.text}
              </span>
            ))}
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {qty > 0 && !cartOpen && !checkoutOpen && (
          <motion.button initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={() => setCartOpen(true)}
            className="fixed inset-x-4 z-40 flex items-center justify-between rounded-full border border-white/25 py-2.5 pl-4 pr-2.5 font-bold sm:hidden"
            style={{ bottom: 'max(6.5rem, calc(env(safe-area-inset-bottom) + 5.5rem))', ...GOLD_BTN, boxShadow: '0 14px 44px rgba(201,150,62,0.45), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
            <span className="flex items-center gap-2 text-[13px]"><ShoppingBag className="h-4 w-4" strokeWidth={2.5} /> {qty} item{qty > 1 ? 's' : ''} · {subtotal >= FREE_SHIP_AT ? 'free ship' : `${fmt(FREE_SHIP_AT - subtotal)} to free ship`}</span>
            <span className="flex items-center gap-1 rounded-full bg-[#1B1206] px-3.5 py-2 text-[13px] font-black text-[#F3D9A0]">{fmt(subtotal + shipping)} <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} /></span>
          </motion.button>
        )}
      </AnimatePresence>

      <CartDrawer items={cart} open={cartOpen} onClose={() => setCartOpen(false)}
        onInc={(id) => setCart((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.min(i.qty + 1, i.stock || 10) } : i)))}
        onDec={(id) => setCart((p) => { const it = p.find((x) => x.id === id); if (!it) return p; return it.qty === 1 ? p.filter((x) => x.id !== id) : p.map((x) => (x.id === id ? { ...x, qty: x.qty - 1 } : x)) })}
        onRemove={(id) => setCart((p) => p.filter((x) => x.id !== id))}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={cart} total={subtotal + shipping} shipping={shipping}
        onPlaced={() => setCart([])} notify={notify} />

      <OrdersDrawer open={ordersOpen} onClose={() => setOrdersOpen(false)} />
      <Toasts toasts={toasts} />
    </div>
  )
}
