import { SecuritySection } from '@/components/dashboard/section-security'

export const metadata = { title: 'Security · Dark Hubb' }

export default function SecurityPage() {
  return (
    <div>
      <h2 className="text-lg font-bold">Security</h2>
      <p className="mb-5 mt-0.5 text-xs text-muted-foreground">Password, 2FA and data</p>
      <SecuritySection />
    </div>
  )
}
