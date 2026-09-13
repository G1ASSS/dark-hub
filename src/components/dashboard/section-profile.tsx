'use client'
import { useState, useActionState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProfile } from '@/actions/account'
import { cn } from '@/lib/utils'
import { useAccount } from './account-context'

const AVATAR_STYLES = ['avataaars', 'personas', 'notionists', 'lorelei', 'adventurer', 'big-smile']

function avatarFor(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

function initials(name: string) {
  return name.split(/[\s_]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function ProfileSection() {
  const initial = useAccount()
  const [avatar, setAvatar] = useState(initial.avatarUrl ?? '')
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, undefined)

  return (
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
  )
}
