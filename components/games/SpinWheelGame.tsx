'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prize { rank: number; name: string; is_consolation: boolean; is_grand_prize: boolean }
interface Props { prizes: Prize[]; targetRank: number; won: boolean; onDone: () => void; sessionMode?: boolean; registrationId?: string }

const SEG_COLORS = ['#7c3aed','#1d4ed8','#0891b2','#0f766e','#b45309','#be185d','#15803d','#6d28d9']

function norm(r: number): number { return ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }

export default function SpinWheelGame({ prizes, targetRank, won, onDone, sessionMode, registrationId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const [showWin, setShowWin] = useState(false)
  const [btnPulse, setBtnPulse] = useState(false)
  const spinRef = useRef(0)
  const rafRef = useRef<number>(0)
  const loopRef = useRef(false)
  const supabase = createClient()

  const wheelPrizes = prizes.filter(p => !p.is_grand_prize && p.rank !== 1).slice(0, 8)
  const segCount = Math.max(wheelPrizes.length, 1)
  const segAngle = (2 * Math.PI) / segCount

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, cx = W / 2, cy = W / 2, r = cx - 18
    ctx.clearRect(0, 0, W, W)

    // Outer glow ring
    ctx.save()
    ctx.shadowColor = spinning ? '#a855f7' : '#7c3aed'
    ctx.shadowBlur = spinning ? 32 : 14
    ctx.beginPath()
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(168,85,247,0.5)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()

    // Chrome border
    ctx.beginPath()
    ctx.arc(cx, cy, r + 5, 0, 2 * Math.PI)
    const chrome = ctx.createLinearGradient(0, 0, W, W)
    chrome.addColorStop(0, 'rgba(255,255,255,0.35)')
    chrome.addColorStop(0.5, 'rgba(255,255,255,0.1)')
    chrome.addColorStop(1, 'rgba(255,255,255,0.3)')
    ctx.strokeStyle = chrome
    ctx.lineWidth = 5
    ctx.stroke()

    if (segCount === 0) return
    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end = start + segAngle
      const mid = start + segAngle / 2
      const grad = ctx.createLinearGradient(
        cx + Math.cos(mid) * 20, cy + Math.sin(mid) * 20,
        cx + Math.cos(mid) * r, cy + Math.sin(mid) * r
      )
      const base = SEG_COLORS[i % SEG_COLORS.length]
      grad.addColorStop(0, base + 'cc')
      grad.addColorStop(1, base)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(mid)
      ctx.textAlign = 'right'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 5
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px Inter,sans-serif'
      const lbl = wheelPrizes[i]?.name ?? `Prize ${i+1}`
      ctx.fillText(lbl.length > 13 ? lbl.slice(0,13)+'…' : lbl, r - 14, 4)
      ctx.restore()
    }
    // Hub
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI)
    const hub = ctx.createRadialGradient(cx-6, cy-6, 2, cx, cy, 30)
    hub.addColorStop(0, '#3b0764')
    hub.addColorStop(1, '#0a0a1a')
    ctx.fillStyle = hub
    ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(168,85,247,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = 'bold 9px Inter,sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 3)
  }

  useEffect(() => { drawWheel(spinRef.current) }, [wheelPrizes.length]) // eslint-disable-line

  function getTargetIdx(isWon: boolean, rank: number): number {
    if (!isWon) { const idx = wheelPrizes.findIndex(p => p.is_consolation); return idx >= 0 ? idx : segCount - 1 }
    const idx = wheelPrizes.findIndex(p => p.rank === rank)
    return idx >= 0 ? idx : (wheelPrizes.findIndex(p => p.is_consolation) ?? segCount - 1)
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

  function stopLoop() { loopRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }

  function spinToTarget(isWon: boolean, rank: number) {
    const idx = getTargetIdx(isWon, rank)
    const exactTarget = -Math.PI / 2 - (idx * segAngle + segAngle / 2)
    const delta = (norm(exactTarget) - norm(spinRef.current) + 2 * Math.PI) % (2 * Math.PI)
    const totalTravel = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI + delta
    const absStart = spinRef.current, startTime = performance.now(), duration = 5000
    function animate(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = t < 0.85 ? 1 - Math.pow(1 - t / 0.85, 4) : 1 + Math.sin(((t-0.85)/0.15) * Math.PI) * 0.01
      spinRef.current = norm(absStart + totalTravel * eased)
      drawWheel(spinRef.current)
      if (t < 1) { rafRef.current = requestAnimationFrame(animate) }
      else {
        drawWheel(norm(absStart + totalTravel))
        setSpinning(false); setDone(true)
        if (isWon) setShowWin(true)
        setTimeout(() => onDone(), 1600)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  function spin() {
    if (spinning || done || sessionMode) return
    setBtnPulse(true); setTimeout(() => setBtnPulse(false), 400)
    setSpinning(true); spinToTarget(won, targetRank)
  }

  useEffect(() => {
    if (!sessionMode || !registrationId) return
    setSpinning(true); startLoop()
    const ch = supabase.channel(`spin:${registrationId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `id=eq.${registrationId}` },
        (payload) => {
          const u = payload.new as Record<string, unknown>
          stopLoop(); spinToTarget(u.game_result === 'won', (u.prize_rank_won as number) ?? segCount)
        })
      .subscribe()
    return () => { stopLoop(); supabase.removeChannel(ch) }
  }, [sessionMode, registrationId]) // eslint-disable-line

  useEffect(() => () => { loopRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
      {/* Wheel */}
      <div style={{
        position: 'relative', display: 'inline-block',
        filter: spinning ? 'drop-shadow(0 0 28px rgba(168,85,247,0.7))' : 'drop-shadow(0 0 12px rgba(124,58,237,0.3))',
        transition: 'filter 0.5s',
      }}>
        <div style={{
          position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '30px solid #f59e0b',
          filter: 'drop-shadow(0 3px 10px rgba(245,158,11,1))',
          zIndex: 10,
        }} />
        <canvas ref={canvasRef} width={340} height={340}
          style={{ borderRadius: '50%', display: 'block', cursor: !spinning && !done && !sessionMode ? 'pointer' : 'default' }}
          onClick={spin}
        />
        {/* Win burst */}
        {showWin && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', width: 10, height: 10,
                borderRadius: i % 3 === 0 ? '50%' : '2px',
                background: ['#fbbf24','#a855f7','#3b82f6','#4ade80'][i % 4],
                animation: `burst 0.85s ${i * 50}ms ease-out forwards`,
                '--angle': `${i * 30}deg`,
              } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>

      {!sessionMode && !spinning && !done && (
        <button onClick={spin} style={{
          padding: '1rem 3rem', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.06em',
          background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#7c3aed 100%)',
          backgroundSize: '200% 100%',
          border: '2px solid rgba(168,85,247,0.6)',
          borderRadius: '1.25rem', color: '#fff', cursor: 'pointer',
          boxShadow: '0 0 32px rgba(124,58,237,0.55), 0 4px 20px rgba(0,0,0,0.4)',
          transform: btnPulse ? 'scale(0.94)' : 'scale(1)',
          animation: !btnPulse ? 'shimmer 2s infinite' : 'none',
          transition: 'transform 0.15s, box-shadow 0.2s',
        }}>
          🎡 SPIN THE WHEEL!
        </button>
      )}

      {!sessionMode && spinning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', fontWeight: 700, fontSize: '1rem' }}>
          <span style={{ display: 'inline-block', animation: 'spin360 0.5s linear infinite' }}>⭐</span>
          Spinning…
          <span style={{ display: 'inline-block', animation: 'spin360 0.5s linear infinite reverse' }}>⭐</span>
        </div>
      )}

      <style>{`
        @keyframes burst {
          0%   { transform: rotate(var(--angle)) translateY(0) scale(1); opacity:1; }
          100% { transform: rotate(var(--angle)) translateY(-110px) scale(0.3); opacity:0; }
        }
        @keyframes shimmer {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }
        @keyframes spin360 {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
