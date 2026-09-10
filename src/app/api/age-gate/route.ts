import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set('age_confirmed', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
