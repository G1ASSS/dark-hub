'use client'
import { useState, useActionState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/brand/logo'
import { signup } from '@/actions/auth'

export function RegisterForm() {
  const [state, action, pending] = useActionState(signup, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const strength =
    password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : password.length > 0 ? 'weak' : ''

  return (
    <div className="mx-auto max-w-sm">
      <div className="glass rounded-2xl border border-white/10 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <Logo size={40} />
            <span className="font-semibold text-xl gradient-text">Dark Hubb</span>
          </Link>
          <h1 className="text-xl font-bold">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join millions of adult viewers</p>
        </div>

        {/* Age warning */}
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80">
            This platform is <strong className="text-amber-400">strictly 18+</strong>. By registering, you confirm you are an adult.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-reg">Email</Label>
            <Input id="email-reg" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            {state?.errors?.email && (
              <p className="text-xs text-rose-400">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username-reg">Username</Label>
            <Input id="username-reg" name="username" type="text" placeholder="yourname" required minLength={3} maxLength={30} autoComplete="username" />
            {state?.errors?.username && (
              <p className="text-xs text-rose-400">{state.errors.username[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password-reg">Password</Label>
            <div className="relative">
              <Input
                id="password-reg"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="pr-10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {strength && (
              <div className="flex gap-1 mt-1">
                {['weak', 'medium', 'strong'].map((s, i) => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${['weak', 'medium', 'strong'].indexOf(strength) >= i ? (strength === 'weak' ? 'bg-rose-500' : strength === 'medium' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-white/10'}`} />
                ))}
              </div>
            )}
            {state?.errors?.password && (
              <ul className="text-xs text-rose-400 space-y-0.5">
                {state.errors.password.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <div className="mt-0.5 relative">
                <input type="checkbox" name="ageConfirmed" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="sr-only peer" id="age-reg" />
                <div className="h-[18px] w-[18px] rounded border border-white/20 bg-white/5 flex items-center justify-center peer-checked:gradient-primary peer-checked:border-transparent transition-all">
                  {ageConfirmed && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">
                I confirm I am <strong className="text-foreground">18 years of age or older</strong>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <div className="mt-0.5 relative">
                <input type="checkbox" name="termsAccepted" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="sr-only peer" id="terms-reg" />
                <div className="h-[18px] w-[18px] rounded border border-white/20 bg-white/5 flex items-center justify-center peer-checked:gradient-primary peer-checked:border-transparent transition-all">
                  {termsAccepted && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link href="/legal/terms-of-service" className="text-violet-400 hover:underline" target="_blank">Terms</Link>
                {' '}and{' '}
                <Link href="/legal/privacy-policy" className="text-violet-400 hover:underline" target="_blank">Privacy Policy</Link>
              </span>
            </label>
            {(state?.errors?.ageConfirmed || state?.errors?.termsAccepted) && (
              <p className="text-xs text-rose-400">You must confirm you are 18+ and accept the terms.</p>
            )}
          </div>

          {state?.message && (
            <p role="alert" className="text-sm text-rose-400 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5">
              {state.message}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending} disabled={!ageConfirmed || !termsAccepted} className="w-full gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span>Email verification required · Secure · Private</span>
        </div>
      </div>
    </div>
  )
}
