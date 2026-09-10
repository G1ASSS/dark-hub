"use client"
import { useState } from 'react'
import { Search, Shield, Ban, UserCheck, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const USERS = Array.from({ length: 25 }, (_, i) => ({
  id: `user-${i + 1}`,
  username: `user_${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['USER', 'CREATOR', 'MODERATOR', 'ADMIN'][i % 4],
  status: i % 8 === 0 ? 'BANNED' : i % 5 === 0 ? 'SUSPENDED' : 'ACTIVE',
  joinedAt: new Date(Date.now() - i * 86400000 * 10).toISOString(),
  videos: i % 4 === 1 ? (i * 37) % 50 : 0,
}))

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const filtered = USERS.filter(u => !search || u.username.includes(search) || u.email.includes(search))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="pl-9 max-w-md" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Videos</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className={`border-b border-white/4 hover:bg-white/3 ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'MODERATOR' ? 'verified' : 'outline'} className="text-[10px]">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${user.status === 'ACTIVE' ? 'text-emerald-400' : user.status === 'BANNED' ? 'text-rose-400' : 'text-amber-400'}`}>{user.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.videos}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(user.joinedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors" title="Verify"><UserCheck className="h-3.5 w-3.5" /></button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors" title="Suspend"><Shield className="h-3.5 w-3.5" /></button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors" title="Ban"><Ban className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
