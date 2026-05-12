'use client'

import { useState, useEffect, useRef } from 'react'

interface Props { won: boolean; onDone: () => void }

const SYMBOLS = ['🍒','🍋','🍊','🍇','⭐','🔔','💎','🎯']
const WIN_COMBO = ['⭐','⭐','⭐']
const LOSE_COMBOS = [['🍒','🍋','🍊'],['🔔','🍇','🍋'],['💎','🔔','🍒'],['🎯','🍊','🍒'],['🍇','💎','🔔']]

const VISIBLE = 3
const SYMBOL_H = 72
const SPIN_SYMBOLS = 20
const REEL_DURATIONS = [2200, 3000, 3800]
const TARGET_IDX = SPIN_SYMBOLS
const TARGET_OFFSET = (TARGET_IDX - 1) * SYMBOL_H

export default function NumberMatchGame({ won, onDone }: Props) {
  const [slots] = useState<string[]>(() =>
    won ? WIN_COMBO : LOSE_COMBOS[Math.floor(Math.random() * LOSE_COMBOS.length)]
  )
  const [reelSymbols] = useState<string[][]>(() =>
    [0,1,2].map(i => {
      const strip: string[] = []
      for (let j = 0; j < TARGET_IDX; j++) {
        let sym: string
        do { sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] }
        while (!won && sym === slots[i] && j === TARGET_IDX - 1)
        strip.push(sym)
      }
      strip.push(slots[i])
      for (let j = 0; j < 4; j++) strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      return strip
    })
  )

  const [offsets, setOffsets] = useState<number[]>([0, 0, 0])
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false])
  const [stopped, setStopped] = useState<boolean[]>([false, false, false])
  const [started, setStarted] = useState(false)
  const rafRefs = useRef<(number | null)[]>([null, null, null])
  const startTimes = useRef<(number | null)[]>([null, null, null])

  const allStopped = stopped.every(Boolean)
  const anySpinning = spinning.some(Boolean)
  const middleSymbols = [0,1,2].map(i => stopped[i] ? slots[i] : null)

  function spinReel(reelIdx: number) {
    const duration = REEL_DURATIONS[reelIdx]
    startTimes.current[reelIdx] = performance.now()
    function animate(now: number) {
      const elapsed = now - (startTimes.current[reelIdx] ?? now)
      const t = Math.min(elapsed / duration, 1)
      let offset: number
      if (t < 0.7) {
        offset = TARGET_OFFSET * 0.6 * (t / 0.7)
      } else {
        const slowT = (t - 0.7) / 0.3
        const eased = 1 - Math.pow(1 - slowT, 4)
        offset = TARGET_OFFSET * 0.6 + (TARGET_OFFSET - TARGET_OFFSET * 0.6) * eased
      }
      setOffsets(prev => { const n = [...prev]; n[reelIdx] = offset; return n })
      if (t < 1) {
        rafRefs.current[reelIdx] = requestAnimationFrame(animate)
      } else {
        setOffsets(prev => { const n = [...prev]; n[reelIdx] = TARGET_OFFSET; return n })
        setSpinning(prev => { const n = [...prev]; n[reelIdx] = false; return n })
        setStopped(prev => {
          const n = [...prev]; n[reelIdx] = true
          if (n.every(Boolean)) setTimeout(() => onDone(), 1800)
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
    ;[0,1,2].forEach(i => spinReel(i))
  }

  useEffect(() => () => { rafRefs.current.forEach(r => { if (r) cancelAnimationFrame(r) }) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%', maxWidth: 360 }}>

      {/* Status */}
      <p style={{ color: 'rgba(248,250,252,0.65)', fontSize: '0.875rem', textAlign: 'center', margin: 0, fontWeight: 500 }}>
        {!started ? 'Pull the lever — match all 3 to win!'
          : anySpinning ? 'Spinning…'
          : won ? '⭐ Jackpot! You win!' : 'No match this time'}
      </p>

      {/* Machine */}
      <div style={{
        background: 'linear-gradient(180deg,#1e1b4b 0%,#0f0c29 100%)',
        border: '2px solid rgba(168,85,247,0.5)',
        borderRadius: '1.25rem',
        padding: '1rem',
        boxShadow: '0 0 32px rgba(124,58,237,0.25), inset 0 0 20px rgba(0,0,0,0.4)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Top lights */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.875rem' }}>
          {(['#f59e0b','#ef4444','#22c55e','#3b82f6','#f59e0b'] as string[]).map((c, i) => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%', background: c,
              boxShadow: anySpinning ? `0 0 6px ${c}` : 'none',
              transition: 'box-shadow 0.3s',
            }} />
          ))}
        </div>

        {/* Reels */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {[0,1,2].map(reelIdx => (
            <div key={reelIdx} style={{ flex: '0 0 auto' }}>
              <div style={{
                width: 76,
                height: SYMBOL_H * VISIBLE,
                overflow: 'hidden',
                borderRadius: '0.75rem',
                background: 'rgba(0,0,0,0.5)',
                border: stopped[reelIdx] && won ? '2px solid rgba(245,158,11,0.7)' : '2px solid rgba(255,255,255,0.1)',
                position: 'relative',
                transition: 'border-color 0.4s',
              }}>
                {/* Middle highlight */}
                <div style={{
                  position: 'absolute', top: SYMBOL_H, left: 0, right: 0, height: SYMBOL_H,
                  background: stopped[reelIdx] && won ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                  borderTop: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderBottom: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  zIndex: 2, pointerEvents: 'none', transition: 'all 0.4s',
                }} />
                {/* Scroll strip */}
                <div style={{ position: 'absolute', top: -offsets[reelIdx], left: 0, right: 0 }}>
                  {reelSymbols[reelIdx].map((sym, j) => (
                    <div key={j} style={{
                      height: SYMBOL_H,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem', userSelect: 'none',
                    }}>{sym}</div>
                  ))}
                </div>
                {/* Fades */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(180deg,rgba(15,12,41,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(0deg,rgba(15,12,41,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
              </div>
              {/* Reel dot */}
              <div style={{ textAlign: 'center', marginTop: '0.35rem', fontSize: '0.6rem', fontWeight: 700,
                color: spinning[reelIdx] ? '#a78bfa' : stopped[reelIdx] ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                {spinning[reelIdx] ? '●●●' : stopped[reelIdx] ? '✓' : '○○○'}
              </div>
            </div>
          ))}
        </div>

        {/* Payline */}
        <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
          {middleSymbols.map((s, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '0.4rem',
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${s && won && allStopped ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: s && won && allStopped ? '0 0 10px rgba(245,158,11,0.4)' : 'none',
              transition: 'all 0.4s',
            }}>{s ?? '·'}</div>
          ))}
        </div>
      </div>

      {/* Result banner */}
      {allStopped && (
        <div style={{
          padding: '0.625rem 1.25rem', borderRadius: '0.75rem',
          fontWeight: 700, fontSize: '0.9rem', textAlign: 'center',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
        }}>
          {won ? '⭐ Jackpot! Three stars! You win!' : 'No match this time'}
        </div>
      )}

      {!started && (
        <button onClick={handleSpin} style={{
          padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          border: 'none', borderRadius: '0.875rem',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          width: '100%',
        }}>
          Pull Lever!
        </button>
      )}

      {started && anySpinning && (
        <div style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.85rem', fontWeight: 600 }}>
          Revealing your result…
        </div>
      )}
    </div>
  )
}
