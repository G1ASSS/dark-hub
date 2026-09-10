import { redirect } from 'next/navigation'

// Creator profiles are not publicly accessible on this platform
export default function CreatorPage() {
  redirect('/home')
}
