import { AccountPageHeader } from '@/components/dashboard/account-page-header'
import { FavoritesSection } from '@/components/dashboard/section-favorites'

export const metadata = { title: 'Favorites · Dark Hubb' }

export default function FavoritesPage() {
  return (
    <div className="pb-8">
      <AccountPageHeader title="Favorites" subtitle="Videos you hearted" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <FavoritesSection />
        </div>
      </div>
    </div>
  )
}
