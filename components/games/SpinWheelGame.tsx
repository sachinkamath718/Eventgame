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

// ── DPI-aware canvas size ──────────────────────────────────────────────────
const CSS_SIZE  = 300
const DPR       = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
const BUF_SIZE  = CSS_SIZE * DPR          // actual pixel buffer

export default function SpinWheelGame({ prizes, targetRank, won, onDone, sessionMode, registrationId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone]         = useState(false)
  const spinRef  = useRef(0)
  const rafRef   = useRef<number>(0)
  const loopRef  = useRef(false)
  const supabase = createClient()

  // ── Filter: exclude ONLY items explicitly flagged is_grand_prize=true ──────
  // Do NOT exclude by rank — rank numbers in the DB vary per event.
  // Consolation prizes (is_consolation=true) STAY on the wheel.
  const wheelPrizes = prizes
    .filter(p => p.is_grand_prize !== true)
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .filter((p, i, arr) => i === 0 || p.rank !== arr[i - 1].rank)
    .slice(0, 8)

  const segCount = Math.max(wheelPrizes.length, 1)
  const segAngle = (2 * Math.PI) / segCount

  // ── Canvas draw — DPI-sharp, bold white text ────────────────────────────────
  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')!
    const W    = BUF_SIZE          // pixel buffer size
    const cx   = W / 2
    const cy   = W / 2
    const r    = cx - 14 * DPR    // leave ring margin

    ctx.clearRect(0, 0, W, W)

    // ── Segments ──────────────────────────────────────────────────────────────
    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end   = start + segAngle

      // Fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEG_COLORS[i % SEG_COLORS.length]
      ctx.fill()

      // Divider lines
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth   = 1.5 * DPR
      ctx.stroke()

      // ── Text: draw horizontally in each segment ──────────────────────────
      // Move to the mid-arc point at 70% radius, rotate so text reads outward
      const midAngle = start + segAngle / 2
      const textR    = r * 0.62                // place text at 62% radius

      ctx.save()
      ctx.translate(cx + textR * Math.cos(midAngle), cy + textR * Math.sin(midAngle))
      ctx.rotate(midAngle + Math.PI / 2)       // text reads clockwise outward

      // Dynamic font size: smaller when more segments
      const fontSize = segCount <= 3 ? 13 * DPR
                     : segCount <= 5 ? 11 * DPR
                     : 9 * DPR

      ctx.font      = `bold ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
      ctx.textAlign = 'center'

      // Shadow for readability on any background
      ctx.shadowColor   = 'rgba(0,0,0,1)'
      ctx.shadowBlur    = 3 * DPR
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.fillStyle = '#ffffff'

      const raw    = wheelPrizes[i]?.name ?? `Prize ${i + 1}`
      // Truncate to fit segment arc
      const maxLen = segCount <= 3 ? 18 : segCount <= 5 ? 14 : 10
      const label  = raw.length > maxLen ? raw.slice(0, maxLen - 1) + '…' : raw

      ctx.fillText(label, 0, 0)
      ctx.restore()
    }

    // ── Outer ring ────────────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth   = 2 * DPR
    ctx.stroke()

    // ── Hub ───────────────────────────────────────────────────────────────────
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0

    ctx.beginPath()
    ctx.arc(cx, cy, 28 * DPR, 0, 2 * Math.PI)
    const hub = ctx.createRadialGradient(cx - 4 * DPR, cy - 4 * DPR, 2, cx, cy, 28 * DPR)
    hub.addColorStop(0, '#1e1b4b')
    hub.addColorStop(1, '#0a0a1a')
    ctx.fillStyle = hub
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth   = 2 * DPR
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font      = `bold ${9 * DPR}px "Inter", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 3 * DPR)
  }

  // Set up canvas with correct buffer size once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = BUF_SIZE
    canvas.height = BUF_SIZE
    canvas.style.width  = `${CSS_SIZE}px`
    canvas.style.height = `${CSS_SIZE}px`
    drawWheel(spinRef.current)
  }, [wheelPrizes.length]) // eslint-disable-line

  // ── Target resolution ─────────────────────────────────────────────────────
  function getTargetIdx(isWon: boolean, rank: number): number {
    if (!isWon) {
      const idx = wheelPrizes.findIndex(p => !!p.is_consolation)
      return idx >= 0 ? idx : segCount - 1
    }
    const idx = wheelPrizes.findIndex(p => Number(p.rank) === Number(rank))
    if (idx >= 0) return idx
    const fb  = wheelPrizes.findIndex(p => !p.is_consolation)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

      {/* Debug: show which prizes are on wheel */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Segments ({segCount}): {wheelPrizes.map(p => p.name).join(', ')}
        </div>
      )}

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
          style={{ borderRadius: '50%', display: 'block', cursor: !spinning && !done && !sessionMode ? 'pointer' : 'default' }}
          onClick={spin}
        />
      </div>

      {/* Legend */}
      {wheelPrizes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', maxWidth: 300 }}>
          {wheelPrizes.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>
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
