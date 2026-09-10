import { getCategories } from '@/lib/categories'
import { CategoryTile } from '@/components/video/category-tile'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse all categories of adult content on Dark Hubb.',
}

// Catalog data changes with every upload — always render on request,
// and never fail the production build when the DB is unreachable.
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">All Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} of premium adult content
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat, i) => (
          <CategoryTile
            key={cat.id}
            slug={cat.slug}
            name={cat.name}
            videoCount={cat.videoCount}
            coverUrl={cat.coverUrl}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
