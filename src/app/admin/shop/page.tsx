import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { TimeAgo } from '@/components/ui/time-ago'
import { upsertProductAction } from '@/actions/shop'
import { ProductRowButtons, OrderStatusButtons } from '@/components/admin/shop-buttons'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shop' }
export const dynamic = 'force-dynamic'

async function create(formData: FormData) {
  'use server'
  await upsertProductAction(null, formData)
}

export default async function AdminShopPage() {
  const [products, orders] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.shopOrder.findMany({
      orderBy: { createdAt: 'desc' }, take: 50,
      select: {
        id: true, email: true, name: true, city: true, payMethod: true,
        transactionRef: true, subtotalCents: true, shippingCents: true,
        totalCents: true, status: true, createdAt: true,
        items: { select: { name: true, qty: true, priceCents: true } },
      },
    }),
  ])

  const revenue = orders
    .filter((o) => ['PAID', 'SHIPPED', 'DELIVERED'].includes(o.status))
    .reduce((a, o) => a + o.totalCents, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Shop — Products & Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {products.length} products · {orders.length} recent orders · ${(revenue / 100).toFixed(2)} captured revenue
        </p>
      </div>

      {/* Add product */}
      <form action={create} className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Add product (live on /search instantly)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input name="name" required placeholder="Name" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm col-span-2" />
          <input name="tagline" placeholder="Tagline" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm col-span-2" />
          <input name="price" required type="number" step="0.01" min="0.5" placeholder="Price USD" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="originalPrice" type="number" step="0.01" placeholder="Was USD (optional)" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="category" required placeholder="Category (vibrators…)" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="stock" required type="number" min="0" placeholder="Stock" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="badge" placeholder="Badge (🔥 Hot)" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="rating" type="number" step="0.1" min="0" max="5" placeholder="Rating 4.8" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm" />
          <input name="imageUrl" placeholder="Image /product-x.jpg" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm col-span-2" />
          <input name="features" placeholder="Features CSV (Waterproof, USB-C…)" className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm col-span-2" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="isNew" /> New</label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="isBestseller" /> Bestseller</label>
        </div>
        <button className="mt-4 rounded-xl gradient-primary px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">
          Add product
        </button>
      </form>

      {/* Products */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.slug} · ★ {p.rating} ({p.reviews})</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 tabular-nums">
                    ${(p.priceCents / 100).toFixed(2)}
                    {p.originalPriceCents && <span className="ml-2 text-xs text-muted-foreground line-through">${(p.originalPriceCents / 100).toFixed(2)}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.stock}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? 'new' : 'secondary'} className="text-[10px]">{p.isActive ? 'LIVE' : 'HIDDEN'}</Badge>
                  </td>
                  <td className="px-4 py-3"><ProductRowButtons id={p.id} isActive={p.isActive} /></td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No products — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-2">
          <h2 className="font-semibold">Orders (newest first)</h2>
          <p className="text-xs text-muted-foreground">Status flow: PENDING → PAID → SHIPPED → DELIVERED · stock decrements on order, no auto-restock on cancel.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/8">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Advance</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] align-top">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{o.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground"><TimeAgo date={o.createdAt.toISOString()} /></p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium break-all">{o.email}</p>
                    <p className="text-xs text-muted-foreground">{o.name} · {o.city} · {o.payMethod} {o.transactionRef ? `· ${o.transactionRef}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {o.items.map((i) => <p key={`${o.id}-${i.name}`}>{i.qty}× {i.name} (${(i.priceCents / 100).toFixed(0)})</p>)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold">${(o.totalCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                  <td className="px-4 py-3"><OrderStatusButtons orderId={o.id} status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No shop orders yet — place one from /search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
