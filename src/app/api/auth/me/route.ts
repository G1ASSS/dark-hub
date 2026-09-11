import { NextResponse } from 'next/server'
import { verifySession, getUser } from '@/lib/auth/dal'

/** Current signed-in user (display only) — 401 shape keeps clients simple. */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  const user = await getUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({
    user: {
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    },
  })
}
