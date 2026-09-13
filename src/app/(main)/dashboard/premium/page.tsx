import { AccountPageHeader } from '@/components/dashboard/account-page-header'
import { PremiumSection } from '@/components/dashboard/section-premium'

export const metadata = { title: 'Premium · Dark Hubb' }

export default function PremiumPage() {
  return (
    <div className="pb-8">
      <AccountPageHeader title="Premium" subtitle="Plan and downloads" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <PremiumSection />
        </div>
      </div>
    </div>
  )
}
