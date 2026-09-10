import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function hashPassword(password: string): Promise<string> {
  // Use bcryptjs for seeding
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Seeding database...')

  const categories = [
    { name: 'Featured', slug: 'featured' },
    { name: 'Trending', slug: 'trending' },
    { name: 'Couples', slug: 'couples' },
    { name: 'Solo', slug: 'solo' },
    { name: 'Art & Erotic', slug: 'art-erotic' },
    { name: 'LGBTQ+', slug: 'lgbtq' },
    { name: 'Indie', slug: 'indie' },
    { name: 'Cinematic', slug: 'cinematic' },
    { name: 'POV', slug: 'pov' },
    { name: 'New Creators', slug: 'new-creators' },
    { name: 'Premium', slug: 'premium' },
    { name: 'Outdoor', slug: 'outdoor' },
    { name: 'BDSM', slug: 'bdsm' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat })
  }
  console.log(`✅ ${categories.length} categories seeded`)

  const plans = [
    {
      slug: 'free',
      name: 'Free',
      priceCents: 0,
      currency: 'USD',
      maxQuality: '480p',
      allowDownload: false,
      dailyDownloadLimit: 0,
    },
    {
      slug: 'premium',
      name: 'Premium',
      priceCents: Number(process.env.PREMIUM_PRICE_CENTS ?? 999),
      currency: 'USD',
      maxQuality: '1080p',
      allowDownload: true,
      dailyDownloadLimit: Number(process.env.PREMIUM_DAILY_DOWNLOAD_LIMIT ?? 20),
    },
  ]
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan })
  }
  console.log(`✅ ${plans.length} plans seeded (free, premium)`)

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@darkhubb.com'
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!adminExists) {
    const passwordHash = await hashPassword(process.env.ADMIN_INITIAL_PASSWORD ?? 'Admin@DarkHubb2025!')
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin',
        passwordHash,
        role: 'ADMIN',
        emailVerified: new Date(),
        profile: { create: { displayName: 'Dark Hubb Admin' } },
      },
    })
    console.log(`✅ Admin user created: ${adminEmail}`)
    console.log('⚠️  Change the admin password immediately after first login!')
  } else {
    console.log('ℹ️  Admin user already exists, skipping')
  }

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
