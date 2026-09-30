import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { MANUAL_PAY_METHODS } from '@/lib/premium-payments'

const itemSchema = z.object({
  productId: z.string().min(1).max(64),
  qty: z.coerce.number().int().min(1).max(10),
})

const VALID_PAY = new Set([
  ...MANUAL_PAY_METHODS.map((m) => m.id),
  ...MANUAL_PAY_METHODS.map((m) => m.name),
  'Cash on Delivery',
])

const orderSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().max(255).optional().default(''),
  city: z.string().trim().max(120).optional().default(''),
  zip: z.string().trim().max(30).optional().default(''),
  country: z.string().trim().max(10).optional().default('MM'),
  payMethod: z.string().trim().max(60).optional().default(''),
  transactionRef: z.string().trim().max(24).optional().default(''),
  items: z.array(itemSchema).min(1).max(20),
})

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000
export const SHIPPING_FLAT_CENTS = 599
const MAX_QTY_PER_LINE = 10

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Create a shop order: rate-limited, server-priced, stock-safe. */
export async function POST(req: NextRequest) {
  try {
    // Production: 8 checkouts / 10 min per IP to block bots without hurting humans.
    const rl = await checkRateLimit(`shop:order:${clientIp(req)}`, 8, 600)
    if (!rl.allowed) return rateLimitedResponse(rl)

    const body = await req.json().catch(() => null)
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please review your details and try again.' }, { status: 400 })
    }
    const { email, name, address, city, zip, country, payMethod, transactionRef, items } = parsed.data

    if (!name.trim()) return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    if (!address.trim() || !city.trim()) {
      return NextResponse.json({ error: 'Street address and city are required.' }, { status: 400 })
    }
    if (payMethod && !VALID_PAY.has(payMethod)) {
      return NextResponse.json({ error: 'Unknown payment method.' }, { status: 400 })
    }
    if (transactionRef && !/^[a-zA-Z0-9-]{4,24}$/.test(transactionRef)) {
      return NextResponse.json({ error: 'Transaction reference looks invalid.' }, { status: 400 })
    }

    // Merge duplicate lines + clamp.
    const merged = new Map<string, number>()
    for (const it of items) {
      merged.set(it.productId, Math.min((merged.get(it.productId) ?? 0) + it.qty, MAX_QTY_PER_LINE))
    }
    const lines = [...merged.entries()].map(([productId, qty]) => ({ productId, qty }))

    const session = await verifySession().catch(() => null)
    const products = await prisma.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, isActive: true } })
    if (products.length !== lines.length) {
      return NextResponse.json({ error: 'One or more products just sold out or were hidden.' }, { status: 400 })
    }
    const byId = new Map(products.map((p) => [p.id, p]))

    let subtotal = 0
    for (const line of lines) {
      const p = byId.get(line.productId)!
      if (p.stock < line.qty) {
        return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}.` }, { status: 409 })
      }
      subtotal += p.priceCents * line.qty
    }
    if (subtotal <= 0) return NextResponse.json({ error: 'Cart total is invalid.' }, { status: 400 })
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS

    const order = await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, isActive: true, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty } },
        })
        if (updated.count === 0) throw new Error('STOCK_CHANGED')
      }
      const created = await tx.shopOrder.create({
        data: {
          userId: session?.userId ?? null,
          email, name: name.trim(), address: address.trim(), city: city.trim(),
          zip: zip.trim(), country: country.trim() || 'MM',
          payMethod: payMethod || null, transactionRef: transactionRef || null,
          subtotalCents: subtotal, shippingCents: shipping,
          totalCents: subtotal + shipping, currency: 'USD', status: 'PENDING',
          items: {
            create: lines.map((line) => {
              const p = byId.get(line.productId)!
              return { productId: p.id, name: p.name, priceCents: p.priceCents, qty: line.qty, imageUrl: p.imageUrl }
            }),
          },
        },
        select: { id: true, totalCents: true, subtotalCents: true, shippingCents: true, status: true, createdAt: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: session?.userId ?? null, action: 'shop_order.created',
          targetType: 'ShopOrder', targetId: created.id,
          metadata: { email, totalCents: created.totalCents, lines: lines.length },
        },
      }).catch(() => {})
      return created
    })

    return NextResponse.json({ ok: true, order }, { status: 201 })
  } catch (err) {
    const msg = (err as Error).message
    console.error('[api/shop/orders]', msg)
    if (msg === 'STOCK_CHANGED') {
      return NextResponse.json({ error: 'Stock just changed — please review your cart.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

/** Current user's recent shop orders (admin sees everything in /admin/shop). */
export async function GET() {
  const session = await verifySession().catch(() => null)
  if (!session) return NextResponse.json({ data: [] })
  const orders = await prisma.shopOrder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, status: true, totalCents: true, subtotalCents: true, shippingCents: true,
      createdAt: true, payMethod: true, name: true, city: true,
      items: { select: { name: true, qty: true, priceCents: true, imageUrl: true } },
    },
  })
  return NextResponse.json({ data: orders })
}
