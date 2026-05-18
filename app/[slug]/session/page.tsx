'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

// ── Spinning wheel (decorative — keeps screen alive while host picks) ─────────
const SEG_COLORS = ['#ffffff', '#1a1a1a']

function norm(r: number) {
  return ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
}

const DUMMY_SEGMENTS = [
  '🏆 Grand Prize', '10% OFF', 'FREE MERCH', '10% OFF',
  '💫 Better Luck', '10% OFF', 'FREE MERCH', '10% OFF',
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

    // Outer thick black ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end   = start + segAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      
      // Black text on white, White text on black
      ctx.fillStyle = i % 2 === 0 ? '#1a1a1a' : '#ffffff'
      ctx.font = '900 13px Inter, sans-serif'
      ctx.fillText(DUMMY_SEGMENTS[i], r - 15, 4)
      ctx.restore()
    }

    // Center Hub (White with black border)
    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 4
    ctx.stroke()
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
          // Force it to land on index 0 ('Grand Prize') if won, else index 4 ('Better Luck')
          const idx    = isWon ? 0 : 4
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
    <div style={{ position: 'relative', display: 'inline-block', zIndex: 10 }}>
      {/* Map Pin Pointer */}
      <svg width="40" height="50" viewBox="0 0 24 30" style={{
        position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))', zIndex: 20
      }}>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.4 12 18 12 18s12-9.6 12-18c0-6.627-5.373-12-12-12z" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="4" fill="#1a1a1a"/>
      </svg>
      
      {/* The Wheel */}
      <canvas
        ref={canvasRef}
        width={340} height={340}
        style={{ borderRadius: '50%', display: 'block', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.8))' }}
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
          Prize:
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
        Thanks for joining the Live Draw!
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
      background: '#09090b',
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
              position: 'relative',
              minHeight: '100vh',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', color: '#fff',
              fontFamily: 'Inter,sans-serif',
            }}
          >
            {/* Funky Black Sunburst Background */}
            <div style={{
              position: 'absolute', inset: -100,
              background: 'repeating-conic-gradient(from 0deg, #18181b 0deg 15deg, #09090b 15deg 30deg)',
              zIndex: 0
            }} />
            
            {/* Floating Emojis */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} style={{ position: 'absolute', top: '15%', left: '10%', fontSize: '2.5rem', rotate: '-15deg', zIndex: 1 }}>✨</motion.div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} style={{ position: 'absolute', top: '25%', right: '12%', fontSize: '3rem', rotate: '20deg', zIndex: 1 }}>🌟</motion.div>
            <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '20%', left: '15%', fontSize: '3.5rem', rotate: '-10deg', zIndex: 1 }}>🎉</motion.div>
            <motion.div animate={{ y: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '25%', right: '15%', fontSize: '2.5rem', rotate: '15deg', zIndex: 1 }}>🎁</motion.div>

            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
              
              {/* Funky Pop-Art Title */}
              <h1 style={{
                margin: 0,
                fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                fontWeight: 900,
                lineHeight: 1.1,
                color: '#ffffff',
                WebkitTextStroke: '2px #1a1a1a',
                textShadow: '4px 4px 0 #f59e0b',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                Spin the Wheel<br/>& Try Your Luck!
              </h1>

              <div style={{ position: 'relative' }}>
                <SpinningWheel onResult={handleResult} registrationId={regId} />
              </div>

            </div>
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
        background: '#09090b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter,sans-serif',
      }}>Loading…</div>
    }>
      <SessionContent />
    </Suspense>
  )
}
