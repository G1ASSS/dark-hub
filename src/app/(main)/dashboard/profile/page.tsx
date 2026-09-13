import { AccountPageHeader } from '@/components/dashboard/account-page-header'
import { ProfileSection } from '@/components/dashboard/section-profile'

export const metadata = { title: 'Profile · Dark Hubb' }

export default function ProfilePage() {
  return (
    <div className="pb-8">
      <AccountPageHeader title="Profile" subtitle="Name, avatar and bio" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <ProfileSection />
        </div>
      </div>
    </div>
  )
}
