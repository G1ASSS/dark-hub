'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export function CreateSeriesForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (title.trim().length < 2) return
    setBusy(true)
    setError(null)
    try {
      await api('/api/admin/series', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      setTitle('')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="New series title (e.g. Night Story)"
          className="flex-1"
          maxLength={120}
        />
        <Button onClick={create} disabled={busy || title.trim().length < 2} size="sm" className="gap-1.5 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  )
}

export function SeriesRowActions({ id, slug, status }: { id: string; slug: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const togglePublish = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/series/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete series (episodes unlink, videos stay)?`)) return
    setBusy(true)
    try {
      await api(`/api/admin/series/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="flex gap-1.5 items-center">
      <a
        href={`/series/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
        title="View public page"
      >
        <Eye className="h-4 w-4" />
      </a>
      <button
        className="h-7 px-2.5 flex items-center rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors text-[11px] font-semibold"
        disabled={busy}
        onClick={togglePublish}
        title={status === 'PUBLISHED' ? 'Unpublish (draft)' : 'Publish'}
      >
        {status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors disabled:opacity-40"
        disabled={busy}
        onClick={remove}
        title="Delete series"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  )
}
