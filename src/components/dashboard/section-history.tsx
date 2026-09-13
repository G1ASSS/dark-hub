'use client'
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PosterRail } from './poster-rail'
import type { VideoCardData } from '@/types'

export function HistorySection() {
  const [history, setHistory] = useState<VideoCardData[] | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setHistory(d.data ?? []))
      .catch(() => setHistory([]))
  }, [])

  const clearHistory = async () => {
    await fetch('/api/history', { method: 'DELETE' })
    setHistory([])
  }

  return (
    <div>
      {(history?.length ?? 0) > 0 && (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" className="gap-1.5 text-rose-400 hover:text-rose-300" onClick={clearHistory}>
            <Trash2 className="h-4 w-4" /> Clear All
          </Button>
        </div>
      )}
      <PosterRail videos={history} emptyText="Videos you watch will appear here." />
    </div>
  )
}
