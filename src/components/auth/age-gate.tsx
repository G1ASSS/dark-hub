"use client"
import { useState } from 'react'
import { Shield, AlertTriangle, ChevronRight, Check } from 'lucide-react'

interface AgeGateProps {
  onConfirm: () => void
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!checked || loading) return
    setLoading(true)
    try { await fetch('/api/age-gate', { method: 'POST' }) } catch {}
    setTimeout(() => { setLoading(false); onConfirm() }, 350)
  }

  const toggle = () => setChecked(prev => !prev)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(100,60,220,0.18) 0%, transparent 70%), hsl(222 20% 3%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 28,
            padding: 32,
            textAlign: 'center',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, hsl(258,85%,65%), hsl(190,100%,55%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(100,60,220,0.4)',
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 26 }}>V</span>
            </div>
          </div>

          <h1 style={{
            fontSize: 26, fontWeight: 800, marginBottom: 4,
            background: 'linear-gradient(135deg, hsl(258,85%,72%), hsl(190,100%,65%))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Dark Hubb</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 24 }}>
            Premium Adult Streaming
          </p>

          {/* Warning */}
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 16, padding: '12px 16px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={15} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>Adults Only — 18+</span>
            </div>
            <p style={{ color: 'rgba(245,158,11,0.65)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              This site contains adult content for adults 18+ only. By entering you confirm you meet the
              minimum age requirement in your jurisdiction.
            </p>
          </div>

          {/* ── TAP CARD — very large, no nested interactive elements ── */}
          <div
            onClick={toggle}
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onKeyDown={(e) => e.key === ' ' && toggle()}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 18px',
              borderRadius: 20,
              marginBottom: 20,
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              transition: 'all 0.2s ease',
              background: checked
                ? 'linear-gradient(135deg, rgba(125,60,220,0.20), rgba(0,200,230,0.12))'
                : 'rgba(255,255,255,0.04)',
              border: checked
                ? '1.5px solid rgba(125,60,220,0.50)'
                : '1.5px solid rgba(255,255,255,0.10)',
              boxShadow: checked ? '0 0 0 4px rgba(125,60,220,0.12)' : 'none',
              // Ensure it receives touch/click events
              WebkitTapHighlightColor: 'rgba(125,60,220,0.15)',
              touchAction: 'manipulation',
            }}
          >
            {/* Check circle — 48×48 */}
            <div style={{
              flexShrink: 0,
              width: 48, height: 48, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease',
              background: checked
                ? 'linear-gradient(135deg, hsl(258,85%,65%), hsl(190,100%,55%))'
                : 'rgba(255,255,255,0.07)',
              border: checked ? 'none' : '2px solid rgba(255,255,255,0.20)',
              boxShadow: checked ? '0 4px 20px rgba(125,60,220,0.45)' : 'none',
            }}>
              {checked && <Check size={22} color="white" strokeWidth={3} />}
            </div>

            {/* Text */}
            <p style={{
              margin: 0, textAlign: 'left', fontSize: 14, lineHeight: 1.5,
              color: 'rgba(255,255,255,0.80)',
            }}>
              I confirm I am{' '}
              <strong style={{ color: 'white' }}>18 years or older</strong>
              , agree to the{' '}
              <span style={{ color: '#a78bfa', textDecoration: 'underline' }}>Terms</span>
              {' & '}
              <span style={{ color: '#a78bfa', textDecoration: 'underline' }}>Privacy Policy</span>
              , and understand this site contains adult content.
            </p>
          </div>

          {/* Enter button */}
          <button
            onClick={handleConfirm}
            disabled={!checked || loading}
            style={{
              width: '100%', height: 56, borderRadius: 16,
              border: 'none', cursor: checked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 16, fontWeight: 700, letterSpacing: '0.01em',
              transition: 'all 0.2s ease',
              background: checked
                ? 'linear-gradient(135deg, hsl(258,85%,65%), hsl(190,100%,55%))'
                : 'rgba(255,255,255,0.06)',
              color: checked ? 'white' : 'rgba(255,255,255,0.25)',
              boxShadow: checked ? '0 4px 24px rgba(125,60,220,0.40)' : 'none',
              touchAction: 'manipulation',
            }}
          >
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/>
                <path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <>Enter Dark Hubb <ChevronRight size={18} /></>
            )}
          </button>

          {/* Exit */}
          <button
            onClick={() => window.location.assign('https://www.google.com')}
            style={{
              marginTop: 12, width: '100%', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer',
              padding: '12px 0', touchAction: 'manipulation',
            }}
          >
            I am under 18 — Exit
          </button>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <Shield size={12} color="rgba(255,255,255,0.30)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
              Privacy protected · No tracking without consent
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
