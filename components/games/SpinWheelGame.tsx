'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prize {
  rank: number
  name: string
  is_consolation: boolean
  is_grand_prize: boolean
}

interface Props {
  prizes: Prize[]
  targetRank: number
  won: boolean
  onDone: () => void
  sessionMode?: boolean
  registrationId?: string
}

const SEG_COLORS = [
  '#7c3aed', '#4338ca', '#0891b2', '#0f766e',
  '#b45309', '#be185d', '#1d4ed8', '#6d28d9',
]

export default function SpinWheelGame({
  prizes, targetRank, won, onDone, sessionMode, registrationId,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone]         = useState(false)
  const spinRef = useRef(0)          // current rotation in radians
  const rafRef  = useRef<number>(0)
  const loopRef = useRef(false)
  const supabase = createClient()

  // Segments: exclude grand prizes, max 8
  const wheelPrizes = prizes.filter(p => !p.is_grand_prize).slice(0, 8)
  const segCount    = wheelPrizes.length || 1
  const segAngle    = (2 * Math.PI) / segCount

  // ─── Target index ──────────────────────────────────────────────────────────
  // The pointer sits at the TOP of the canvas (12 o'clock = -π/2).
  // A segment at index `i` occupies angles [i·segAngle, (i+1)·segAngle] relative
  // to the wheel's current rotation.  To land segment `i` under the pointer we
  // need the wheel's rotation `R` to satisfy:
  //   R + i·segAngle + segAngle/2  ≡  -π/2   (mod 2π)
  //   ⟹  R  =  -π/2  -  i·segAngle  -  segAngle/2   (+ full spins for drama)
  function getTargetIdx(isWon: boolean, rank: number): number {
    if (!isWon) {
      const idx = wheelPrizes.findIndex(p => p.is_consolation)
      return idx >= 0 ? idx : segCount - 1
    }
    const idx = wheelPrizes.findIndex(p => p.rank === rank)
    return idx >= 0 ? idx : 0
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────
  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W   = canvas.width
    const cx  = W / 2
    const cy  = W / 2
    const r   = cx - 12

    ctx.clearRect(0, 0, W, W)

    // Outer glow ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 10, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()

    // Segments
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

      // Label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = 'bold 12px Inter, sans-serif'
      const label = wheelPrizes[i]?.name ?? `Prize ${i + 1}`
      ctx.fillText(label.length > 14 ? label.slice(0, 14) + '…' : label, r - 10, 4)
      // Rank badge
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText(wheelPrizes[i]?.is_consolation ? '' : `#${wheelPrizes[i]?.rank}`, r - 10, -8)
      ctx.restore()
    }

    // Centre hub
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
  }

  // Initial draw
  useEffect(() => { drawWheel(0) }, [wheelPrizes.length])  // eslint-disable-line

  // ─── Infinite loop for session waiting ────────────────────────────────────
  function startLoop() {
    loopRef.current = true
    let start: number | null = null
    function loop(ts: number) {
      if (!loopRef.current) return
      if (!start) start = ts
      const rot = ((ts - start) * 0.002) % (2 * Math.PI)
      spinRef.current = rot
      drawWheel(rot)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function stopLoop() {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  // ─── Spin to target ────────────────────────────────────────────────────────
  function spinToTarget(isWon: boolean, rank: number) {
    const idx = getTargetIdx(isWon, rank)

    // The angle the centre of segment `idx` needs to be at to sit under the
    // top pointer (−π/2).  We solve for the wheel rotation R:
    //   R + idx·segAngle + segAngle/2 = -π/2  (mod 2π)
    const targetRot = -Math.PI / 2 - (idx * segAngle + segAngle / 2)

    // Add enough full clockwise spins so the wheel travels at least ~5 turns
    const currentNorm = ((spinRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const targetNorm  = ((targetRot      % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const delta       = (targetNorm - currentNorm + 2 * Math.PI) % (2 * Math.PI)
    // Minimum 5 full spins + the natural delta
    const totalTravel = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI + delta

    const startRot  = spinRef.current
    const startTime = performance.now()
    const duration  = 4500

    function animate(now: number) {
      const t      = Math.min((now - startTime) / duration, 1)
      // Ease-out quart for a satisfying deceleration
      const eased  = 1 - Math.pow(1 - t, 4)
      const cur    = startRot + totalTravel * eased
      spinRef.current = cur
      drawWheel(cur)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Snap exactly to the correct angle to eliminate float drift
        const finalRot = startRot + totalTravel
        drawWheel(finalRot)
        setSpinning(false)
        setDone(true)
        // Auto-show result after a brief pause so user can see where it landed
        setTimeout(() => onDone(), 1400)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }

  // ─── Non-session spin trigger ──────────────────────────────────────────────
  function spin() {
    if (spinning || done || sessionMode) return
    setSpinning(true)
    spinToTarget(won, targetRank)
  }

  // ─── Session mode: subscribe + auto-spin on result ────────────────────────
  useEffect(() => {
    if (!sessionMode || !registrationId) return
    setSpinning(true)
    startLoop()

    const ch = supabase
      .channel(`spin:${registrationId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'registrations', filter: `id=eq.${registrationId}`,
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        const isWon   = updated.game_result === 'won'
        const rank    = (updated.prize_rank_won as number) ?? (segCount)
        stopLoop()
        spinToTarget(isWon, rank)
      })
      .subscribe()

    return () => { stopLoop(); supabase.removeChannel(ch) }
  }, [sessionMode, registrationId])  // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

      {sessionMode && !done && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.4rem 1rem', borderRadius: '2rem',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>
            Live — host is selecting the winner
          </span>
        </div>
      )}

      {/* Wheel + pointer */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Top pointer — fixed, points down into wheel at 12 o'clock */}
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft:  '9px solid transparent',
          borderRight: '9px solid transparent',
          borderTop:   '22px solid #f59e0b',
          filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.7))',
          zIndex: 10,
        }} />
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          style={{ borderRadius: '50%', display: 'block', cursor: !spinning && !done && !sessionMode ? 'pointer' : 'default' }}
          onClick={spin}
        />
      </div>

      {!sessionMode && !spinning && !done && (
        <button
          onClick={spin}
          style={{
            padding: '0.875rem 2.5rem',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            border: 'none', borderRadius: '0.875rem',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            transition: 'all 0.2s',
          }}
        >
          Spin
        </button>
      )}

      {!sessionMode && spinning && (
        <div style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>
          Spinning…
        </div>
      )}

      {sessionMode && !done && (
        <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
          Your wheel is spinning — the host will announce the winner shortly
        </p>
      )}

      {/* No button after spin — onDone fires automatically via setTimeout */}
    </div>
  )
}
