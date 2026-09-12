import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/dal'
import { setupTwoFactor } from '@/actions/account'

/** Begin 2FA enrollment: QR code + manual key (enabled on confirm). */
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  try {
    return NextResponse.json(await setupTwoFactor())
  } catch (err) {
    console.error('[2fa/setup]', (err as Error).message)
    return NextResponse.json({ error: 'Could not start 2FA setup.' }, { status: 500 })
  }
}
