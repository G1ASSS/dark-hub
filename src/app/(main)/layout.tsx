import { Footer } from '@/components/layout/footer'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pt-4 pb-28">
        {children}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  )
}
