'use client'
import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Heart, History, Crown, Settings, Shield, LogOut, Lock,
  Trash2, Download, Check, Loader2,
} from 'lucide-react'
import { VideoGrid } from '@/components/video/video-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { logout } from '@/actions/auth'
import { updateProfile, changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount } from '@/actions/account'
import { cn } from '@/lib/utils'
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

type Tab = 'profile' | 'favorites' | 'history' | 'premium' | 'settings' | 'privacy'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'favorites', label: 'Favourites', icon: Heart },
  { id: 'history', label: 'History', icon: History },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'privacy', label: 'Privacy', icon: Shield },
]

const AVATAR_STYLES = ['avataaars', 'personas', 'notionists', 'lorelei', 'adventurer', 'big-smile']

function avatarFor(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

function initials(name: string) {
  return name.split(/[\s_]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function DashboardClient({ initial }: { initial: DashboardInitial }) {
  const [tab, setTab] = useState<Tab>('profile')
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

  // 2FA state derives from the server-confirmed actions (no effect syncs)
  const justEnabled = totpState?.message === 'Two-factor authentication is on.'
  const justDisabled = disableState?.message === 'Two-factor authentication is off.'
  const twoFA = justDisabled ? false : justEnabled ? true : initial.twoFactorEnabled
  const showQr = qr && !justEnabled ? qr : null

  // Load lists lazily on first open
  useEffect(() => {
    if (tab === 'favorites' && favorites === null) {
      fetch('/api/favorites').then((r) => r.json()).then((d) => setFavorites(d.data ?? [])).catch(() => setFavorites([]))
    }
    if (tab === 'history' && history === null) {
      fetch('/api/history').then((r) => r.json()).then((d) => setHistory(d.data ?? [])).catch(() => setHistory([]))
    }
  }, [tab, favorites, history])

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
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 mb-8">
        <div className="absolute inset-0 gradient-primary opacity-25" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 p-6 sm:p-8">
          <Avatar className="h-20 w-20 border-2 border-white/20">
            {avatar ? <AvatarImage src={avatar} alt={initial.displayName} /> : null}
            <AvatarFallback className="text-xl font-bold">{initials(initial.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{initial.displayName}</h1>
              <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>{initial.planName}</Badge>
              {initial.role !== 'USER' && <Badge variant="verified">{initial.role}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">@{initial.username} · {initial.email}</p>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{initial.counts.favorites}</strong> favourites</span>
              <span><strong className="text-foreground">{initial.counts.history}</strong> watched</span>
              <span><strong className="text-foreground">{initial.counts.downloads}</strong> downloads</span>
            </div>
          </div>
          {initial.planSlug === 'free' && (
            <Link href="/premium">
              <Button className="gap-2 shrink-0"><Crown className="h-4 w-4" /> Go Premium</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dash-tab"
                    className="absolute inset-0 rounded-xl bg-cyan-subtle border border-cyan/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0 relative" />
                <span className="relative">{t.label}</span>
              </button>
            )
          })}
          <Separator className="my-2" />
          <form action={logout}>
            <button className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/5 transition-colors">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Profile ── */}
              {tab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <form action={profileAction} className="glass rounded-2xl p-6 space-y-5">
                    <div>
                      <Label className="mb-2 block">Avatar</Label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setAvatar('')}
                          className={cn('h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold transition-all', !avatar ? 'border-cyan' : 'border-white/10 hover:border-white/30')}
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
                              className={cn('h-12 w-12 rounded-full border-2 overflow-hidden transition-all', avatar === url ? 'border-cyan scale-105' : 'border-white/10 hover:border-white/30')}
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
                </div>
              )}

              {/* ── Favourites ── */}
              {tab === 'favorites' && (
                <div>
                  <h2 className="text-lg font-semibold mb-5">Favourites</h2>
                  <VideoGrid videos={favorites ?? []} loading={favorites === null} />
                  {favorites?.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Tap the heart on any video to save it here.</p>
                  )}
                </div>
              )}

              {/* ── History ── */}
              {tab === 'history' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">Watch History</h2>
                    {(history?.length ?? 0) > 0 && (
                      <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 gap-1.5" onClick={clearHistory}>
                        <Trash2 className="h-4 w-4" /> Clear All
                      </Button>
                    )}
                  </div>
                  <VideoGrid videos={history ?? []} loading={history === null} />
                  {history?.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Videos you watch will appear here.</p>
                  )}
                </div>
              )}

              {/* ── Premium ── */}
              {tab === 'premium' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Membership</h2>
                  <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shrink-0">
                      <Crown className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{initial.planName}</h3>
                        <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>Current</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {initial.planSlug === 'free'
                          ? 'Streaming up to 480p. Premium unlocks 1080p, downloads and priority access.'
                          : 'Higher quality, downloads and priority access are active on your account.'}
                      </p>
                    </div>
                    {initial.planSlug === 'free' && (
                      <Link href="/premium" className="shrink-0"><Button>Upgrade</Button></Link>
                    )}
                  </div>
                  <div className="glass rounded-2xl p-6 flex items-center gap-4">
                    <Download className="h-5 w-5 text-cyan shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{initial.counts.downloads}</strong> premium downloads on record.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Settings ── */}
              {tab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Account Settings</h2>
                  <div className="glass rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="font-medium mb-1">Email</h3>
                      <p className="text-sm text-muted-foreground mb-3">{initial.email} — contact support to change your email address.</p>
                    </div>
                    <Separator />
                    <form action={passAction}>
                      <h3 className="font-medium mb-4">Change Password</h3>
                      <div className="space-y-3 max-w-md">
                        <div className="space-y-1.5"><Label htmlFor="cur">Current Password</Label><Input id="cur" name="currentPassword" type="password" autoComplete="current-password" required /></div>
                        <div className="space-y-1.5"><Label htmlFor="new">New Password</Label><Input id="new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
                        <div className="space-y-1.5"><Label htmlFor="conf">Confirm Password</Label><Input id="conf" name="confirmPassword" type="password" autoComplete="new-password" required /></div>
                        {passState?.errors && <p className="text-xs text-rose-400">{Object.values(passState.errors).flat().filter(Boolean).join(' ')}</p>}
                        {passState?.message && <p className="text-xs text-emerald-400">{passState.message}</p>}
                        <Button type="submit" size="sm" loading={passPending}>Update Password</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Privacy ── */}
              {tab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Privacy & Data</h2>
                  <div className="glass rounded-2xl p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">Two-Factor Authentication</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">Authenticator-app codes at sign in</p>
                        </div>
                        <Badge variant={twoFA ? 'new' : 'secondary'}>{twoFA ? 'On' : 'Off'}</Badge>
                      </div>
                      {!twoFA ? (
                        !showQr ? (
                          <Button variant="outline" size="sm" className="gap-2" onClick={start2FA} disabled={qrLoading}>
                            {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Enable 2FA
                          </Button>
                        ) : (
                          <form action={totpAction} className="mt-3 max-w-sm space-y-3 rounded-xl border border-white/10 p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={showQr.qr} alt="2FA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
                            <p className="text-xs text-muted-foreground break-all">Manual key: <span className="font-mono text-foreground">{showQr.manualKey}</span></p>
                            <div className="space-y-1.5">
                              <Label htmlFor="code">Confirm with a code</Label>
                              <Input id="code" name="code" inputMode="numeric" placeholder="6-digit code" required maxLength={6} />
                            </div>
                            {totpState?.message && <p className="text-xs text-muted-foreground">{totpState.message}</p>}
                            <Button type="submit" size="sm" loading={totpPending}>
                              Confirm & Enable
                            </Button>
                          </form>
                        )
                      ) : (
                        <form action={disableAction} className="mt-3 flex max-w-sm gap-2">
                          <Input name="password" type="password" placeholder="Current password" required className="flex-1" />
                          <Button type="submit" variant="outline" size="sm" loading={disablePending}>Disable</Button>
                        </form>
                      )}
                      {disableState?.message && <p className="text-xs text-muted-foreground mt-2">{disableState.message}</p>}
                    </div>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-sm mb-1">Data Export</h3>
                      <p className="text-xs text-muted-foreground mb-3">Download everything stored about you (JSON)</p>
                      <a href="/api/account/export" download>
                        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export My Data</Button>
                      </a>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-sm text-rose-400 mb-1">Delete Account</h3>
                      <p className="text-xs text-muted-foreground mb-3">Deactivates your account immediately. This cannot be undone.</p>
                      {!confirmDelete ? (
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => setConfirmDelete(true)}>
                          <Trash2 className="h-4 w-4" /> Delete My Account
                        </Button>
                      ) : (
                        <form action={deleteAction} className="flex max-w-sm gap-2">
                          <Input name="password" type="password" placeholder="Confirm with password" required className="flex-1" />
                          <Button type="submit" variant="destructive" size="sm" loading={deletePending}>Confirm</Button>
                        </form>
                      )}
                      {deleteState?.message && <p className="text-xs text-rose-400 mt-2">{deleteState.message}</p>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
