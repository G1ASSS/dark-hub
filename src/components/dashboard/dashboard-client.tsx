'use client'
import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  User, Heart, History, Crown, Settings, Shield, LogOut, Lock,
  Trash2, Download, Check, Loader2, Eye, Play,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CountUp } from '@/components/ui/count-up'
import { logout } from '@/actions/auth'
import { updateProfile, changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount } from '@/actions/account'
import { cn } from '@/lib/utils'
import { formatViews, formatDuration } from '@/lib/utils'
import type { VideoCardData } from '@/types'

export type DashboardInitial = {
  username: string
  email: string
  role: string
  displayName: string
  avatarUrl: string | null
  bio: string
  website: string
  location: string
  planSlug: string
  planName: string
  twoFactorEnabled: boolean
  counts: { favorites: number; history: number; downloads: number }
}

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'favourites', label: 'Favourites', icon: Heart },
  { id: 'history', label: 'History', icon: History },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'security', label: 'Security', icon: Lock },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const AVATAR_STYLES = ['avataaars', 'personas', 'notionists', 'lorelei', 'adventurer', 'big-smile']

function avatarFor(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

function initials(name: string) {
  return name.split(/[\s_]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

function PosterRail({ videos, emptyText }: { videos: VideoCardData[] | null; emptyText: string }) {
  if (videos === null) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-52 sm:w-60 shrink-0">
            <div className="skeleton aspect-video rounded-2xl" />
          </div>
        ))}
      </div>
    )
  }
  if (videos.length === 0) return <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 w-max">
        {videos.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link href={`/watch/${v.id}`} className="group block w-52 sm:w-60">
              <div className="relative aspect-video overflow-hidden rounded-2xl mb-2">
                <Image
                  src={v.thumbnailUrl}
                  alt={v.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="240px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full gradient-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-3.5 w-3.5 text-white ml-0.5" fill="white" />
                </div>
                {v.duration > 0 && (
                  <div className="absolute bottom-2 left-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {formatDuration(v.duration)}
                  </div>
                )}
              </div>
              <p className="truncate text-sm font-semibold group-hover:text-cyan transition-colors">{v.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" />{formatViews(v.views)}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function DashboardClient({ initial }: { initial: DashboardInitial }) {
  const [active, setActive] = useState<SectionId>('profile')
  const [favorites, setFavorites] = useState<VideoCardData[] | null>(null)
  const [history, setHistory] = useState<VideoCardData[] | null>(null)
  const [avatar, setAvatar] = useState(initial.avatarUrl ?? '')
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, undefined)
  const [passState, passAction, passPending] = useActionState(changePassword, undefined)
  const [totpState, totpAction, totpPending] = useActionState(confirmTwoFactor, undefined)
  const [disableState, disableAction, disablePending] = useActionState(disableTwoFactor, undefined)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, undefined)
  const [qr, setQr] = useState<{ qr: string; manualKey: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const justEnabled = totpState?.message === 'Two-factor authentication is on.'
  const justDisabled = disableState?.message === 'Two-factor authentication is off.'
  const twoFA = justDisabled ? false : justEnabled ? true : initial.twoFactorEnabled
  const showQr = qr && !justEnabled ? qr : null

  // Lazy-load lists + spy on the visible section
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/favorites').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/history').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([f, h]) => {
        if (cancelled) return
        setFavorites(f?.data ?? [])
        setHistory(h?.data ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setFavorites([])
          setHistory([])
        }
      })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id as SectionId)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n !== null
    )
    nodes.forEach((n) => observer.observe(n))
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [])

  const jump = (id: SectionId) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const clearHistory = async () => {
    await fetch('/api/history', { method: 'DELETE' })
    setHistory([])
  }

  const start2FA = async () => {
    setQrLoading(true)
    try {
      const res = await fetch('/api/account/2fa/setup')
      const data = await res.json()
      if (data.qr) setQr(data)
    } finally {
      setQrLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10"
      >
        <div className="absolute inset-0 gradient-primary opacity-20" aria-hidden="true" />
        <motion.div
          aria-hidden="true"
          className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" aria-hidden="true" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 p-[3px] shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-[#0A0A0F]">
                  {avatar ? <AvatarImage src={avatar} alt={initial.displayName} /> : null}
                  <AvatarFallback className="text-lg font-bold">{initials(initial.displayName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl sm:text-2xl font-bold">{initial.displayName}</h1>
                  <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>{initial.planName}</Badge>
                  {initial.role !== 'USER' && <Badge variant="verified">{initial.role}</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">@{initial.username} · {initial.email}</p>
              </div>
            </div>
            <form action={logout}>
              <button
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-400 transition-all hover:scale-105 hover:bg-rose-500/20"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </form>
          </div>
          <div className="mt-5 flex gap-7">
            {[
              { label: 'favourites', value: initial.counts.favorites },
              { label: 'watched', value: initial.counts.history },
              { label: 'downloads', value: initial.counts.downloads },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-bold tabular-nums">
                  <CountUp value={s.value} />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {initial.planSlug === 'free' && (
            <Link href="/premium" className="mt-5 block">
              <Button className="w-full gap-2 btn-shine sm:w-auto sm:px-8">
                <Crown className="h-4 w-4" /> Go Premium
              </Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* ── Sticky section nav ───────────────────────────── */}
      <div className="sticky top-3 z-30 mb-8">
        <div
          className="flex gap-2 overflow-x-auto rounded-full border border-white/10 p-1.5"
          style={{
            scrollbarWidth: 'none',
            background: 'rgba(20,20,28,0.82)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
          }}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                  isActive ? 'gradient-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-10 pb-8">
        {/* ── Profile ── */}
        <section id="profile" className="scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="glass rounded-3xl border border-white/10 p-6"
          >
            <h2 className="mb-1 text-lg font-bold">Profile</h2>
            <p className="mb-5 text-xs text-muted-foreground">How you appear on Dark Hubb</p>
            <form action={profileAction} className="space-y-5">
              <div>
                <Label className="mb-2 block">Avatar</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className={cn('h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold transition-all hover:scale-105', !avatar ? 'border-cyan' : 'border-white/10 hover:border-white/30')}
                    title="Initials"
                  >
                    {initials(initial.displayName)}
                  </button>
                  {AVATAR_STYLES.map((s) => {
                    const url = avatarFor(s, initial.username)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAvatar(url)}
                        className={cn('h-12 w-12 rounded-full border-2 overflow-hidden transition-all hover:scale-105', avatar === url ? 'border-cyan scale-105' : 'border-white/10 hover:border-white/30')}
                        title={s}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={s} className="h-full w-full" />
                      </button>
                    )
                  })}
                </div>
                <input type="hidden" name="avatarUrl" value={avatar} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" name="displayName" defaultValue={initial.displayName} minLength={2} maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input value={`@${initial.username}`} disabled className="opacity-60" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={500} placeholder="Tell us about yourself…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" defaultValue={initial.website} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" defaultValue={initial.location} maxLength={100} placeholder="City, Country" />
                </div>
              </div>
              {profileState?.errors && (
                <p className="text-xs text-rose-400">{Object.values(profileState.errors).flat().filter(Boolean).join(' ')}</p>
              )}
              {profileState?.message && (
                <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" />{profileState.message}</p>
              )}
              <Button type="submit" loading={profilePending}>Save Changes</Button>
            </form>
          </motion.div>
        </section>

        {/* ── Favourites ── */}
        <section id="favourites" className="scroll-mt-24">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Favourites</h2>
              <p className="text-xs text-muted-foreground">Videos you hearted</p>
            </div>
          </div>
          <PosterRail videos={favorites} emptyText="Tap the heart on any video to save it here." />
        </section>

        {/* ── History ── */}
        <section id="history" className="scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">History</h2>
                <p className="text-xs text-muted-foreground">What you watched</p>
              </div>
            </div>
            {(history?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-rose-400 hover:text-rose-300" onClick={clearHistory}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
          <PosterRail videos={history} emptyText="Videos you watch will appear here." />
        </section>

        {/* ── Premium ── */}
        <section id="premium" className="scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-3xl border border-violet-500/25 p-6"
          >
            <div className="absolute inset-0 gradient-primary opacity-15" aria-hidden="true" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <motion.div
                animate={{ rotate: [0, -6, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary"
              >
                <Crown className="h-7 w-7 text-white" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{initial.planName}</h2>
                  <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>Current</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {initial.planSlug === 'free'
                    ? 'Streaming up to 480p. Premium unlocks 1080p, downloads and priority access.'
                    : 'Higher quality, downloads and priority access are active.'}{' '}
                  <strong className="text-foreground">{initial.counts.downloads}</strong> downloads on record.
                </p>
              </div>
              {initial.planSlug === 'free' && (
                <Link href="/premium" className="shrink-0"><Button className="btn-shine">Upgrade</Button></Link>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── Security ── */}
        <section id="security" className="scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="glass rounded-3xl border border-white/10 p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/15 text-slate-300">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">Security</h2>
                <p className="text-xs text-muted-foreground">Password and two-factor authentication</p>
              </div>
            </div>
            <form action={passAction} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="cur">Current</Label><Input id="cur" name="currentPassword" type="password" autoComplete="current-password" required /></div>
              <div className="space-y-1.5"><Label htmlFor="new">New</Label><Input id="new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
              <div className="space-y-1.5"><Label htmlFor="conf">Confirm</Label><Input id="conf" name="confirmPassword" type="password" autoComplete="new-password" required /></div>
              <div className="sm:col-span-3">
                {passState?.errors && <p className="mb-2 text-xs text-rose-400">{Object.values(passState.errors).flat().filter(Boolean).join(' ')}</p>}
                {passState?.message && <p className="mb-2 text-xs text-emerald-400">{passState.message}</p>}
                <Button type="submit" size="sm" loading={passPending}>Update Password</Button>
              </div>
            </form>
            <Separator className="mb-5" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Authenticator-app codes at sign in</p>
                </div>
              </div>
              <Badge variant={twoFA ? 'new' : 'secondary'}>{twoFA ? 'On' : 'Off'}</Badge>
            </div>
            {!twoFA ? (
              !showQr ? (
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={start2FA} disabled={qrLoading}>
                  {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Enable 2FA
                </Button>
              ) : (
                <form action={totpAction} className="mt-3 max-w-sm space-y-3 rounded-2xl border border-white/10 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={showQr.qr} alt="2FA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
                  <p className="break-all text-xs text-muted-foreground">Manual key: <span className="font-mono text-foreground">{showQr.manualKey}</span></p>
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Confirm with a code</Label>
                    <Input id="code" name="code" inputMode="numeric" placeholder="6-digit code" required maxLength={6} />
                  </div>
                  {totpState?.message && <p className="text-xs text-muted-foreground">{totpState.message}</p>}
                  <Button type="submit" size="sm" loading={totpPending}>Confirm & Enable</Button>
                </form>
              )
            ) : (
              <form action={disableAction} className="mt-3 flex max-w-sm gap-2">
                <Input name="password" type="password" placeholder="Current password" required className="flex-1" />
                <Button type="submit" variant="outline" size="sm" loading={disablePending}>Disable</Button>
              </form>
            )}
            {disableState?.message && <p className="mt-2 text-xs text-muted-foreground">{disableState.message}</p>}
            <p className="mt-4 text-xs text-muted-foreground">Signed in as {initial.email} — contact support to change your email.</p>
          </motion.div>
        </section>

        {/* ── Danger ── */}
        <section id="danger" className="scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-6"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight text-rose-300">Danger Zone</h2>
                <p className="text-xs text-muted-foreground">Export first — deletion cannot be undone</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/api/account/export" download>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export My Data</Button>
              </a>
              {!confirmDelete ? (
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete My Account
                </Button>
              ) : (
                <form action={deleteAction} className="flex flex-1 min-w-[240px] gap-2">
                  <Input name="password" type="password" placeholder="Confirm with password" required className="flex-1" />
                  <Button type="submit" variant="destructive" size="sm" loading={deletePending}>Confirm</Button>
                </form>
              )}
            </div>
            {deleteState?.message && <p className="mt-2 text-xs text-rose-400">{deleteState.message}</p>}
          </motion.div>
        </section>
      </div>
    </div>
  )
}
