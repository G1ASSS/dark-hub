'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/auth/dal'
import { slugify } from '@/lib/shop/products'

const productSchema = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().max(255).optional().default(''),
  price: z.coerce.number().positive().max(100000),
  originalPrice: z.coerce.number().positive().max(100000).optional().nullable(),
  category: z.string().min(2).max(60),
  badge: z.string().max(60).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  features: z.string().max(500).optional().default(''),
  rating: z.coerce.number().min(0).max(5).optional().default(4.5),
  stock: z.coerce.number().int().min(0).max(100000),
  isNew: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
})

function featuresFromCsv(csv: string): string[] {
  return csv.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8)
}

export async function upsertProductAction(id: string | null, form: FormData) {
  await requireAdmin()
  const parsed = productSchema.safeParse({
    name: form.get('name'), tagline: form.get('tagline'),
    price: form.get('price'), originalPrice: form.get('originalPrice') || null,
    category: form.get('category'), badge: form.get('badge') || null,
    imageUrl: form.get('imageUrl') || null, features: form.get('features') ?? '',
    rating: form.get('rating') ?? 4.5, stock: form.get('stock'),
    isNew: form.get('isNew') === 'on', isBestseller: form.get('isBestseller') === 'on',
  })
  if (!parsed.success) return { error: 'Invalid product fields' }
  const d = parsed.data
  const base = {
    name: d.name, tagline: d.tagline || null,
    priceCents: Math.round(d.price * 100),
    originalPriceCents: d.originalPrice ? Math.round(d.originalPrice * 100) : null,
    category: d.category.toLowerCase().replace(/\s+/g, '-'),
    badge: d.badge || null, imageUrl: d.imageUrl || null,
    features: featuresFromCsv(d.features), rating: d.rating, stock: d.stock,
    isNew: d.isNew, isBestseller: d.isBestseller,
  }
  try {
    if (id) {
      await prisma.product.update({ where: { id }, data: base })
    } else {
      // Ensure unique slug.
      let slug = slugify(d.name)
      let n = 2
      while (await prisma.product.findUnique({ where: { slug } })) slug = `${slugify(d.name)}-${n++}`
      await prisma.product.create({ data: { ...base, slug } })
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
  revalidatePath('/admin/shop')
  revalidatePath('/search')
  return { ok: true as const }
}

export async function toggleProductAction(id: string) {
  await requireAdmin()
  const p = await prisma.product.findUnique({ where: { id }, select: { isActive: true } })
  if (!p) return { error: 'Not found' }
  await prisma.product.update({ where: { id }, data: { isActive: !p.isActive } })
  revalidatePath('/admin/shop')
  revalidatePath('/search')
  return { ok: true as const }
}

export async function deleteProductAction(id: string) {
  await requireAdmin()
  const used = await prisma.shopOrderItem.count({ where: { productId: id } })
  if (used > 0) {
    // Keep order history intact — soft-disable instead.
    await prisma.product.update({ where: { id }, data: { isActive: false, stock: 0 } })
  } else {
    await prisma.product.delete({ where: { id } })
  }
  revalidatePath('/admin/shop')
  revalidatePath('/search')
  return { ok: true as const }
}

const STATUS = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED'] as const

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELED'],
  PAID: ['SHIPPED', 'REFUNDED', 'CANCELED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELED: [],
  REFUNDED: [],
}

export async function updateShopOrderAction(orderId: string, status: string) {
  const session = await requireAdmin()
  if (!(STATUS as readonly string[]).includes(status)) return { error: 'Invalid status' }
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { status: true, items: { select: { productId: true, qty: true } } },
  })
  if (!order) return { error: 'Order not found' }
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
    return { error: `Cannot move ${order.status} → ${status}` }
  }
  await prisma.$transaction(async (tx) => {
    await tx.shopOrder.update({ where: { id: orderId }, data: { status: status as (typeof STATUS)[number] } })
    // Production: cancelled / refunded orders return stock automatically.
    if (status === 'CANCELED' || status === 'REFUNDED') {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.qty } } })
        }
      }
    }
  })
  await prisma.auditLog.create({
    data: {
      actorId: session.userId, action: `shop_order.${status.toLowerCase()}`,
      targetType: 'ShopOrder', targetId: orderId,
    },
  }).catch(() => {})
  revalidatePath('/admin/shop')
  return { ok: true as const }
}
