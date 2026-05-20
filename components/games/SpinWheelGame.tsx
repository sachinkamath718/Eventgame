'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prize {
  rank: number
  name: string
  is_consolation: boolean
  is_grand_prize: boolean
  image_url?: string
  quantity?: number
  claimed?: number
}

interface Props {
  prizes: Prize[]
  targetRank: number
  won: boolean
  onDone: (won?: boolean, prizeName?: string) => void
  sessionMode?: boolean
  registrationId?: string
}

const SEG_COLORS = ['#ffffff', '#1a1a1a']

function norm(r: number): number { return ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }

const CSS_SIZE = 300
const DPR      = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
const BUF_SIZE = CSS_SIZE * DPR

export default function SpinWheelGame({ prizes, targetRank, won, onDone, sessionMode, registrationId }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone]         = useState(false)
  const spinRef    = useRef(0)
  const rafRef     = useRef<number>(0)
  const loopRef    = useRef(false)
  const imgCache   = useRef<Map<string, HTMLImageElement>>(new Map())
  const supabase   = createClient()

  // Filter out grand prizes AND out-of-stock prizes from the wheel
  const wheelPrizes = prizes
    .filter(p => {
      if (p.is_grand_prize === true) return false
      // Remove 0-stock non-consolation prizes
      if (!p.is_consolation && p.quantity != null && p.quantity > 0) {
        const claimed = p.claimed ?? 0
        if (claimed >= p.quantity) return false
      }
      return true
    })
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .filter((p, i, arr) => i === 0 || p.rank !== arr[i - 1].rank)
    .slice(0, 8)

  const segCount = Math.max(wheelPrizes.length, 1)
  const segAngle = (2 * Math.PI) / segCount

  // Preload prize images
  useEffect(() => {
    wheelPrizes.forEach(p => {
      if (p.image_url && !imgCache.current.has(p.image_url)) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          imgCache.current.set(p.image_url!, img)
          drawWheel(spinRef.current)
        }
        img.onerror = () => imgCache.current.set(p.image_url!, new Image()) // placeholder on error
        img.src = p.image_url
      }
    })
  }, [wheelPrizes.map(p => p.image_url).join(',')])  // eslint-disable-line

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W   = BUF_SIZE
    const cx  = W / 2
    const cy  = W / 2
    const r   = cx - 14 * DPR

    ctx.clearRect(0, 0, W, W)

    // Outer thick black ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 8 * DPR, 0, 2 * Math.PI)
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 * DPR
    ctx.stroke()

    // Segments
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
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth   = 1.5 * DPR
      ctx.stroke()

      const midAngle = start + segAngle / 2
      const prize    = wheelPrizes[i]
      const imgUrl   = prize?.image_url
      const img      = imgUrl ? imgCache.current.get(imgUrl) : undefined

      if (img && img.complete && img.naturalWidth > 0) {
        // Draw prize image clipped inside the segment wedge
        const imgR   = r * 0.55
        const imgX   = cx + imgR * Math.cos(midAngle)
        const imgY   = cy + imgR * Math.sin(midAngle)
        const imgSz  = (segCount <= 4 ? 36 : segCount <= 6 ? 28 : 22) * DPR

        ctx.save()
        // Clip to segment
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, r - 2 * DPR, start, end)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(img, imgX - imgSz / 2, imgY - imgSz / 2, imgSz, imgSz)
        ctx.restore()
      } else {
        // Text fallback
        const textR    = r * 0.62
        const fontSize = segCount <= 3 ? 13 * DPR : segCount <= 5 ? 11 * DPR : 9 * DPR

        ctx.save()
        ctx.translate(cx + textR * Math.cos(midAngle), cy + textR * Math.sin(midAngle))
        ctx.rotate(midAngle + Math.PI / 2)
        ctx.font      = `bold ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.shadowColor  = 'transparent'
        ctx.shadowBlur   = 0
        ctx.fillStyle    = i % 2 === 0 ? '#1a1a1a' : '#ffffff'

        const raw    = prize?.name ?? `Prize ${i + 1}`
        const maxLen = segCount <= 3 ? 18 : segCount <= 5 ? 14 : 10
        const label  = raw.length > maxLen ? raw.slice(0, maxLen - 1) + '…' : raw
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
    }

    // Hub
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0
    ctx.beginPath()
    ctx.arc(cx, cy, 28 * DPR, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth   = 4 * DPR
    ctx.stroke()
    ctx.fillStyle = '#1a1a1a'
    ctx.font      = `900 ${10 * DPR}px "Inter", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 3 * DPR)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = BUF_SIZE
    canvas.height = BUF_SIZE
    canvas.style.width  = `${CSS_SIZE}px`
    canvas.style.height = `${CSS_SIZE}px`
    drawWheel(spinRef.current)
  }, [wheelPrizes.length]) // eslint-disable-line

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

  function spinToTarget(isWon: boolean, rank: number, overridePrizeName?: string) {
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
        const pName = overridePrizeName || wheelPrizes[idx]?.name || 'Grand Prize'
        setTimeout(() => onDone(isWon, pName), 1400)
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
          spinToTarget(u.game_result === 'won', (u.prize_rank_won as number) ?? segCount, u.prize_name as string)
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

      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Segments ({segCount}): {wheelPrizes.map(p => p.name).join(', ')}
        </div>
      )}

      <div style={{ position: 'relative', display: 'inline-block', zIndex: 10 }}>
        {/* Map Pin Pointer */}
        <svg width="40" height="50" viewBox="0 0 24 30" style={{
          position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))', zIndex: 20
        }}>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 8.4 12 18 12 18s12-9.6 12-18c0-6.627-5.373-12-12-12z" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="4" fill="#1a1a1a"/>
        </svg>
        <canvas
          ref={canvasRef}
          style={{
            borderRadius: '50%', display: 'block', cursor: !spinning && !done && !sessionMode ? 'pointer' : 'default',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
          }}
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
          background: '#ffffff',
          border: '2px solid #1a1a1a',
          borderRadius: '999px',
          color: '#1a1a1a', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer',
          boxShadow: '4px 4px 0 #1a1a1a',
          transition: 'transform 0.1s, box-shadow 0.1s',
          textTransform: 'uppercase' as const,
          letterSpacing: '1px'
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'translate(2px, 2px)'
          e.currentTarget.style.boxShadow = '2px 2px 0 #1a1a1a'
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '4px 4px 0 #1a1a1a'
        }}
        >
          Spin Now
        </button>
      )}
      {!sessionMode && spinning && (
        <div style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>Spinning…</div>
      )}
    </div>
  )
}
