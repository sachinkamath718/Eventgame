'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  won: boolean
  onDone: () => void
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '🔔', '💎', '🎯']

const WIN_COMBO   = ['⭐', '⭐', '⭐']
const LOSE_COMBOS = [
  ['🍒', '🍋', '🍊'],
  ['🔔', '🍇', '🍋'],
  ['💎', '🔔', '🍒'],
  ['🎯', '🍊', '⭐'],
  ['🍇', '💎', '🔔'],
]

const VISIBLE  = 3
const SYMBOL_H = 80
const REEL_DURATIONS = [2200, 3000, 3800]

export default function NumberMatchGame({ won, onDone }: Props) {
  const [slots] = useState<string[]>(() =>
    won ? WIN_COMBO : LOSE_COMBOS[Math.floor(Math.random() * LOSE_COMBOS.length)]
  )

  const [reelSymbols] = useState<string[][]>(() =>
    [0, 1, 2].map(i => {
      const strip: string[] = []
      for (let j = 0; j < 24; j++) {
        strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      }
      strip.push(slots[i])
      return strip
    })
  )

  const [offsets, setOffsets]   = useState<number[]>([0, 0, 0])
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false])
  const [stopped, setStopped]   = useState<boolean[]>([false, false, false])
  const [started, setStarted]   = useState(false)
  const [done, setDone]         = useState(false)
  const rafRefs                 = useRef<(number | null)[]>([null, null, null])
  const startTimes              = useRef<(number | null)[]>([null, null, null])

  function spinReel(reelIdx: number) {
    const strip        = reelSymbols[reelIdx]
    const totalH       = strip.length * SYMBOL_H
    const targetOffset = (strip.length - 2) * SYMBOL_H
    const duration     = REEL_DURATIONS[reelIdx]
    startTimes.current[reelIdx] = performance.now()

    function animate(now: number) {
      const elapsed  = now - (startTimes.current[reelIdx] ?? now)
      const t        = Math.min(elapsed / duration, 1)

      let offset: number
      if (t < 0.7) {
        offset = (elapsed * 0.9) % totalH
      } else {
        const slowDuration = duration * 0.3
        const slowStart    = startTimes.current[reelIdx]! + duration * 0.7
        const slowElapsed  = now - slowStart
        const slowT        = Math.min(slowElapsed / slowDuration, 1)
        const slowEased    = 1 - Math.pow(1 - slowT, 4)
        const fastOffset   = (duration * 0.7 * 0.9) % totalH
        offset = fastOffset + (targetOffset - fastOffset) * slowEased
      }

      setOffsets(prev => { const n = [...prev]; n[reelIdx] = offset; return n })

      if (t < 1) {
        rafRefs.current[reelIdx] = requestAnimationFrame(animate)
      } else {
        setOffsets(prev => { const n = [...prev]; n[reelIdx] = targetOffset; return n })
        setSpinning(prev => { const n = [...prev]; n[reelIdx] = false; return n })
        setStopped(prev => {
          const n = [...prev]; n[reelIdx] = true
          if (n.every(Boolean)) setTimeout(() => setDone(true), 600)
          return n
        })
      }
    }
    rafRefs.current[reelIdx] = requestAnimationFrame(animate)
  }

  function handleSpin() {
    if (started) return
    setStarted(true)
    setSpinning([true, true, true])
    ;[0, 1, 2].forEach(i => spinReel(i))
  }

  useEffect(() => () => {
    rafRefs.current.forEach(r => { if (r) cancelAnimationFrame(r) })
  }, [])

  function getMiddleSymbol(reelIdx: number): string | null {
    if (!stopped[reelIdx]) return null
    return slots[reelIdx]
  }

  const allStopped     = stopped.every(Boolean)
  const middleSymbols  = [0, 1, 2].map(i => getMiddleSymbol(i))
  const anySpinning    = spinning.some(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <p style={{ color: 'rgba(248,250,252,0.6)', fontSize: '0.95rem', textAlign: 'center', margin: 0 }}>
        {!started
          ? 'Pull the lever — match all 3 to win!'
          : anySpinning
          ? '🎰 Spinning…'
          : won ? '⭐ Jackpot! You win!' : '😔 No match this time'}
      </p>

      {/* Machine body */}
      <div style={{
        background: 'linear-gradient(180deg,#1e1b4b 0%,#0f0c29 100%)',
        border: '3px solid rgba(168,85,247,0.5)',
        borderRadius: '1.5rem',
        padding: '1.25rem',
        boxShadow: '0 0 40px rgba(124,58,237,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>

        {/* Top lights */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['#f59e0b','#ef4444','#22c55e','#3b82f6','#f59e0b'] as string[]).map((c, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%', background: c,
              boxShadow: anySpinning ? `0 0 6px ${c}` : 'none',
              transition: 'box-shadow 0.3s',
            }} />
          ))}
        </div>

        {/* Reels */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[0, 1, 2].map(reelIdx => (
            <div key={reelIdx}>
              <div style={{
                width: 80,
                height: SYMBOL_H * VISIBLE,
                overflow: 'hidden',
                borderRadius: '0.75rem',
                background: 'rgba(0,0,0,0.5)',
                border: '2px solid rgba(255,255,255,0.1)',
                position: 'relative',
              }}>
                {/* Middle highlight */}
                <div style={{
                  position: 'absolute',
                  top: SYMBOL_H, left: 0, right: 0,
                  height: SYMBOL_H,
                  background: stopped[reelIdx] && won
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  borderTop: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderBottom: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  zIndex: 2, pointerEvents: 'none',
                  transition: 'background 0.4s, border 0.4s',
                }} />

                {/* Scrolling strip */}
                <div style={{
                  position: 'absolute',
                  top: -offsets[reelIdx],
                  left: 0, right: 0,
                }}>
                  {reelSymbols[reelIdx].map((sym, j) => (
                    <div key={j} style={{
                      height: SYMBOL_H,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.2rem',
                      userSelect: 'none',
                    }}>
                      {sym}
                    </div>
                  ))}
                </div>

                {/* Top/bottom fade */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(180deg,rgba(15,12,41,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(0deg,rgba(15,12,41,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
              </div>

              {/* Reel status dot */}
              <div style={{
                textAlign: 'center', marginTop: '0.4rem', fontSize: '0.65rem',
                color: spinning[reelIdx] ? '#a78bfa' : stopped[reelIdx] ? '#4ade80' : 'rgba(255,255,255,0.2)',
                fontWeight: 700,
              }}>
                {spinning[reelIdx] ? '●●●' : stopped[reelIdx] ? '✓' : '○○○'}
              </div>
            </div>
          ))}
        </div>

        {/* Payline display */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {middleSymbols.map((s, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: '0.5rem',
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${s && won && allStopped ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
              boxShadow: s && won && allStopped ? '0 0 10px rgba(245,158,11,0.5)' : 'none',
              transition: 'all 0.4s',
            }}>
              {s ?? '·'}
            </div>
          ))}
        </div>

        {/* Win sparkle */}
        {allStopped && won && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '2rem', pointerEvents: 'none', zIndex: 10 }}>
            ✨
          </div>
        )}
      </div>

      {/* Result banner */}
      {allStopped && (
        <div style={{
          padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
          fontWeight: 700, fontSize: '1rem', textAlign: 'center',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
        }}>
          {won ? '⭐ Jackpot! Three stars! You win!' : '😔 No match this time'}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        {!started && (
          <button onClick={handleSpin} className="btn-primary" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
            🎰 Pull Lever!
          </button>
        )}
        {started && anySpinning && (
          <button disabled className="btn-primary" style={{ fontSize: '1rem', opacity: 0.5, cursor: 'not-allowed' }}>
            🌀 Spinning…
          </button>
        )}
        {done && (
          <button onClick={onDone} className="btn-primary" style={{ maxWidth: 200 }}>
            See Your Prize →
          </button>
        )}
      </div>
    </div>
  )
}
