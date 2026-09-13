import { FavoritesSection } from '@/components/dashboard/section-favorites'

export const metadata = { title: 'Favorites · Dark Hubb' }

export default function FavoritesPage() {
  return (
    <div>
      <h2 className="text-lg font-bold">Favorites</h2>
      <p className="mb-5 mt-0.5 text-xs text-muted-foreground">Videos you hearted</p>
      <FavoritesSection />
    </div>
  )
}
