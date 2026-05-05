'use client'

import { useState, useEffect, useRef } from 'react'

interface Prize { rank: number; name: string; is_consolation: boolean; is_grand_prize: boolean }

interface Props {
  prizes: Prize[]
  targetRank: number
  won: boolean
  onDone: () => void
}

const COLORS = ['#7c3aed','#4338ca','#0f766e','#b45309','#be185d','#1d4ed8','#6d28d9','#047857']

export default function SpinWheelGame({ prizes, targetRank, won, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const [rotation, setRotation] = useState(0)
  const spinRef = useRef(0)
  const rafRef = useRef<number>(0)

  // Filter display prizes — consolation + regular (no grand)
  const wheelPrizes = prizes.filter(p => !p.is_grand_prize).slice(0, 8)
  const segCount = wheelPrizes.length || 6
  const segAngle = (2 * Math.PI) / segCount

  // Find which segment index is our target
  const targetIdx = won
    ? wheelPrizes.findIndex(p => p.rank === targetRank)
    : wheelPrizes.findIndex(p => p.is_consolation)
  const safeIdx = targetIdx >= 0 ? targetIdx : segCount - 1

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Outer glow ring
    const grad = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r + 8)
    grad.addColorStop(0, 'rgba(168,85,247,0.6)')
    grad.addColorStop(1, 'rgba(168,85,247,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI)
    ctx.fillStyle = grad
    ctx.fill()

    for (let i = 0; i < segCount; i++) {
      const start = rot + i * segAngle
      const end = start + segAngle
      // Segment fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px Poppins, sans-serif'
      const label = wheelPrizes[i]?.name || `Prize ${i + 1}`
      const text = label.length > 12 ? label.slice(0, 12) + '…' : label
      ctx.fillText(text, r - 14, 5)
      ctx.restore()
    }

    // Centre circle
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

  function spin() {
    if (spinning || done) return
    setSpinning(true)

    // Calculate target rotation so pointer (top = -π/2) lands on safeIdx
    const targetAngle = -(safeIdx * segAngle + segAngle / 2) - Math.PI / 2
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI
    const finalRot = fullSpins + targetAngle

    const startTime = performance.now()
    const duration = 5000
    const startRot = spinRef.current

    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = startRot + finalRot * eased
      spinRef.current = current
      setRotation(current)
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

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      {/* Pointer */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '22px solid #f59e0b',
          filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.8))',
          zIndex: 10
        }} />
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{ borderRadius: '50%', display: 'block' }}
        />
      </div>

      {!done ? (
        <button
          onClick={spin}
          disabled={spinning}
          className="btn-primary"
          style={{ maxWidth: 200, fontSize: '1.1rem', letterSpacing: '0.05em' }}
        >
          {spinning ? '🌀 Spinning…' : '🎡 SPIN!'}
        </button>
      ) : (
        <button onClick={onDone} className="btn-primary" style={{ maxWidth: 200 }}>
          See Your Prize →
        </button>
      )}
    </div>
  )
}
