import Link from 'next/link'
import Image from 'next/image'

export type CategoryTileData = {
  id: string
  name: string
  slug: string
  coverUrl: string | null
  videoCount: number
}

export function formatVideoCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K videos`
  return `${n} video${n === 1 ? '' : 's'}`
}

const FALLBACK_GRADIENTS = [
  'from-violet-600/30 to-purple-800/30',
  'from-cyan-600/30 to-blue-800/30',
  'from-blue-600/30 to-indigo-800/30',
  'from-teal-600/30 to-cyan-800/30',
  'from-indigo-600/30 to-violet-800/30',
  'from-sky-600/30 to-blue-800/30',
]

/**
 * Photo tile: admin-uploaded cover or latest video poster; elegant
 * gradient when the category has no imagery yet (never a fake photo).
 */
export function CategoryTile({
  slug,
  name,
  videoCount,
  coverUrl,
  index = 0,
  aspect = 'aspect-square',
}: {
  slug: string
  name: string
  videoCount: number
  coverUrl: string | null
  index?: number
  aspect?: string
}) {
  return (
    <Link
      href={`/search?category=${slug}`}
      className={`group relative rounded-2xl overflow-hidden ${aspect} flex flex-col justify-end p-3 sm:p-4 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] bg-white/[0.03]`}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 200px"
          unoptimized
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]}`}
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 rounded-2xl border border-white/8 group-hover:border-white/20 transition-colors" aria-hidden="true" />
      <div className="relative">
        <h3 className="font-semibold text-xs sm:text-sm leading-tight">{name}</h3>
        <p className="text-[10px] sm:text-xs text-white/55">{formatVideoCount(videoCount)}</p>
      </div>
    </Link>
  )
}
