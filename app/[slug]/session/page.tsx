'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

// ── Spinning wheel (decorative — keeps screen alive while host picks) ─────────
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

function SpinningWheel({
  onResult,
  registrationId,
}: {
  onResult: (won: boolean, prizeName: string) => void
  registrationId: string
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const spinRef      = useRef(0)
  const rafRef       = useRef<number>(0)
  const loopRef      = useRef(true)
  const supabase     = createClient()
  const resolvedRef  = useRef(false)

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

  function startFastLoop() {
    loopRef.current = true
    let lastTs = 0
    function loop(ts: number) {
      if (!loopRef.current) return
      const delta = lastTs ? ts - lastTs : 16
      lastTs = ts
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
    const totalTravel  = 2 * 2 * Math.PI + delta
    const absStart     = spinRef.current
    const startTime    = performance.now()
    const duration     = 3500

    function animate(now: number) {
      const t     = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      spinRef.current = norm(absStart + totalTravel * eased)
      drawWheel(spinRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        drawWheel(norm(absStart + totalTravel))
        setTimeout(afterDone, 600)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    drawWheel(0)
    startFastLoop()

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
          const isWon  = updated.game_result === 'won'
          const pName  = (updated.prize_name as string) || 'Grand Prize'
          const idx    = Math.floor(Math.random() * segCount)
          slowDownAndStop(idx, () => onResult(isWon, pName))
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

// ── Result overlay — full-screen pop-up ───────────────────────────────────────
function ResultOverlay({ won, prizeName }: { won: boolean; prizeName: string }) {
  if (won) {
    return (
      <motion.div
        key="won"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.7, bounce: 0.45 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'linear-gradient(135deg,#1e1b4b 0%,#78350f 60%,#1e1b4b 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center',
          fontFamily: 'Inter, sans-serif', color: '#fff',
        }}
      >
        {/* Burst ring */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 340, height: 340, borderRadius: '50%',
            border: '4px solid rgba(251,191,36,0.5)',
          }}
        />

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '1rem', zIndex: 1 }}
        >
          🏆
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            margin: '0 0 0.75rem',
            fontSize: 'clamp(2.75rem,10vw,4rem)',
            fontWeight: 900, color: '#fbbf24', lineHeight: 1,
            textShadow: '0 0 40px rgba(251,191,36,0.6)',
            zIndex: 1,
          }}
        >
          YOU WON!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{
            margin: '0 0 0.5rem', fontSize: '1.05rem',
            color: 'rgba(255,255,255,0.6)', zIndex: 1,
          }}
        >
          Grand Prize:
        </motion.p>

        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, type: 'spring', bounce: 0.3 }}
          style={{
            margin: '0 0 2.5rem',
            fontSize: 'clamp(1.5rem,5vw,2rem)',
            fontWeight: 800, color: '#fcd34d', lineHeight: 1.2, zIndex: 1,
          }}
        >
          {prizeName}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            background: 'linear-gradient(135deg,#d97706,#b45309)',
            borderRadius: '1.25rem', padding: '1.25rem 1.75rem',
            fontWeight: 700, fontSize: '1rem', color: '#fff',
            boxShadow: '0 8px 32px rgba(217,119,6,0.5)',
            maxWidth: 360, zIndex: 1,
          }}
        >
          📱 Show this screen to our team to collect your prize!
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="lost"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center',
        fontFamily: 'Inter, sans-serif', color: '#fff',
      }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
        style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '1.25rem' }}
      >
        💫
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          margin: '0 0 1rem',
          fontSize: 'clamp(2rem,8vw,3rem)',
          fontWeight: 900, lineHeight: 1.2,
          color: '#c4b5fd',
        }}
      >
        Better Luck<br />Next Time!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          margin: '0 0 0.5rem',
          fontSize: '1.05rem', color: 'rgba(255,255,255,0.55)',
        }}
      >
        Thanks for joining the Grand Prize Draw!
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}
      >
        A confirmation email has been sent to your inbox.
      </motion.p>
    </motion.div>
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
    <>
      {/* Spinning waiting screen */}
      <AnimatePresence>
        {phase === 'spinning' && (
          <motion.main
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              minHeight: '100vh',
              background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', color: '#fff',
              fontFamily: 'Inter,sans-serif',
            }}
          >
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
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
            </div>

            <style>{`
              @keyframes bounce {
                0%, 100% { transform: translateY(0);    animation-timing-function: cubic-bezier(0.8,0,1,1); }
                50%       { transform: translateY(-5px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
              }
            `}</style>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Full-screen result overlay — pops over everything */}
      <AnimatePresence>
        {(phase === 'won' || phase === 'lost') && (
          <ResultOverlay won={phase === 'won'} prizeName={prizeName} />
        )}
      </AnimatePresence>
    </>
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
