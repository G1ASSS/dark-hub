import { requireAdmin } from '@/lib/auth/dal'

export default async function UploadLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <>{children}</>
}
