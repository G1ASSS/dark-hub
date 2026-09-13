import { ProfileSection } from '@/components/dashboard/section-profile'

export const metadata = { title: 'Profile · Dark Hubb' }

export default function ProfilePage() {
  return (
    <div>
      <h2 className="text-lg font-bold">Profile</h2>
      <p className="mb-5 mt-0.5 text-xs text-muted-foreground">Name, avatar and bio</p>
      <ProfileSection />
    </div>
  )
}
