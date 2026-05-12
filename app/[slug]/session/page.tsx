'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

// ── Inline fast-spinning wheel ────────────────────────────────────────────────
const SEG_COLORS = [
  '#7c3aed', '#4338ca', '#0891b2', '#0f766e',
  '#b45309', '#be185d', '#1d4ed8', '#6d28d9',
]

function norm(r: number) {
  return ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
}

const DUMMY_SEGMENTS = [
  '🎁 Prize', '✨ Win', '🏆 Lucky', '🎯 Spin',
  '💫 Try', '🎪 Play', '🌟 Go', '🎉 Spin',
]

function SpinningWheel({ onResult, registrationId }: {
  onResult: (won: boolean, prizeName: string) => void
  registrationId: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spinRef   = useRef(0)
  const rafRef    = useRef<number>(0)
  const loopRef   = useRef(true)
  const supabase  = createClient()
  const resolvedRef = useRef(false)

  const segCount = DUMMY_SEGMENTS.length
  const segAngle = (2 * Math.PI) / segCount

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, cx = W / 2, cy = W / 2, r = cx - 12

    ctx.clearRect(0, 0, W, W)

    // Outer glow ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 10, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()

    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end   = start + segAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.fillText(DUMMY_SEGMENTS[i], r - 10, 4)
      ctx.restore()
    }

    // Hub
    ctx.beginPath()
    ctx.arc(cx, cy, 26, 0, 2 * Math.PI)
    const hub = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 26)
    hub.addColorStop(0, '#1e1b4b')
    hub.addColorStop(1, '#0a0a1a')
    ctx.fillStyle = hub
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Hub label
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('LIVE', cx, cy + 3)
  }

  // Fast continuous spin loop
  function startFastLoop() {
    loopRef.current = true
    let lastTs = 0
    function loop(ts: number) {
      if (!loopRef.current) return
      const delta = lastTs ? ts - lastTs : 16
      lastTs = ts
      // ~3 full rotations per second
      spinRef.current = norm(spinRef.current + (delta / 1000) * Math.PI * 6)
      drawWheel(spinRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function stopFastLoop() {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  function slowDownAndStop(targetSegIdx: number, afterDone: () => void) {
    stopFastLoop()

    const exactTarget  = -Math.PI / 2 - (targetSegIdx * segAngle + segAngle / 2)
    const targetNorm_  = norm(exactTarget)
    const currentNorm_ = norm(spinRef.current)
    const delta        = (targetNorm_ - currentNorm_ + 2 * Math.PI) % (2 * Math.PI)
    // At least 2 full extra rotations while decelerating
    const totalTravel  = 2 * 2 * Math.PI + delta

    const absStart  = spinRef.current
    const startTime = performance.now()
    const duration  = 3500

    function animate(now: number) {
      const t     = Math.min((now - startTime) / duration, 1)
      // ease-out quart
      const eased = 1 - Math.pow(1 - t, 4)
      spinRef.current = norm(absStart + totalTravel * eased)
      drawWheel(spinRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        drawWheel(norm(absStart + totalTravel))
        setTimeout(afterDone, 1000)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    drawWheel(0)
    startFastLoop()

    // Listen for realtime update on this registration
    const ch = supabase
      .channel(`session-wheel:${registrationId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'registrations', filter: `id=eq.${registrationId}`,
      }, (payload) => {
        if (resolvedRef.current) return
        const updated = payload.new as Record<string, unknown>
        if (updated.game_result === 'won' || updated.game_result === 'lost') {
          resolvedRef.current = true
          const isWon    = updated.game_result === 'won'
          const pName    = (updated.prize_name as string) || 'Grand Prize'
          // Land on a random segment — the result screen is what matters
          const targetIdx = Math.floor(Math.random() * segCount)
          slowDownAndStop(targetIdx, () => onResult(isWon, pName))
        }
      })
      .subscribe()

    return () => {
      stopFastLoop()
      supabase.removeChannel(ch)
    }
  }, [registrationId]) // eslint-disable-line

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Pointer */}
      <div style={{
        position: 'absolute', top: -10, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderTop: '24px solid #f59e0b',
        filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.8))',
        zIndex: 10,
      }} />
      <canvas
        ref={canvasRef}
        width={300} height={300}
        style={{ borderRadius: '50%', display: 'block' }}
      />
    </div>
  )
}

// ── Main session page ─────────────────────────────────────────────────────────
function SessionContent() {
  const params = useSearchParams()
  const regId  = params.get('regId')

  const [phase, setPhase]         = useState<'spinning' | 'won' | 'lost'>('spinning')
  const [prizeName, setPrizeName] = useState('Grand Prize')

  function handleResult(won: boolean, pName: string) {
    setPrizeName(pName)
    setPhase(won ? 'won' : 'lost')
  }

  if (!regId) return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter,sans-serif',
    }}>
      Invalid session link.
    </main>
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', color: '#fff',
      fontFamily: 'Inter,sans-serif',
    }}>
      <AnimatePresence mode="wait">

        {/* Spinning — wheel spins fast until host picks */}
        {phase === 'spinning' && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
          >
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
              You&apos;re in the Grand Prize Draw!
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem' }}>
              Stay on this screen — the host is picking a winner live!
            </p>

            <SpinningWheel onResult={handleResult} registrationId={regId} />

            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: '999px', padding: '0.5rem 1.1rem',
            }}>
              {[0, 150, 300].map(delay => (
                <div key={delay} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
                  animation: `bounce 1s ${delay}ms infinite`,
                }} />
              ))}
              <span style={{ marginLeft: '0.2rem', color: '#4ade80', fontSize: '0.82rem', fontWeight: 600 }}>
                LIVE SESSION — WAITING FOR HOST
              </span>
            </div>
          </motion.div>
        )}

        {/* Won */}
        {phase === 'won' && (
          <motion.div
            key="won"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
            style={{ textAlign: 'center', maxWidth: 420 }}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>🏆</div>
            <h1 style={{
              margin: '0 0 1rem',
              fontSize: 'clamp(2.5rem,8vw,3.5rem)',
              fontWeight: 900, color: '#fbbf24', lineHeight: 1,
            }}>
              YOU WON!
            </h1>
            <p style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>
              Grand Prize:
            </p>
            <p style={{
              margin: '0 0 2rem', fontSize: '1.75rem', fontWeight: 800,
              color: '#fcd34d', lineHeight: 1.2,
            }}>
              {prizeName}
            </p>
            <div style={{
              background: 'linear-gradient(135deg,#d97706,#b45309)',
              borderRadius: '1.25rem', padding: '1.25rem 1.5rem',
              fontWeight: 700, fontSize: '1rem', color: '#fff',
              boxShadow: '0 8px 32px rgba(217,119,6,0.4)',
            }}>
              📱 Show this screen to our team to collect your prize!
            </div>
          </motion.div>
        )}

        {/* Lost */}
        {phase === 'lost' && (
          <motion.div
            key="lost"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', maxWidth: 420 }}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>💫</div>
            <h1 style={{ margin: '0 0 1rem', fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2 }}>
              Better Luck Next Time!
            </h1>
            <p style={{ margin: '0 0 0.75rem', color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem' }}>
              Thanks for participating in the Grand Prize Draw!
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
              A confirmation email has been sent to your inbox.
            </p>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0);    animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50%       { transform: translateY(-5px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
      `}</style>
    </main>
  )
}

export default function SessionPage({ params: _params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter,sans-serif',
      }}>Loading…</div>
    }>
      <SessionContent />
    </Suspense>
  )
}
