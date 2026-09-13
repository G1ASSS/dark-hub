import { AccountPageHeader } from '@/components/dashboard/account-page-header'
import { SecuritySection } from '@/components/dashboard/section-security'

export const metadata = { title: 'Security · Dark Hubb' }

export default function SecurityPage() {
  return (
    <div className="pb-8">
      <AccountPageHeader title="Security" subtitle="Password, 2FA and data" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <SecuritySection />
        </div>
      </div>
    </div>
  )
}
