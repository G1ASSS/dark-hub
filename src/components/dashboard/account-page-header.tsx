import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function AccountPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Account
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
