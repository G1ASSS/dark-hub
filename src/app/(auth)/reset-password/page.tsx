'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok) setDone(true)
      else setError(data.error ?? 'Reset failed.')
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <h1 className="text-xl font-bold mb-2">Invalid link</h1>
        <p className="text-sm text-muted-foreground mb-6">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">Request a new one →</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Password changed</h1>
        <Link href="/login" className="text-sm text-violet-400 hover:text-violet-300 font-medium">Sign in with your new password →</Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-1">Choose a new password</h1>
      <p className="text-sm text-muted-foreground mb-6">8+ characters, an uppercase letter and a number.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-pass">New password</Label>
          <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" loading={loading} className="w-full gap-2" size="lg">
          <KeyRound className="h-4 w-4" /> Set New Password
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <div className="glass rounded-2xl border border-white/10 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <Suspense>
          <ResetInner />
        </Suspense>
      </div>
    </div>
  )
}
