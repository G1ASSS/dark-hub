"use client"
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Upload, X, CheckCircle2, AlertTriangle, Film, Image as ImageIcon, Tag, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MOCK_CATEGORIES } from '@/lib/mock-data'

type UploadStage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [contentType, setContentType] = useState<'standalone' | 'episode'>('standalone')
  const [seriesList, setSeriesList] = useState<{ slug: string; title: string; episodeCount: number }[]>([])
  const [seriesSlug, setSeriesSlug] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [episodeTitle, setEpisodeTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Series picker options (published series)
  useEffect(() => {
    fetch('/api/series')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSeriesList(d?.data ?? []))
      .catch(() => {})
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type.startsWith('video/')) setFile(dropped)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const apiError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json()
      return (data.error as string) ?? fallback
    } catch {
      return fallback
    }
  }

  const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB: under serverless body limits (~4.5MB)

  const uploadBytes = (videoId: string, f: File) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/upload/file?videoId=${encodeURIComponent(videoId)}`)
      xhr.setRequestHeader('x-file-name', encodeURIComponent(f.name))
      xhr.setRequestHeader('x-mime-type', f.type || 'video/mp4')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else {
          try {
            const data = JSON.parse(xhr.responseText)
            reject(new Error(friendlyUploadError(data.error, xhr.status)))
          } catch {
            reject(new Error(friendlyUploadError(null, xhr.status)))
          }
        }
      }
      xhr.onerror = () => reject(new Error('Network error during upload — try again'))
      xhr.send(f)
    })

  // Large files are split into 4MB chunks so each request stays under
  // serverless body limits. Chunks upload sequentially with retries.
  const uploadChunked = async (videoId: string, f: File) => {
    const total = Math.max(1, Math.ceil(f.size / CHUNK_SIZE))
    let sent = 0
    for (let i = 0; i < total; i++) {
      const blob = f.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      let attempt = 0
      for (;;) {
        const res = await fetch(
          `/api/upload/chunk?videoId=${encodeURIComponent(videoId)}&index=${i}&total=${total}`,
          { method: 'POST', headers: { 'x-mime-type': f.type || 'video/mp4' }, body: blob }
        )
        if (res.ok) break
        const msg = await apiError(res, `Chunk ${i + 1}/${total} failed`)
        // Auth/permission/session errors are not retryable.
        if (res.status === 401 || res.status === 403 || res.status === 410) {
          throw new Error(msg)
        }
        attempt += 1
        if (attempt >= 3) throw new Error(friendlyUploadError(msg, res.status))
        await sleep(1000 * attempt)
      }
      sent += blob.size
      setProgress(Math.round((sent / f.size) * 100))
    }
  }

  const friendlyUploadError = (serverMsg: string | null, status: number): string => {
    if (status === 413) {
      return 'Upload rejected (413): file too large for a single request. The uploader now splits files into 4MB chunks automatically — retry, or for 500MB+ files on hosted deployments use the local upload script (npm run upload:local).'
    }
    return serverMsg ?? `Upload failed (${status})`
  }

  // Watch the worker until it finishes (transcoding real files takes minutes).
  const pollUntilDone = async (videoId: string) => {
    const deadline = Date.now() + 25 * 60 * 1000
    let sawProcessing = false
    for (;;) {
      await sleep(5000)
      const res = await fetch(`/api/upload/status?videoId=${encodeURIComponent(videoId)}`)
      if (!res.ok) throw new Error(await apiError(res, 'Could not read processing status'))
      const data = (await res.json()) as { status: string }
      if (data.status === 'PROCESSING' || data.status === 'UPLOADING') sawProcessing = true
      if (data.status === 'PENDING_REVIEW' || data.status === 'PUBLISHED') {
        setResultStatus(data.status)
        return
      }
      if (data.status === 'REJECTED') throw new Error('Rejected by moderation')
      // Worker resets failures to UPLOADING for retry — surface instead of looping forever.
      if (data.status === 'UPLOADING' && sawProcessing) {
        throw new Error('Processing failed on the server — check worker logs and retry')
      }
      if (Date.now() > deadline) throw new Error('Timed out waiting for processing (>25 min)')
    }
  }

  const startUpload = async () => {
    if (!file || !title || !consentConfirmed || !ageConfirmed) return
    if (contentType === 'episode' && !seriesSlug) {
      setError('Choose a series for this episode.')
      setStage('error')
      return
    }
    setError(null)
    setResultStatus(null)
    try {
      setStage('uploading')
      setProgress(0)

      // 1. Reserve the video row (optionally linked as a series episode)
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          categorySlugs: selectedCategories,
          tags,
          ...(contentType === 'episode'
            ? {
                seriesSlug,
                episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
                episodeTitle: episodeTitle.trim() || undefined,
              }
            : {}),
        }),
      })
      if (!initRes.ok) throw new Error(await apiError(initRes, 'Could not start upload'))
      const { videoId } = (await initRes.json()) as { videoId: string }

      // 2. Stream the bytes (chunked for large files, single-shot for small)
      if (file.size > CHUNK_SIZE * 1.5) {
        await uploadChunked(videoId, file)
      } else {
        await uploadBytes(videoId, file)
      }

      // 3. Confirm + queue for processing
      const doneRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ videoId, bytes: file.size }),
      })
      if (!doneRes.ok) throw new Error(await apiError(doneRes, 'Could not finish upload'))

      // 4. Wait for the worker (scan → transcode → Telegram → review queue)
      setStage('processing')
      await pollUntilDone(videoId)
      setStage('done')
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
  }

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Upload Video</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Share your content with the Dark Hubb community. Owner uploads only.
      </p>

      {/* Consent notice */}
      <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200/80 space-y-1">
          <strong className="text-amber-400 block">Important before uploading:</strong>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>All performers must be 18+ and have provided written consent</li>
            <li>You must own or have licensed rights to all content</li>
            <li>No non-consensual, leaked, or private content</li>
            <li>Content will be reviewed before publishing</li>
          </ul>
        </div>
      </div>

      {stage === 'done' ? (
        <div className="text-center py-16 glass rounded-2xl">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Upload Complete!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {resultStatus === 'PUBLISHED'
              ? 'Your video is processed and published.'
              : 'Your video is processed and queued for review before publishing.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => { setStage('idle'); setFile(null); setProgress(0); setResultStatus(null) }} variant="outline">Upload Another</Button>
            <Link href="/dashboard"><Button>View Dashboard</Button></Link>
          </div>
        </div>
      ) : stage === 'error' ? (
        <div className="text-center py-16 glass rounded-2xl border border-rose-500/20">
          <AlertTriangle className="h-16 w-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Upload failed</h2>
          <p role="alert" className="text-rose-300/90 text-sm mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => { setStage('idle'); setError(null); setProgress(0) }} variant="outline">Try Again</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-10 ${dragging ? 'border-violet-500 bg-violet-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/15 hover:border-white/25 hover:bg-white/3'}`}
          >
            <input ref={fileRef} type="file" accept="video/*" onChange={handleFileSelect} className="sr-only" />
            {file ? (
              <>
                <Film className="h-12 w-12 text-emerald-400 mb-3" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{fileSizeMB} MB · {file.type}</p>
                <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-medium text-sm">Drop your video here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, MKV · Max 5 GB · large files upload in 4MB chunks</p>
              </>
            )}
          </div>

          {/* Upload progress */}
          {(stage === 'uploading' || stage === 'processing') && (
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {stage === 'uploading' ? `Uploading… ${progress}%` : '⚙️ Processing & transcoding HLS…'}
                </span>
                {stage === 'uploading' && <span className="text-muted-foreground">{Math.round(progress * (file?.size ?? 0) / 100 / 1024 / 1024).toFixed(1)} / {fileSizeMB} MB</span>}
              </div>
              {stage === 'uploading' && (
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              )}
              {stage === 'processing' && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {['360p', '480p', '720p', '1080p'].map((q) => (
                    <span key={q} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata form */}
          {stage === 'idle' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="video-title">Title <span className="text-rose-400">*</span></Label>
                <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your video a descriptive title" maxLength={100} />
                <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="video-desc">Description</Label>
                <Textarea id="video-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your video, performers, and scenario (optional)" rows={4} maxLength={2000} />
              </div>

              {/* Content type: standalone vs series episode */}
              <div className="space-y-2">
                <Label>Content Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['standalone', 'episode'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        contentType === t
                          ? 'gradient-primary text-white'
                          : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t === 'standalone' ? 'Standalone Video' : 'Series Episode'}
                    </button>
                  ))}
                </div>
              </div>

              {contentType === 'episode' && (
                <div className="space-y-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 animate-slide-up">
                  <div className="space-y-1.5">
                    <Label htmlFor="series">Series <span className="text-rose-400">*</span></Label>
                    <select
                      id="series"
                      value={seriesSlug}
                      onChange={(e) => setSeriesSlug(e.target.value)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-[#14141c]"
                      required
                    >
                      <option value="">Select a series…</option>
                      {seriesList.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.title} ({s.episodeCount} episodes)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">New series are created by staff in Admin → Series.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ep-num">Episode Number</Label>
                      <Input
                        id="ep-num"
                        type="number"
                        min={1}
                        max={10000}
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ep-title">Episode Title</Label>
                      <Input
                        id="ep-title"
                        value={episodeTitle}
                        onChange={(e) => setEpisodeTitle(e.target.value)}
                        maxLength={120}
                        placeholder="Defaults to Episode 04"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {MOCK_CATEGORIES.slice(0, 8).map((cat) => (
                    <button key={cat.id}
                      onClick={() => setSelectedCategories(prev => prev.includes(cat.slug) ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategories.includes(cat.slug) ? 'gradient-primary text-white' : 'border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tags (press Enter)" className="flex-1" />
                  <Button variant="outline" size="sm" onClick={addTag} type="button"><Tag className="h-4 w-4" /></Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>
                        #{t} <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Legal confirmations */}
              <div className="space-y-3 pt-2 border-t border-white/6">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-violet-400" />Legal Confirmations</h3>
                {[
                  { id: 'age-conf', checked: ageConfirmed, onChange: setAgeConfirmed, label: 'All performers in this video are 18 years of age or older, and I have documentation to prove this.' },
                  { id: 'consent-conf', checked: consentConfirmed, onChange: setConsentConfirmed, label: 'All performers have given written, informed consent, and I own or have licensed the rights to this content.' },
                ].map((item) => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                    <div className="mt-0.5">
                      <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} className="sr-only peer" />
                      <div className="h-[18px] w-[18px] rounded border border-white/20 bg-white/5 flex items-center justify-center peer-checked:gradient-primary peer-checked:border-transparent transition-all">
                        {item.checked && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">{item.label}</span>
                  </label>
                ))}
              </div>

              <Button onClick={startUpload} disabled={!file || !title || !consentConfirmed || !ageConfirmed} size="lg" className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Upload & Submit for Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
