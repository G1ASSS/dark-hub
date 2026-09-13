'use client'
import { useState, useEffect } from 'react'
import { PosterRail } from './poster-rail'
import type { VideoCardData } from '@/types'

export function FavoritesSection() {
  const [favorites, setFavorites] = useState<VideoCardData[] | null>(null)

  useEffect(() => {
    fetch('/api/favorites')
      .then((r) => r.json())
      .then((d) => setFavorites(d.data ?? []))
      .catch(() => setFavorites([]))
  }, [])

  return <PosterRail videos={favorites} emptyText="Tap the heart on any video to save it here." />
}
