"use client"
import { useState } from 'react'
import { User, Heart, History, Bookmark, Settings, Shield, Trash2, LogOut, Lock } from 'lucide-react'
import { VideoCard } from '@/components/video/video-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MOCK_VIDEOS, MOCK_CONTINUE_WATCHING } from '@/lib/mock-data'

type Tab = 'profile' | 'favorites' | 'history' | 'saved' | 'settings' | 'privacy'

const TABS = [
  { id: 'profile',   label: 'Profile',   icon: User },
  { id: 'favorites', label: 'Favourites', icon: Heart },
  { id: 'history',   label: 'History',   icon: History },
  { id: 'saved',     label: 'Saved',     icon: Bookmark },
  { id: 'settings',  label: 'Settings',  icon: Settings },
  { id: 'privacy',   label: 'Privacy',   icon: Shield },
] as const

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const mockUser = {
    username: 'john_doe',
    email: 'john@example.com',
    displayName: 'John Doe',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=johndoe',
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">My Account</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">

        {/* Sidebar */}
        <aside className="space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id as Tab)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-cyan-subtle text-cyan' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}>
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            )
          })}
          <Separator className="my-2" />
          <button className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/5 transition-colors">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </aside>

        {/* Content */}
        <div className="min-w-0">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={mockUser.avatarUrl} alt={mockUser.displayName} />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{mockUser.displayName}</h3>
                    <p className="text-sm text-muted-foreground">@{mockUser.username}</p>
                    <Button variant="outline" size="sm" className="mt-2">Change Avatar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Display Name</Label>
                    <Input defaultValue={mockUser.displayName} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input defaultValue={mockUser.username} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Bio</Label>
                    <Input placeholder="Tell us about yourself…" />
                  </div>
                </div>
                <Button className="mt-4">Save Changes</Button>
              </div>
            </div>
          )}

          {/* ── Favourites ── */}
          {tab === 'favorites' && (
            <div>
              <h2 className="text-lg font-semibold mb-5">Favourites</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MOCK_VIDEOS.slice(0, 8).map((v) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}

          {/* ── History ── */}
          {tab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">Watch History</h2>
                <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 gap-1.5">
                  <Trash2 className="h-4 w-4" /> Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...MOCK_CONTINUE_WATCHING, ...MOCK_VIDEOS.slice(0, 4)].map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          )}

          {/* ── Saved ── */}
          {tab === 'saved' && (
            <div>
              <h2 className="text-lg font-semibold mb-5">Saved Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MOCK_VIDEOS.slice(4, 12).map((v) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {tab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Account Settings</h2>
              <div className="glass rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Change Email</h3>
                  <div className="space-y-3 max-w-md">
                    <div className="space-y-1.5"><Label>Current Email</Label><Input type="email" defaultValue={mockUser.email} /></div>
                    <div className="space-y-1.5"><Label>New Email</Label><Input type="email" placeholder="new@example.com" /></div>
                    <Button size="sm">Update Email</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <div className="space-y-3 max-w-md">
                    <div className="space-y-1.5"><Label>Current Password</Label><Input type="password" /></div>
                    <div className="space-y-1.5"><Label>New Password</Label><Input type="password" /></div>
                    <div className="space-y-1.5"><Label>Confirm Password</Label><Input type="password" /></div>
                    <Button size="sm">Update Password</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Extra layer of security for your account</p>
                    </div>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2"><Lock className="h-4 w-4" /> Enable 2FA</Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {tab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Privacy & Data</h2>
              <div className="glass rounded-2xl p-6 space-y-5">
                {[
                  { label: 'Save watch history', desc: 'Remember what you\'ve watched', id: 'watch-history' },
                  { label: 'Personalised recommendations', desc: 'Use viewing history to suggest content', id: 'personalized' },
                  { label: 'Email notifications', desc: 'Receive platform updates via email', id: 'email-notifs' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <button className="relative h-6 w-11 rounded-full bg-cyan-subtle border border-cyan/30 transition-colors" role="switch" aria-checked="true">
                      <span className="absolute right-1 top-1 h-4 w-4 rounded-full gradient-primary transition-transform" />
                    </button>
                  </div>
                ))}
                <Separator />
                <div>
                  <h3 className="font-medium text-sm mb-1">Data Export</h3>
                  <p className="text-xs text-muted-foreground mb-3">Download a copy of all your data</p>
                  <Button variant="outline" size="sm">Request Data Export</Button>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium text-sm text-rose-400 mb-1">Delete Account</h3>
                  <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all data. This cannot be undone.</p>
                  <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="h-4 w-4" /> Delete My Account</Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
