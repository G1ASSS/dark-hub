import { PremiumSection } from '@/components/dashboard/section-premium'

export const metadata = { title: 'Premium · Dark Hubb' }

export default function PremiumPage() {
  return (
    <div>
      <h2 className="text-lg font-bold">Premium</h2>
      <p className="mb-5 mt-0.5 text-xs text-muted-foreground">Plan and downloads</p>
      <PremiumSection />
    </div>
  )
}
