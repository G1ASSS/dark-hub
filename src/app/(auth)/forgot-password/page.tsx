"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="glass rounded-2xl border border-white/10 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-1">Reset password</h1>
            <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email address</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <Button type="submit" loading={loading} className="w-full gap-2" size="lg">
                <Mail className="h-4 w-4" /> Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
