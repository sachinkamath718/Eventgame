'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prize { rank: number; name: string; is_consolation: boolean; is_grand_prize: boolean }

interface Props {
  prizes: Prize[]
  targetRank: number
  won: boolean
  onDone: () => void
  // Session mode: wheel spins until admin picks winner via realtime
  sessionMode?: boolean
  registrationId?: string
}

const COLORS = ['#7c3aed','#4338ca','#0f766e','#b45309','#be185d','#1d4ed8','#6d28d9','#047857']

export default function SpinWheelGame({ prizes, targetRank, won, onDone, sessionMode, registrationId }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning]   = useState(false)
  const [done, setDone]           = useState(false)
  const [sessionResult, setSessionResult] = useState<{ won: boolean; prizeName: string } | null>(null)
  const spinRef     = useRef(0)
  const rafRef      = useRef<number>(0)
  const loopRef     = useRef<boolean>(false)  // for infinite spin loop
  const resolveRef  = useRef<((won: boolean, rank: number) => void) | null>(null)
  const supabase    = createClient()

  const wheelPrizes = prizes.filter(p => !p.is_grand_prize).slice(0, 8)
  const segCount    = wheelPrizes.length || 6
  const segAngle    = (2 * Math.PI) / segCount

  function getTargetIdx(isWon: boolean, rank: number) {
    const idx = isWon
      ? wheelPrizes.findIndex(p => p.rank === rank)
      : wheelPrizes.findIndex(p => p.is_consolation)
    return idx >= 0 ? idx : segCount - 1
  }

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r  = cx - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const grad = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r + 8)
    grad.addColorStop(0, 'rgba(168,85,247,0.6)')
    grad.addColorStop(1, 'rgba(168,85,247,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI)
    ctx.fillStyle = grad
    ctx.fill()

    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end   = start + segAngle
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px Poppins, sans-serif'
      const label = wheelPrizes[i]?.name || `Prize ${i + 1}`
      const text  = label.length > 12 ? label.slice(0, 12) + '…' : label
      ctx.fillText(text, r - 14, 5)
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI)
    ctx.fillStyle = '#0a0a1a'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 18px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎯', cx, cy)
  }

  useEffect(() => { drawWheel(0) }, [wheelPrizes.length])

  // ── Infinite spin loop (session mode) ──────────────────────────────────────
  function startInfiniteLoop() {
    loopRef.current = true
    let start: number | null = null
    const speed = 0.003 // radians per ms

    function loop(ts: number) {
      if (!loopRef.current) return
      if (start === null) start = ts
      const rot = ((ts - start) * speed) % (2 * Math.PI)
      spinRef.current = rot
      drawWheel(rot)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function stopInfiniteLoop() {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  // ── Final landing spin ─────────────────────────────────────────────────────
  function spinToTarget(isWon: boolean, rank: number) {
    const safeIdx    = getTargetIdx(isWon, rank)
    const targetAngle = -(safeIdx * segAngle + segAngle / 2) - Math.PI / 2
    const fullSpins  = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI
    const finalRot   = fullSpins + targetAngle

    const startRot   = spinRef.current
    const startTime  = performance.now()
    const duration   = 4000

    function animate(now: number) {
      const elapsed = now - startTime
      const t       = Math.min(elapsed / duration, 1)
      const eased   = 1 - Math.pow(1 - t, 3)
      const current = startRot + finalRot * eased
      spinRef.current = current
      drawWheel(current)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        setDone(true)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  // ── Session mode: subscribe to realtime result ─────────────────────────────
  useEffect(() => {
    if (!sessionMode || !registrationId) return

    // Start spinning immediately
    setSpinning(true)
    startInfiniteLoop()

    const channel = supabase
      .channel(`spin-session:${registrationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'registrations',
        filter: `id=eq.${registrationId}`,
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        const isWon   = updated.game_result === 'won'
        const rank    = (updated.prize_rank_won as number) ?? 5
        const prize   = updated.prize_name as string ?? 'Better Luck Next Time'

        stopInfiniteLoop()
        setSessionResult({ won: isWon, prizeName: prize })
        spinToTarget(isWon, rank)
      })
      .subscribe()

    return () => {
      stopInfiniteLoop()
      supabase.removeChannel(channel)
    }
  }, [sessionMode, registrationId])

  // ── Normal mode: manual spin ───────────────────────────────────────────────
  function spin() {
    if (spinning || done || sessionMode) return
    setSpinning(true)
    spinToTarget(won, targetRank)
  }

  useEffect(() => () => {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

      {sessionMode && !done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '2rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>LIVE — Host is selecting the winner…</span>
        </div>
      )}

      {/* Pointer */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '22px solid #f59e0b',
          filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.8))',
          zIndex: 10,
        }} />
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{ borderRadius: '50%', display: 'block' }}
        />
      </div>

      {/* Normal mode button */}
      {!sessionMode && !done && (
        <button onClick={spin} disabled={spinning} className="btn-primary" style={{ maxWidth: 200, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
          {spinning ? '🌀 Spinning…' : '🎡 SPIN!'}
        </button>
      )}

      {/* Session mode: waiting message */}
      {sessionMode && !done && (
        <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
          Your wheel is spinning live! The host will announce the winner shortly.
        </p>
      )}

      {/* Done */}
      {done && (
        <button onClick={() => {
          // Pass session result up if in session mode
          if (sessionMode && sessionResult) {
            onDone()
          } else {
            onDone()
          }
        }} className="btn-primary" style={{ maxWidth: 200 }}>
          See Your Prize →
        </button>
      )}
    </div>
  )
}
