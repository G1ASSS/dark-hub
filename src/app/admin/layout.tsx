import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { requireAdmin } from '@/lib/auth/dal'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin — Dark Hubb' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Secure check: verified session + current role from DB.
  // Proxy performs an optimistic JWT gate; this is authoritative.
  await requireAdmin()
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-6 pt-20 md:pt-6">
        {children}
      </main>
    </div>
  )
}
