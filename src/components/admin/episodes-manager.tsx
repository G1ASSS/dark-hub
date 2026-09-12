'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export type EpisodeRow = {
  id: string
  episodeNumber: number
  title: string
  description: string | null
  videoId: string
  videoTitle: string
  videoStatus: string
  duration: number | null
}

type VideoHit = { id: string; title: string; duration: number }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

/**
 * Staff episode manager: add existing videos, renumber (reorders),
 * rename, and unlink episodes.
 */
export function EpisodesManager({ seriesId, initial }: { seriesId: string; initial: EpisodeRow[] }) {
  const router = useRouter()
  const [episodes, setEpisodes] = useState(initial)
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<VideoHit[] | null>(null)
  const [picked, setPicked] = useState<VideoHit | null>(null)
  const [number, setNumber] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, { n: string; t: string }>>({})

  const refresh = () => router.refresh()

  const searchVideos = async () => {
    if (search.trim().length < 2) return
    const res = await fetch(`/api/search?q=${encodeURIComponent(search.trim())}&pageSize=8`)
    const data = (await res.json()) as { videos?: { id: string; title: string; duration: number }[] }
    setHits((data.videos ?? []).map((v) => ({ id: v.id, title: v.title, duration: v.duration })))
  }

  const add = async () => {
    if (!picked || !number) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          videoId: picked.id,
          episodeNumber: Number(number),
          title: title.trim() || undefined,
        }),
      })
      setPicked(null)
      setNumber('')
      setTitle('')
      setSearch('')
      setHits(null)
      refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    const e = editing[id]
    if (!e) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/episodes/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(e.n ? { episodeNumber: Number(e.n) } : {}),
          ...(e.t.trim() ? { title: e.t.trim() } : {}),
        }),
      })
      setEditing((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const unlink = async (id: string) => {
    if (!confirm('Remove this episode link? (The video itself stays.)')) return
    setBusy(true)
    try {
      await api(`/api/admin/episodes/${id}`, { method: 'DELETE' })
      setEpisodes((prev) => prev.filter((x) => x.id !== id))
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold">Episodes ({episodes.length}) — ordered by episode number</h2>

      {/* Existing */}
      <div className="space-y-2">
        {episodes.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No episodes yet — add the first below.</p>
        )}
        {episodes.map((e) => {
          const draft = editing[e.id]
          return (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              {draft ? (
                <>
                  <Input
                    value={draft.n}
                    onChange={(ev) => setEditing((p) => ({ ...p, [e.id]: { ...draft, n: ev.target.value } }))}
                    type="number"
                    min={1}
                    className="w-20"
                    aria-label="Episode number"
                  />
                  <Input
                    value={draft.t}
                    onChange={(ev) => setEditing((p) => ({ ...p, [e.id]: { ...draft, t: ev.target.value } }))}
                    className="flex-1 min-w-[160px]"
                    aria-label="Episode title"
                  />
                  <Button size="sm" disabled={busy} onClick={() => save(e.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing((p) => { const n = { ...p }; delete n[e.id]; return n })}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="w-10 text-center text-base font-black tabular-nums text-white/40">
                    {String(e.episodeNumber).padStart(2, '0')}
                  </span>
                  <span className="flex-1 min-w-[160px]">
                    <span className="block text-sm font-semibold truncate">{e.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {e.videoTitle} · {e.videoStatus}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px]">{e.duration ? `${Math.floor(e.duration / 60)}:${String(e.duration % 60).padStart(2, '0')}` : '—'}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing((p) => ({ ...p, [e.id]: { n: String(e.episodeNumber), t: e.title } }))}
                  >
                    Edit
                  </Button>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors disabled:opacity-40"
                    disabled={busy}
                    onClick={() => unlink(e.id)}
                    title="Remove episode link"
                    aria-label={`Remove episode ${e.episodeNumber}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

      {/* Add */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Add episode</h3>
        {!picked ? (
          <>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchVideos()}
                placeholder="Search videos by title…"
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={searchVideos} className="gap-1.5 shrink-0">
                <Search className="h-4 w-4" /> Find
              </Button>
            </div>
            {hits && (
              <div className="space-y-1.5">
                {hits.length === 0 && <p className="text-xs text-muted-foreground">No videos found.</p>}
                {hits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setPicked(h)}
                    className="block w-full text-left rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:border-white/25 transition-colors"
                  >
                    {h.title} <span className="text-xs text-muted-foreground">· {h.duration}s</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm">Video: <strong>{picked.title}</strong>{' '}
              <button onClick={() => setPicked(null)} className="text-xs text-muted-foreground hover:text-foreground ml-2">change</button>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Episode Number *</Label>
                <Input type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="4" />
              </div>
              <div className="space-y-1.5">
                <Label>Episode Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to video title" maxLength={120} />
              </div>
            </div>
            <Button size="sm" disabled={busy || !number} onClick={add} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Episode
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
