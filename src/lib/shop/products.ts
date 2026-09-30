import 'server-only'
import { prisma } from '@/lib/db/prisma'

export interface ShopProductDTO {
  id: string
  name: string
  slug: string
  tagline: string | null
  price: number
  originalPrice: number | null
  category: string
  badge: string | null
  badgeColor: string | null
  image: string
  gradient: string
  glow: string
  features: string[]
  rating: number
  reviews: number
  stock: number
  isNew: boolean
  isBestseller: boolean
}

export function toShopProductDTO(p: {
  id: string; name: string; slug: string; tagline: string | null
  priceCents: number; originalPriceCents: number | null; category: string
  badge: string | null; badgeColor: string | null; imageUrl: string | null
  gradient: string | null; glow: string | null; features: string[]
  rating: number; reviews: number; stock: number; isNew: boolean; isBestseller: boolean
}): ShopProductDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    price: p.priceCents / 100,
    originalPrice: p.originalPriceCents != null ? p.originalPriceCents / 100 : null,
    category: p.category,
    badge: p.badge,
    badgeColor: p.badgeColor,
    image: p.imageUrl ?? '/shop-hero.jpg',
    gradient: p.gradient ?? 'from-violet-600/30 via-fuchsia-600/20 to-pink-600/30',
    glow: p.glow ?? '0 0 40px rgba(125, 80, 240, 0.3)',
    features: p.features,
    rating: p.rating,
    reviews: p.reviews,
    stock: p.stock,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
  }
}

export async function getActiveProducts(): Promise<ShopProductDTO[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(toShopProductDTO)
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
