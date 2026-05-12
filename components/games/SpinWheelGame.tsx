'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prize { rank: number; name: string; is_consolation: boolean; is_grand_prize: boolean }
interface Props { prizes: Prize[]; targetRank: number; won: boolean; onDone: () => void; sessionMode?: boolean; registrationId?: string }

const SEG_COLORS = [
  '#7c3aed', '#4338ca', '#0891b2', '#0f766e',
  '#b45309', '#be185d', '#1d4ed8', '#6d28d9',
]

function norm(r: number): number { return ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }

export default function SpinWheelGame({ prizes, targetRank, won, onDone, sessionMode, registrationId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone]         = useState(false)
  const spinRef  = useRef(0)
  const rafRef   = useRef<number>(0)
  const loopRef  = useRef(false)
  const supabase = createClient()

  // ── Wheel segments: exclude grand prize / rank-1 only ─────────────────────
  // Use coercion so null/undefined is_grand_prize counts as false
  const wheelPrizes = prizes
    .filter(p => !p.is_grand_prize && Number(p.rank) !== 1)
    .slice(0, 8)
  const segCount = Math.max(wheelPrizes.length, 1)
  const segAngle = (2 * Math.PI) / segCount

  // ── Canvas draw — flat colour + bright white text ─────────────────────────
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

      // Flat segment fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length]
      ctx.fill()

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label text — white, bold, with shadow so it reads on any colour
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'

      // Shadow for contrast
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur  = 4

      ctx.fillStyle = '#ffffff'
      ctx.font      = `bold ${segCount <= 4 ? 13 : 11}px Inter, sans-serif`

      const raw   = wheelPrizes[i]?.name ?? `Prize ${i + 1}`
      const label = raw.length > 16 ? raw.slice(0, 15) + '…' : raw
      ctx.fillText(label, r - 10, 4)

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
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth   = 2
    ctx.stroke()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0
    ctx.fillStyle   = '#ffffff'
    ctx.font        = 'bold 9px Inter, sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText('SPIN', cx, cy + 3)
  }

  useEffect(() => { drawWheel(spinRef.current) }, [wheelPrizes.length]) // eslint-disable-line

  // ── Target resolution ─────────────────────────────────────────────────────
  function getTargetIdx(isWon: boolean, rank: number): number {
    if (!isWon) {
      // Land on consolation segment
      const idx = wheelPrizes.findIndex(p => !!p.is_consolation)
      return idx >= 0 ? idx : segCount - 1
    }
    // Find exact rank match
    const idx = wheelPrizes.findIndex(p => Number(p.rank) === Number(rank))
    if (idx >= 0) return idx
    // Fallback: first non-consolation segment
    const fb = wheelPrizes.findIndex(p => !p.is_consolation)
    return fb >= 0 ? fb : 0
  }

  function startLoop() {
    loopRef.current = true
    let start: number | null = null
    function loop(ts: number) {
      if (!loopRef.current) return
      if (!start) start = ts
      spinRef.current = norm((ts - start) * 0.003)
      drawWheel(spinRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function stopLoop() {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  function spinToTarget(isWon: boolean, rank: number) {
    const idx         = getTargetIdx(isWon, rank)
    const exactTarget = -Math.PI / 2 - (idx * segAngle + segAngle / 2)
    const delta       = (norm(exactTarget) - norm(spinRef.current) + 2 * Math.PI) % (2 * Math.PI)
    const totalTravel = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI + delta
    const absStart    = spinRef.current
    const startTime   = performance.now()
    const duration    = 4500

    function animate(now: number) {
      const t     = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      spinRef.current = norm(absStart + totalTravel * eased)
      drawWheel(spinRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        drawWheel(norm(absStart + totalTravel))
        setSpinning(false)
        setDone(true)
        setTimeout(() => onDone(), 1400)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  function spin() {
    if (spinning || done || sessionMode) return
    setSpinning(true)
    spinToTarget(won, targetRank)
  }

  useEffect(() => {
    if (!sessionMode || !registrationId) return
    setSpinning(true)
    startLoop()
    const ch = supabase
      .channel(`spin:${registrationId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `id=eq.${registrationId}` },
        (payload) => {
          const u = payload.new as Record<string, unknown>
          stopLoop()
          spinToTarget(u.game_result === 'won', (u.prize_rank_won as number) ?? segCount)
        })
      .subscribe()
    return () => { stopLoop(); supabase.removeChannel(ch) }
  }, [sessionMode, registrationId]) // eslint-disable-line

  useEffect(() => () => {
    loopRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  // Debug log — remove after testing
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[SpinWheel] prizes:', prizes, '| wheelPrizes:', wheelPrizes, '| won:', won, '| targetRank:', targetRank)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
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
          ref={canvasRef} width={300} height={300}
          style={{ borderRadius: '50%', display: 'block', cursor: !spinning && !done && !sessionMode ? 'pointer' : 'default' }}
          onClick={spin}
        />
      </div>

      {/* Segment legend */}
      {wheelPrizes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', maxWidth: 320 }}>
          {wheelPrizes.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: SEG_COLORS[i % SEG_COLORS.length], flexShrink: 0 }} />
              {p.name}
            </div>
          ))}
        </div>
      )}

      {!sessionMode && !spinning && !done && (
        <button onClick={spin} style={{
          padding: '0.875rem 2.5rem',
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          border: 'none', borderRadius: '0.875rem',
          color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(124,58,237,0.4)',
        }}>
          Spin
        </button>
      )}
      {!sessionMode && spinning && (
        <div style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>Spinning…</div>
      )}
    </div>
  )
}
