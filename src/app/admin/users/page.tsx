import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { UserBanButton } from '@/components/admin/mod-buttons'
import { TimeAgo } from '@/components/ui/time-ago'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, isBanned: true, createdAt: true,
      _count: { select: { favorites: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{users.length} shown (latest first)</p>
      </div>

      <form action="/admin/users" method="get" className="max-w-sm">
        <Input name="q" placeholder="Search username or email…" defaultValue={q ?? ''} />
      </form>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Mod</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">@{u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'ADMIN' ? 'verified' : 'outline'} className="text-[10px]">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!u.isActive ? (
                      <Badge variant="outline" className="text-[10px]">INACTIVE</Badge>
                    ) : u.isBanned ? (
                      <Badge variant="destructive" className="text-[10px]">BANNED</Badge>
                    ) : (
                      <Badge variant="new" className="text-[10px]">ACTIVE</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap" suppressHydrationWarning>
                    <TimeAgo date={u.createdAt.toISOString()} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex justify-end">
                      {u.role !== 'ADMIN' && <UserBanButton userId={u.id} banned={u.isBanned} />}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
