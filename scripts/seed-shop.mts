import { prisma } from '../src/lib/db/prisma'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const PRODUCTS = [
  { id: 'p1', name: 'Aurora Pulse Wand', tagline: 'Whisper-quiet, 10 vibration modes', price: 89, originalPrice: 129, rating: 4.9, reviews: 2341, category: 'vibrators', badge: '🔥 Hot', badgeColor: 'from-rose-500 to-orange-500', image: '/product-aurora-wand.jpg', gradient: 'from-violet-600/30 via-fuchsia-600/20 to-pink-600/30', glow: '0 0 40px rgba(217, 70, 239, 0.35)', features: ['Waterproof', 'USB-C Charge', 'Body-safe Silicone'], isBestseller: true, stock: 14 },
  { id: 'p2', name: 'Velvet Crown Set', tagline: 'Premium bondage starter kit', price: 64, originalPrice: 89, rating: 4.8, reviews: 1872, category: 'bondage', badge: '👑 Premium', badgeColor: 'from-amber-500 to-yellow-400', image: '/product-velvet-crown.jpg', gradient: 'from-amber-600/25 via-orange-600/20 to-red-600/25', glow: '0 0 40px rgba(245, 158, 11, 0.3)', features: ['Vegan Leather', 'Satin Lining', '4-piece Set'], stock: 8 },
  { id: 'p3', name: 'NovaSense Gel Lube', tagline: 'Long-lasting, paraben-free formula', price: 24, rating: 4.7, reviews: 5102, category: 'lubricants', badge: '⚗️ Lab Tested', badgeColor: 'from-cyan-500 to-blue-500', image: '/product-nova-lube.jpg', gradient: 'from-cyan-600/25 via-sky-600/20 to-blue-600/25', glow: '0 0 40px rgba(6, 182, 212, 0.3)', features: ['Water-based', 'Condom safe', 'pH-balanced'], stock: 50 },
  { id: 'p4', name: 'Phantom Prostate Pro', tagline: 'Curved for targeted stimulation', price: 119, originalPrice: 159, rating: 4.9, reviews: 987, category: 'anal', badge: '✨ New', badgeColor: 'from-violet-500 to-cyan-400', image: '/product-phantom-pro.jpg', gradient: 'from-indigo-600/30 via-violet-600/20 to-cyan-600/30', glow: '0 0 40px rgba(99, 102, 241, 0.35)', features: ['Remote Control', '12 Modes', 'Rechargeable'], isNew: true, stock: 21 },
  { id: 'p5', name: 'Silk Secrets Lingerie', tagline: 'French lace, all-size inclusive', price: 49, rating: 4.6, reviews: 3210, category: 'lingerie', badge: '🌹 Romantic', badgeColor: 'from-rose-500 to-pink-400', image: '/product-silk-lingerie.jpg', gradient: 'from-rose-600/25 via-pink-600/20 to-fuchsia-600/25', glow: '0 0 40px rgba(244, 63, 94, 0.3)', features: ['XS–4XL', '100% Silk', 'Gift Wrapped'], stock: 30 },
  { id: 'p6', name: 'Cosmos Couples Kit', tagline: 'Sync via app, play anywhere', price: 149, originalPrice: 199, rating: 4.8, reviews: 1440, category: 'couples', badge: '💫 Featured', badgeColor: 'from-purple-500 to-violet-400', image: '/product-cosmos-kit.jpg', gradient: 'from-purple-600/30 via-violet-600/20 to-indigo-600/30', glow: '0 0 40px rgba(168, 85, 247, 0.35)', features: ['Long Distance', 'App Controlled', '5h Battery'], isBestseller: true, stock: 6 },
  { id: 'p7', name: 'Marble Massage Oil', tagline: 'Warming sensation, intoxicating scent', price: 32, rating: 4.5, reviews: 2870, category: 'lubricants', image: '/product-marble-oil.jpg', gradient: 'from-emerald-600/25 via-teal-600/20 to-cyan-600/25', glow: '0 0 40px rgba(16, 185, 129, 0.3)', features: ['Edible', 'Warming', '200ml bottle'], stock: 42 },
  { id: 'p8', name: 'Eclipse Clitoral Air', tagline: 'Air pulse technology, 11 intensities', price: 99, originalPrice: 139, rating: 5.0, reviews: 4320, category: 'vibrators', badge: '⭐ Top Rated', badgeColor: 'from-yellow-400 to-amber-500', image: '/product-eclipse-air.jpg', gradient: 'from-blue-600/25 via-indigo-600/20 to-violet-600/25', glow: '0 0 40px rgba(59, 130, 246, 0.35)', features: ['No-contact', 'Near-silent', 'Magnetic charge'], isBestseller: true, stock: 18 },
]

async function main() {
  console.log('Seeding shop products...')
  for (const [i, p] of PRODUCTS.entries()) {
    await prisma.product.upsert({
      where: { slug: slugify(p.name) },
      update: {
        name: p.name, tagline: p.tagline, priceCents: Math.round(p.price * 100),
        originalPriceCents: p.originalPrice ? Math.round(p.originalPrice * 100) : null,
        category: p.category, badge: (p as any).badge ?? null, badgeColor: (p as any).badgeColor ?? null,
        imageUrl: p.image, gradient: p.gradient, glow: p.glow, features: p.features,
        rating: p.rating, reviews: p.reviews, stock: p.stock,
        isNew: (p as any).isNew ?? false, isBestseller: (p as any).isBestseller ?? false,
        isActive: true, sortOrder: i,
      },
      create: {
        name: p.name, slug: slugify(p.name), tagline: p.tagline, priceCents: Math.round(p.price * 100),
        originalPriceCents: p.originalPrice ? Math.round(p.originalPrice * 100) : null,
        category: p.category, badge: (p as any).badge ?? null, badgeColor: (p as any).badgeColor ?? null,
        imageUrl: p.image, gradient: p.gradient, glow: p.glow, features: p.features,
        rating: p.rating, reviews: p.reviews, stock: p.stock,
        isNew: (p as any).isNew ?? false, isBestseller: (p as any).isBestseller ?? false,
        isActive: true, sortOrder: i,
      },
    })
  }
  const count = await prisma.product.count()
  console.log(`Done. ${count} products in DB.`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
