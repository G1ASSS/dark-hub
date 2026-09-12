'use client'
import { useState, useActionState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/actions/auth'

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="mx-auto max-w-sm">
      <div className="glass rounded-2xl border border-white/10 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-semibold text-xl gradient-text">Dark Hubb</span>
          </Link>
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            {state?.errors?.email && (
              <p className="text-xs text-rose-400">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-xs text-rose-400">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.totpRequired && (
            <div className="space-y-1.5 animate-slide-up">
              <Label htmlFor="totp">Two-factor code</Label>
              <Input
                id="totp"
                name="totpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                required
                maxLength={6}
                className="text-center tracking-[0.5em] font-mono"
              />
              <p className="text-xs text-muted-foreground">Open your authenticator app and enter the current code.</p>
            </div>
          )}

          {state?.message && (
            <p role="alert" className="text-sm text-rose-400 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5">
              {state.message}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full gap-2">
            <LogIn className="h-4 w-4" />
            {state?.totpRequired ? 'Verify & Sign In' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Create one free
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span>Secure login · 18+ platform · Adult content</span>
        </div>
      </div>
    </div>
  )
}
