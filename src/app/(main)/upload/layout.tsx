import { requireUploaderPage } from '@/lib/auth/upload-access'

export default async function UploadLayout({ children }: { children: React.ReactNode }) {
  await requireUploaderPage()
  return <>{children}</>
}
