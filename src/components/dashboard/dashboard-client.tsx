'use client'
import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Heart, History, Crown, Lock,
  Trash2, Download, Check, Loader2, ChevronDown, LogOut, Shield,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CountUp } from '@/components/ui/count-up'
import { logout } from '@/actions/auth'
import { updateProfile, changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount } from '@/actions/account'
import { cn } from '@/lib/utils'
import { formatViews, formatDuration } from '@/lib/utils'
import { Play, Eye } from 'lucide-react'
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

type SectionId = 'profile' | 'favorites' | 'history' | 'premium' | 'security'

const SECTIONS: { id: SectionId; label: string; desc: string; icon: typeof User; tile: string }[] = [
  { id: 'profile', label: 'Profile', desc: 'Name, avatar and bio', icon: User, tile: 'bg-violet-500/15 text-violet-300' },
  { id: 'favorites', label: 'Favourites', desc: 'Videos you hearted', icon: Heart, tile: 'bg-rose-500/15 text-rose-300' },
  { id: 'history', label: 'History', desc: 'What you watched', icon: History, tile: 'bg-cyan-500/15 text-cyan-300' },
  { id: 'premium', label: 'Premium', desc: 'Plan and downloads', icon: Crown, tile: 'bg-amber-500/15 text-amber-300' },
  { id: 'security', label: 'Security', desc: 'Password, 2FA and data', icon: Lock, tile: 'bg-emerald-500/15 text-emerald-300' },
]

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
            <Link href={`/watch/${v.slug ?? v.id}`} className="group block w-52 sm:w-60">
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
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
                    <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                  </div>
                </div>
                {v.duration > 0 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
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
  const [open, setOpen] = useState<SectionId | null>('profile')
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

  // Lazy-load lists when their section opens
  useEffect(() => {
    if (open === 'favorites' && favorites === null) {
      fetch('/api/favorites').then((r) => r.json()).then((d) => setFavorites(d.data ?? [])).catch(() => setFavorites([]))
    }
    if (open === 'history' && history === null) {
      fetch('/api/history').then((r) => r.json()).then((d) => setHistory(d.data ?? [])).catch(() => setHistory([]))
    }
  }, [open, favorites, history])

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

  const toggle = (id: SectionId) => setOpen((prev) => (prev === id ? null : id))

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
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
          className="absolute -top-20 right-[10%] h-56 w-56 rounded-full bg-cyan-500/25 blur-3xl"
          animate={{ x: [0, -28, 0], y: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" aria-hidden="true" />
        <div className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 p-[3px] shrink-0">
              <Avatar className="h-16 w-16 border-4 border-[#0A0A0F]">
                {avatar ? <AvatarImage src={avatar} alt={initial.displayName} /> : null}
                <AvatarFallback className="text-lg font-bold">{initials(initial.displayName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold">{initial.displayName}</h1>
                <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>{initial.planName}</Badge>
                {initial.role !== 'USER' && <Badge variant="verified">{initial.role}</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">@{initial.username}</p>
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
          <div className="mt-4 flex gap-7">
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
            <Link href="/premium" className="mt-4 block">
              <Button className="w-full gap-2 btn-shine"><Crown className="h-4 w-4" /> Go Premium</Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* ── Accordion sections ───────────────────────────── */}
      <div className="space-y-3 pb-8">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon
          const isOpen = open === s.id
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className={cn(
                'overflow-hidden rounded-3xl border transition-colors',
                isOpen ? 'border-white/15 bg-white/[0.04]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
              )}
            >
              <button
                onClick={() => toggle(s.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.tile)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold">{s.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.desc}</span>
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className={cn('h-5 w-5', isOpen ? 'text-white' : 'text-muted-foreground')} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                  >
                    <div className="border-t border-white/[0.07] p-4 sm:p-5">
                      {s.id === 'profile' && (
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
                              {AVATAR_STYLES.map((style) => {
                                const url = avatarFor(style, initial.username)
                                return (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => setAvatar(url)}
                                    className={cn('h-12 w-12 rounded-full border-2 overflow-hidden transition-all hover:scale-105', avatar === url ? 'border-cyan scale-105' : 'border-white/10 hover:border-white/30')}
                                    title={style}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={style} className="h-full w-full" />
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
                      )}

                      {s.id === 'favorites' && (
                        <PosterRail videos={favorites} emptyText="Tap the heart on any video to save it here." />
                      )}

                      {s.id === 'history' && (
                        <div>
                          {(history?.length ?? 0) > 0 && (
                            <div className="mb-3 flex justify-end">
                              <Button variant="ghost" size="sm" className="gap-1.5 text-rose-400 hover:text-rose-300" onClick={clearHistory}>
                                <Trash2 className="h-4 w-4" /> Clear All
                              </Button>
                            </div>
                          )}
                          <PosterRail videos={history} emptyText="Videos you watch will appear here." />
                        </div>
                      )}

                      {s.id === 'premium' && (
                        <div className="space-y-4">
                          <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 p-5">
                            <div className="absolute inset-0 gradient-primary opacity-15" aria-hidden="true" />
                            <div className="relative flex items-center gap-4">
                              <motion.div
                                animate={{ rotate: [0, -6, 6, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary"
                              >
                                <Crown className="h-6 w-6 text-white" />
                              </motion.div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold">{initial.planName}</p>
                                  <Badge variant={initial.planSlug === 'free' ? 'secondary' : 'hot'}>Current</Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {initial.planSlug === 'free'
                                    ? 'Streaming up to 480p. Premium unlocks 1080p and downloads.'
                                    : 'Higher quality and downloads are active.'}{' '}
                                  <strong className="text-foreground">{initial.counts.downloads}</strong> downloads on record.
                                </p>
                              </div>
                            </div>
                            {initial.planSlug === 'free' && (
                              <Link href="/premium" className="relative mt-4 block">
                                <Button className="w-full btn-shine">Upgrade</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {s.id === 'security' && (
                        <div className="space-y-6">
                          <form action={passAction}>
                            <h3 className="mb-3 text-sm font-bold">Change Password</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="space-y-1.5"><Label htmlFor="cur">Current</Label><Input id="cur" name="currentPassword" type="password" autoComplete="current-password" required /></div>
                              <div className="space-y-1.5"><Label htmlFor="new">New</Label><Input id="new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
                              <div className="space-y-1.5"><Label htmlFor="conf">Confirm</Label><Input id="conf" name="confirmPassword" type="password" autoComplete="new-password" required /></div>
                            </div>
                            {passState?.errors && <p className="mt-2 text-xs text-rose-400">{Object.values(passState.errors).flat().filter(Boolean).join(' ')}</p>}
                            {passState?.message && <p className="mt-2 text-xs text-emerald-400">{passState.message}</p>}
                            <Button type="submit" size="sm" loading={passPending} className="mt-3">Update Password</Button>
                          </form>

                          <div className="rounded-2xl border border-white/[0.07] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                                  <Shield className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold">Two-Factor Authentication</p>
                                  <p className="text-xs text-muted-foreground">Authenticator codes at sign in</p>
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
                                <form action={totpAction} className="mt-3 max-w-sm space-y-3">
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
                          </div>

                          <div className="rounded-2xl border border-white/[0.07] p-4">
                            <p className="text-sm font-bold">Your Data</p>
                            <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Signed in as {initial.email}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <a href="/api/account/export" download>
                                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                              </a>
                              {!confirmDelete ? (
                                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setConfirmDelete(true)}>
                                  <Trash2 className="h-4 w-4" /> Delete Account
                                </Button>
                              ) : (
                                <form action={deleteAction} className="flex flex-1 min-w-[220px] gap-2">
                                  <Input name="password" type="password" placeholder="Confirm with password" required className="flex-1" />
                                  <Button type="submit" variant="destructive" size="sm" loading={deletePending}>Confirm</Button>
                                </form>
                              )}
                            </div>
                            {deleteState?.message && <p className="mt-2 text-xs text-rose-400">{deleteState.message}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
