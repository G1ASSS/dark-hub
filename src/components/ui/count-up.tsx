'use client'
import { useEffect, useRef, useState } from 'react'

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

/** Animated count-up number. */
export function CountUp({ value, compact = false }: { value: number | undefined; compact?: boolean }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (value === undefined) return
    const start = performance.now()
    const dur = 1100
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  if (value === undefined) return <>…</>
  return <>{compact ? formatCompact(display) : display.toLocaleString()}</>
}
