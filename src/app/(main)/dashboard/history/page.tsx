import { HistorySection } from '@/components/dashboard/section-history'

export const metadata = { title: 'History · Dark Hubb' }

export default function HistoryPage() {
  return (
    <div>
      <h2 className="text-lg font-bold">History</h2>
      <p className="mb-5 mt-0.5 text-xs text-muted-foreground">What you watched</p>
      <HistorySection />
    </div>
  )
}
