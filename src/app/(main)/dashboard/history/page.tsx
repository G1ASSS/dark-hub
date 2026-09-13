import { AccountPageHeader } from '@/components/dashboard/account-page-header'
import { HistorySection } from '@/components/dashboard/section-history'

export const metadata = { title: 'History · Dark Hubb' }

export default function HistoryPage() {
  return (
    <div className="pb-8">
      <AccountPageHeader title="History" subtitle="What you watched" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <HistorySection />
        </div>
      </div>
    </div>
  )
}
