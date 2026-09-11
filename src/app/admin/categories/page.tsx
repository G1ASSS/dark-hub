'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ImagePlus, Loader2, Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Cat = {
  id: string
  name: string
  slug: string
  coverUrl: string | null
  videoCount: number
}

/**
 * Staff cover manager: pick a photo from this device per category.
 * Only photos YOU upload ever appear as covers.
 */
export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Cat[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const files = useRef<Record<string, File | null>>({})

  const load = useCallback(async () => {
    const res = await fetch('/api/categories')
    const data = (await res.json()) as { data?: Cat[] }
    setCats(data.data ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/categories')
      const data = (await res.json()) as { data?: Cat[] }
      if (!cancelled) setCats(data.data ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const upload = async (slug: string) => {
    const file = files.current[slug]
    if (!file) return
    setBusy(slug)
    setError(null)
    setDone(null)
    try {
      const res = await fetch(`/api/admin/categories/${slug}/cover`, {
        method: 'POST',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      files.current[slug] = null
      setFileNames((prev) => {
        const next = { ...prev }
        delete next[slug]
        return next
      })
      setDone(slug)
      await load()
      setTimeout(() => setDone(null), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const create = async () => {
    if (newName.trim().length < 2) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Create failed')
      setNewName('')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Categories & Covers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a cover photo per category from this device. Empty categories fall back to video posters, then art tiles.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-400 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="New category name (e.g. BDSM)"
          className="max-w-xs"
        />
        <Button onClick={create} disabled={creating || newName.trim().length < 2} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> {creating ? 'Adding…' : 'Add'}
        </Button>
      </div>

      {!cats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cats.map((c) => (
            <div key={c.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
              <div className="relative aspect-[2/3]">
                {c.coverUrl ? (
                  <Image src={c.coverUrl} alt={c.name} fill className="object-cover" sizes="300px" unoptimized />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/25 to-indigo-800/15 flex items-center justify-center">
                    <span className="text-5xl font-black text-white/10">{c.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
                  <p className="text-sm font-bold leading-tight">{c.name}</p>
                  <p className="text-[11px] text-white/55">
                    {c.videoCount} video{c.videoCount === 1 ? '' : 's'} · /{c.slug}
                  </p>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:border-white/25 transition-colors">
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {fileNames[c.slug] ?? 'Choose photo…'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      files.current[c.slug] = f
                      setFileNames((prev) => (f ? { ...prev, [c.slug]: f.name } : prev))
                      setDone(null)
                    }}
                  />
                </label>
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={busy === c.slug}
                  onClick={() => upload(c.slug)}
                >
                  {busy === c.slug ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : done === c.slug ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {done === c.slug ? 'Cover set!' : 'Set cover'}
                </Button>
                <Link
                  href={`/search?category=${c.slug}`}
                  className="block text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  View on site →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
