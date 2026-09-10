import Link from 'next/link'
import { Zap, Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/6 py-8 mt-16">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/home" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-3.5 w-3.5 text-white" fill="white" />
            </div>
            <span className="font-semibold gradient-text">Dark Hubb</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/legal/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/legal/dmca" className="hover:text-white transition-colors">DMCA</Link>
            <Link href="/legal/content-policy" className="hover:text-white transition-colors">Content Policy</Link>
          </div>

          {/* 18+ badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              18+ Only · Adults Only
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Dark Hubb. All content is legal, consensual, and rights-owned.
        </div>
      </div>
    </footer>
  )
}
