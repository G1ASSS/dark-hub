import { NextResponse } from 'next/server'
import { getActiveProducts } from '@/lib/shop/products'

export const dynamic = 'force-dynamic'

/** Public shop catalog — DB-backed, admin-managed. */
export async function GET() {
  try {
    const products = await getActiveProducts()
    return NextResponse.json({ data: products, total: products.length })
  } catch (err) {
    console.error('[api/shop/products]', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
