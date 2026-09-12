"use client"
import { useEffect, useRef, useState } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, PictureInPicture2, RotateCcw, RotateCw
} from 'lucide-react'

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  autoPlay?: boolean
  /** Real video id — when set, playback position is reported for Continue Watching. */
  videoId?: string
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p', '360p']
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function VideoPlayer({ src, poster, title, videoId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [quality, setQuality] = useState('Auto')
  const [speed, setSpeed] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'quality' | 'speed'>('quality')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [ripple, setRipple] = useState<{ side: 'left' | 'right'; n: number } | null>(null)
  const clickRef = useRef<{ t: number; x: number } | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load HLS
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let destroyed = false

    const load = async () => {
      try {
        if (src.includes('.m3u8')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const HlsMod = await import('hls.js') as any
          const Hls = HlsMod.default ?? HlsMod
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true })
            hlsRef.current = hls
            hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean; details?: string }) => {
              if (data.fatal && !destroyed) {
                console.error('[player] fatal HLS error:', data.details)
                setError(true)
              }
            })
            hls.loadSource(src)
            hls.attachMedia(video)
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src
          }
        } else {
          video.src = src
        }
        if (!destroyed) setLoading(false)
      } catch {
        if (!destroyed) setError(true)
      }
    }

    load()
    return () => {
      destroyed = true
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [src])

  // Events
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const report = () => {
      if (!videoId || !v.duration || v.currentTime < 5) return
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          videoId,
          position: Math.floor(v.currentTime),
          duration: Math.floor(v.duration),
        }),
        keepalive: true,
      }).catch(() => {})
    }
    const handlers = {
      play: () => setPlaying(true),
      pause: () => {
        setPlaying(false)
        report()
      },
      timeupdate: () => {
        setCurrentTime(v.currentTime)
        if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
      },
      loadedmetadata: () => { setDuration(v.duration); setLoading(false) },
      waiting: () => setLoading(true),
      canplay: () => setLoading(false),
      error: () => setError(true),
      volumechange: () => { setVolume(v.volume); setMuted(v.muted) },
    }
    Object.entries(handlers).forEach(([e, h]) => v.addEventListener(e, h))
    // Periodic position report while playing (drives Continue Watching)
    const reporter = setInterval(() => {
      if (!v.paused) report()
    }, 15000)
    return () => {
      Object.entries(handlers).forEach(([e, h]) => v.removeEventListener(e, h))
      clearInterval(reporter)
    }
  }, [videoId])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
  }
  const toggleMute = () => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted }
  const toggleFullscreen = async () => {
    if (!fullscreen) await containerRef.current?.requestFullscreen()
    else await document.exitFullscreen()
  }
  const togglePiP = async () => {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else await videoRef.current?.requestPictureInPicture()
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0 }
  }

  const setPlaybackSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s)
    setShowSettings(false)
  }

  const skip = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + secs))
  }

  const flashRipple = (side: 'left' | 'right') => {
    setRipple((r) => ({ side, n: (r?.n ?? 0) + 1 }))
    setTimeout(() => setRipple(null), 650)
  }

  /**
   * Smart stage tap: single = play/pause, double on the left/right
   * thirds = skip ∓5s with a ripple. The second tap cancels the pending
   * single-tap toggle so doubles never stutter.
   */
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const now = Date.now()
    const prev = clickRef.current
    if (prev && now - prev.t < 300) {
      if (clickTimer.current) clearTimeout(clickTimer.current)
      clickRef.current = null
      const side: 'left' | 'right' = x < 0.4 ? 'left' : x > 0.6 ? 'right' : prev.x < 0.5 ? 'left' : 'right'
      skip(side === 'left' ? -5 : 5)
      flashRipple(side)
      showControlsTemporarily()
      return
    }
    clickRef.current = { t: now, x }
    if (clickTimer.current) clearTimeout(clickTimer.current)
    if (x >= 0.4 && x <= 0.6) {
      // Middle single tap toggles immediately (no double-tap action there)
      clickRef.current = null
      togglePlay()
      return
    }
    clickTimer.current = setTimeout(() => {
      clickRef.current = null
      togglePlay()
    }, 300)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black w-full aspect-video select-none outline-none ${fullscreen ? 'rounded-none' : 'rounded-xl'}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={handleStageClick}
      tabIndex={0}
      role="application"
      aria-label={title ?? 'Video player'}
    >
      <video ref={videoRef} poster={poster} className="w-full h-full object-contain" playsInline preload="metadata" aria-label={title} />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-violet-500 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="text-4xl">⚠️</div>
          <h3 className="font-semibold">Video Unavailable</h3>
          <p className="text-sm text-white/60 max-w-xs">This video could not be loaded. It may be processing or temporarily unavailable.</p>
        </div>
      )}
      {!playing && !loading && !error && (
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          aria-label="Play"
          className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-xl shadow-violet-500/30 opacity-90 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Play className="h-8 w-8 text-white ml-1" fill="white" />
        </button>
      )}

      {/* Double-tap skip ripples */}
      {ripple && (
        <div
          key={ripple.n}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${ripple.side === 'left' ? 'left-8' : 'right-8'}`}
          aria-hidden="true"
        >
          <div className="skip-ripple flex h-16 w-16 flex-col items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            {ripple.side === 'left' ? <RotateCcw className="h-5 w-5 text-white" /> : <RotateCw className="h-5 w-5 text-white" />}
            <span className="text-[11px] font-bold text-white">5</span>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        <div className="relative px-4 pb-3 space-y-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {/* Progress */}
          <div
            className="group/prog h-1 hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all duration-150 relative"
            onMouseDown={handleSeek}
            role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime} tabIndex={0}
          >
            <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full" style={{ width: `${bufferProgress}%` }} />
            <div className="absolute top-0 left-0 h-full gradient-primary rounded-full" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white opacity-0 group-hover/prog:opacity-100 transition-opacity" style={{ left: `${progress}%` }} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-violet-300 transition-colors" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="white" />}
            </button>
            <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors" aria-label="Rewind 10s">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors" aria-label="Forward 10s">
              <RotateCw className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-violet-300 transition-colors" aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolume}
                className="w-20 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                aria-label="Volume" />
            </div>
            <span className="text-xs text-white/80 font-mono tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <div className="flex-1" />
            {speed !== 1 && <span className="text-xs text-violet-300 font-medium">{speed}x</span>}

            {/* Settings */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }} className="text-white/70 hover:text-white" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 w-44 glass rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex border-b border-white/8">
                    <button onClick={() => setSettingsTab('quality')} className={`flex-1 px-3 py-2 text-xs font-medium ${settingsTab === 'quality' ? 'text-violet-400' : 'text-white/50'}`}>Quality</button>
                    <button onClick={() => setSettingsTab('speed')} className={`flex-1 px-3 py-2 text-xs font-medium ${settingsTab === 'speed' ? 'text-violet-400' : 'text-white/50'}`}>Speed</button>
                  </div>
                  {settingsTab === 'quality' && QUALITY_OPTIONS.map((q) => (
                    <button key={q} onClick={() => { setQuality(q); setShowSettings(false) }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${quality === q ? 'text-violet-400' : 'text-white/60'}`}>{q}</button>
                  ))}
                  {settingsTab === 'speed' && SPEED_OPTIONS.map((s) => (
                    <button key={s} onClick={() => setPlaybackSpeed(s)}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${speed === s ? 'text-violet-400' : 'text-white/60'}`}>{s === 1 ? 'Normal' : `${s}x`}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={togglePiP} className="text-white/70 hover:text-white hidden sm:block" aria-label="Picture in picture">
              <PictureInPicture2 className="h-5 w-5" />
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-violet-300" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
