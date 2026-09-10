// Dark Hubb - Mock data for UI development
import type { VideoCardData, CreatorCardData, CategoryData } from '@/types'

export const MOCK_CREATORS: CreatorCardData[] = [
  {
    id: 'creator-1',
    slug: 'aurora-vale',
    displayName: 'Aurora Vale',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=aurora',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    bio: 'Award-winning content creator. Exclusive premium productions.',
    isVerified: true,
    subscriberCount: 284000,
    totalVideos: 47,
    totalViews: 12400000,
  },
  {
    id: 'creator-2',
    slug: 'neon-nights',
    displayName: 'Neon Nights',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=neon',
    bannerUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f868?w=1200&q=80',
    bio: 'Cinematic productions with a focus on art and aesthetics.',
    isVerified: true,
    subscriberCount: 156000,
    totalVideos: 32,
    totalViews: 8100000,
  },
  {
    id: 'creator-3',
    slug: 'velvet-studio',
    displayName: 'Velvet Studio',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=velvet',
    bannerUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80',
    bio: 'Professional studio. High production quality only.',
    isVerified: true,
    subscriberCount: 421000,
    totalVideos: 89,
    totalViews: 31000000,
  },
  {
    id: 'creator-4',
    slug: 'luna-arc',
    displayName: 'Luna Arc',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=luna',
    bannerUrl: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=1200&q=80',
    bio: 'Independent creator. Authentic. Unscripted. Bold.',
    isVerified: false,
    subscriberCount: 67000,
    totalVideos: 18,
    totalViews: 2300000,
  },
  {
    id: 'creator-5',
    slug: 'obsidian-films',
    displayName: 'Obsidian Films',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=obsidian',
    bannerUrl: 'https://images.unsplash.com/photo-1509909756405-be0199881695?w=1200&q=80',
    bio: 'Premium cinematic productions. 4K. HDR. Lossless.',
    isVerified: true,
    subscriberCount: 312000,
    totalVideos: 61,
    totalViews: 19800000,
  },
  {
    id: 'creator-6',
    slug: 'prism-collective',
    displayName: 'Prism Collective',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=prism',
    bio: 'Creative collective. Multiple artists. One platform.',
    isVerified: true,
    subscriberCount: 198000,
    totalVideos: 124,
    totalViews: 44500000,
  },
]

export const MOCK_CATEGORIES: CategoryData[] = [
  { id: 'cat-1', name: 'Featured', slug: 'featured', videoCount: 2400 },
  { id: 'cat-2', name: 'Trending', slug: 'trending', videoCount: 890 },
  { id: 'cat-3', name: 'Couples', slug: 'couples', videoCount: 5600 },
  { id: 'cat-4', name: 'Solo', slug: 'solo', videoCount: 8900 },
  { id: 'cat-5', name: 'Art & Erotic', slug: 'art-erotic', videoCount: 1200 },
  { id: 'cat-6', name: 'LGBTQ+', slug: 'lgbtq', videoCount: 3400 },
  { id: 'cat-7', name: 'Indie', slug: 'indie', videoCount: 2100 },
  { id: 'cat-8', name: 'Cinematic', slug: 'cinematic', videoCount: 760 },
  { id: 'cat-9', name: 'POV', slug: 'pov', videoCount: 4500 },
  { id: 'cat-10', name: 'New Creators', slug: 'new-creators', videoCount: 340 },
  { id: 'cat-11', name: 'Premium', slug: 'premium', videoCount: 1100 },
  { id: 'cat-12', name: 'Outdoor', slug: 'outdoor', videoCount: 980 },
]

/** Deterministic PRNG so SSR and client render identical mock data (no hydration mismatch). */
function seededDaysAgo(seed: number): number {
  let h = (seed * 2654435761) % 4294967296
  h ^= h >> 15
  h = (h * 2246822519) % 4294967296
  h ^= h >> 13
  return Math.abs(h) % 365
}

function makeThumbnail(seed: number): string {
  const unsplashIds = [
    'photo-1516035069371-29a1b244cc32',
    'photo-1574375927938-d5a98e8ffe85',
    'photo-1518609878373-06d740f60d8b',
    'photo-1509909756405-be0199881695',
    'photo-1558591710-4b4a1ae0f868',
    'photo-1618005182384-a83a8bd57fbe',
    'photo-1536440136628-849c177e76a1',
    'photo-1535016120720-40c646be5580',
    'photo-1498503182468-3b51cbb6cb24',
    'photo-1485846234645-a62644f84728',
    'photo-1478720568477-152d9b164e26',
    'photo-1489599849927-2ee91cede3ba',
  ]
  return `https://images.unsplash.com/${unsplashIds[seed % unsplashIds.length]}?w=640&q=80`
}

function makeVideo(i: number): VideoCardData {
  const creators = MOCK_CREATORS
  const creator = creators[i % creators.length]
  const durations = [480, 720, 1200, 1800, 2400, 900, 660, 3600]
  const viewCounts = [12400, 89000, 234000, 1200000, 560000, 45000, 7800, 2100000]
  const titles = [
    'Golden Hour',
    'Midnight Solstice',
    'Velvet Dreams',
    'The Art of Desire',
    'Neon Symphony',
    'Obsidian Shores',
    'Prism of Light',
    'Aurora Rising',
    'Crimson Tide',
    'Lust & Dust',
    'Ethereal Bloom',
    'Burning Glass',
    'Silver Lining',
    'Deep Current',
    'Electric Night',
    'Shadow Play',
    'Ivory Tower',
    'Wildfire',
    'Liquid Silk',
    'Serpentine',
  ]

  const daysAgo = seededDaysAgo(i + 1)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return {
    id: `video-${i + 1}`,
    title: titles[i % titles.length],
    thumbnailUrl: makeThumbnail(i),
    duration: durations[i % durations.length],
    views: viewCounts[i % viewCounts.length],
    publishedAt: date.toISOString(),
    creator: {
      id: creator.id,
      slug: creator.slug,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      isVerified: creator.isVerified,
    },
    categories: [MOCK_CATEGORIES[i % MOCK_CATEGORIES.length].name],
    status: 'PUBLISHED',
  }
}

export const MOCK_VIDEOS: VideoCardData[] = Array.from({ length: 40 }, (_, i) => makeVideo(i))

export const MOCK_TRENDING = MOCK_VIDEOS.slice(0, 12)
export const MOCK_NEW_RELEASES = MOCK_VIDEOS.slice(12, 24)
export const MOCK_MOST_WATCHED = [...MOCK_VIDEOS].sort((a, b) => b.views - a.views).slice(0, 12)
export const MOCK_CONTINUE_WATCHING = MOCK_VIDEOS.slice(0, 4).map((v, i) => ({
  ...v,
  progress: ((i * 53) % 80) + 10,
}))

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`
  return views.toString()
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
