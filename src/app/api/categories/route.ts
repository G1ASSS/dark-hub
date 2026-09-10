import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/categories'

/** Public category list with real published-video counts and covers. */
export async function GET() {
  try {
    return NextResponse.json({ data: await getCategories() })
  } catch (err) {
    console.error('[api/categories]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
