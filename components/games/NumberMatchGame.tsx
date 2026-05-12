'use client'

import { useState, useEffect, useRef } from 'react'

interface Props { won: boolean; onDone: () => void }

const SYMBOLS = ['🍒','🍋','🍊','🍇','⭐','🔔','💎','🎯']
const WIN_COMBO = ['⭐','⭐','⭐']
const LOSE_COMBOS = [['🍒','🍋','🍊'],['🔔','🍇','🍋'],['💎','🔔','🍒'],['🎯','🍊','🍒'],['🍇','💎','🔔']]
const VISIBLE = 3, SYMBOL_H = 96, SPIN_SYMBOLS = 24
const REEL_DURATIONS = [2400, 3200, 4200]
const TARGET_IDX = SPIN_SYMBOLS
const TARGET_OFFSET = (TARGET_IDX - 1) * SYMBOL_H

const LIGHT_COLORS = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444']

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
      for (let j = 0; j < 5; j++) strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      return strip
    })
  )

  const [offsets, setOffsets] = useState<number[]>([0, 0, 0])
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false])
  const [stopped, setStopped] = useState<boolean[]>([false, false, false])
  const [started, setStarted] = useState(false)
  const [leverDown, setLeverDown] = useState(false)
  const rafRefs = useRef<(number | null)[]>([null, null, null])
  const startTimes = useRef<(number | null)[]>([null, null, null])
  const [lightFrame, setLightFrame] = useState(0)
  const lightRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allStopped = stopped.every(Boolean)

  useEffect(() => {
    if (started && !allStopped) {
      lightRef.current = setInterval(() => setLightFrame(f => f + 1), 120)
    } else {
      if (lightRef.current) clearInterval(lightRef.current)
    }
    return () => { if (lightRef.current) clearInterval(lightRef.current) }
  }, [started, allStopped])

  function spinReel(reelIdx: number) {
    const duration = REEL_DURATIONS[reelIdx]
    startTimes.current[reelIdx] = performance.now()
    function animate(now: number) {
      const elapsed = now - (startTimes.current[reelIdx] ?? now)
      const t = Math.min(elapsed / duration, 1)
      let offset: number
      if (t < 0.65) {
        const fastTop = TARGET_OFFSET * 0.55
        offset = fastTop * (t / 0.65)
      } else {
        const slowT = (t - 0.65) / 0.35
        const eased = 1 - Math.pow(1 - slowT, 4)
        offset = TARGET_OFFSET * 0.55 + (TARGET_OFFSET - TARGET_OFFSET * 0.55) * eased
      }
      setOffsets(prev => { const n = [...prev]; n[reelIdx] = offset; return n })
      if (t < 1) {
        rafRefs.current[reelIdx] = requestAnimationFrame(animate)
      } else {
        setOffsets(prev => { const n = [...prev]; n[reelIdx] = TARGET_OFFSET; return n })
        setSpinning(prev => { const n = [...prev]; n[reelIdx] = false; return n })
        setStopped(prev => {
          const n = [...prev]; n[reelIdx] = true
          if (n.every(Boolean)) setTimeout(() => onDone(), 2000)
          return n
        })
      }
    }
    rafRefs.current[reelIdx] = requestAnimationFrame(animate)
  }

  function handleSpin() {
    if (started) return
    setLeverDown(true)
    setTimeout(() => setLeverDown(false), 500)
    setStarted(true)
    setSpinning([true, true, true])
    ;[0,1,2].forEach(i => spinReel(i))
  }

  useEffect(() => () => { rafRefs.current.forEach(r => { if (r) cancelAnimationFrame(r) }) }, [])

  const middleSymbols = [0,1,2].map(i => stopped[i] ? slots[i] : null)
  const anySpinning = spinning.some(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      {/* Status text */}
      <p style={{ color: anySpinning ? '#a855f7' : 'rgba(248,250,252,0.7)', fontSize: '0.95rem', textAlign: 'center', margin: 0, fontWeight: 600, transition: 'color 0.4s' }}>
        {!started ? '🎰 Pull the lever — match all 3 to win!'
          : anySpinning ? '🌀 Spinning…'
          : won ? '🌟 JACKPOT! Three stars! You win!' : '😔 No match — better luck next time'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Machine */}
        <div style={{
          background: 'linear-gradient(180deg,#1e1026 0%,#0d0718 100%)',
          border: '3px solid rgba(168,85,247,0.6)',
          borderRadius: '1.75rem',
          padding: '1.5rem 1.25rem 1.25rem',
          boxShadow: '0 0 50px rgba(124,58,237,0.35), inset 0 0 30px rgba(0,0,0,0.6)',
          position: 'relative',
        }}>
          {/* Casino lights */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            {LIGHT_COLORS.map((c, i) => {
              const lit = anySpinning ? (lightFrame + i) % 3 === 0 : allStopped && won
              return (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: lit ? c : `${c}44`,
                  boxShadow: lit ? `0 0 10px ${c}, 0 0 20px ${c}88` : 'none',
                  transition: 'all 0.1s',
                }} />
              )
            })}
          </div>

          {/* Screen panel */}
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            border: '2px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '0.75rem',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              {[0,1,2].map(reelIdx => (
                <div key={reelIdx}>
                  <div style={{
                    width: 88, height: SYMBOL_H * VISIBLE,
                    overflow: 'hidden', borderRadius: '0.875rem',
                    background: 'rgba(0,0,0,0.7)',
                    border: stopped[reelIdx] && won ? '2px solid rgba(245,158,11,0.8)' : '2px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    boxShadow: stopped[reelIdx] && won ? '0 0 20px rgba(245,158,11,0.4)' : 'none',
                    transition: 'border 0.4s, box-shadow 0.4s',
                  }}>
                    {/* Middle highlight */}
                    <div style={{
                      position: 'absolute', top: SYMBOL_H, left: 0, right: 0, height: SYMBOL_H,
                      background: stopped[reelIdx] && won ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                      borderTop: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      borderBottom: `1px solid ${stopped[reelIdx] && won ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      zIndex: 2, pointerEvents: 'none', transition: 'all 0.4s',
                    }} />
                    {/* Scroll strip */}
                    <div style={{ position: 'absolute', top: -offsets[reelIdx], left: 0, right: 0 }}>
                      {reelSymbols[reelIdx].map((sym, j) => (
                        <div key={j} style={{
                          height: SYMBOL_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '2.75rem', userSelect: 'none',
                          filter: spinning[reelIdx] ? 'blur(1px)' : 'none',
                          transition: 'filter 0.2s',
                        }}>{sym}</div>
                      ))}
                    </div>
                    {/* Fade top/bottom */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(180deg,rgba(0,0,0,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(0deg,rgba(0,0,0,0.95),transparent)', zIndex: 3, pointerEvents: 'none' }} />
                  </div>
                  {/* Reel indicator */}
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 700,
                    color: spinning[reelIdx] ? '#a855f7' : stopped[reelIdx] ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                    {spinning[reelIdx] ? '●●●' : stopped[reelIdx] ? '✓' : '○○○'}
                  </div>
                </div>
              ))}
            </div>

            {/* Payline */}
            <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {middleSymbols.map((s, i) => (
                <div key={i} style={{
                  width: 40, height: 40, borderRadius: '0.625rem',
                  background: 'rgba(0,0,0,0.6)',
                  border: `2px solid ${s && won && allStopped ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: s && won && allStopped ? '0 0 14px rgba(245,158,11,0.5)' : 'none',
                  transition: 'all 0.4s',
                  animation: s && won && allStopped ? 'jackpotBounce 0.4s ease both' : 'none',
                }}>{s ?? '·'}</div>
              ))}
            </div>
          </div>

          {/* Win sparkle overlay */}
          {allStopped && won && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '2rem', pointerEvents: 'none', zIndex: 10, animation: 'sparkleIn 0.5s ease both' }}>
              ✨
            </div>
          )}
        </div>

        {/* Lever */}
        <div
          onClick={!started ? handleSpin : undefined}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, cursor: !started ? 'pointer' : 'default', userSelect: 'none' }}
          title="Pull Lever!"
        >
          {/* Ball */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #f59e0b, #b45309)',
            boxShadow: '0 4px 16px rgba(245,158,11,0.6)',
            border: '2px solid rgba(255,255,255,0.3)',
            animation: started ? 'none' : 'leverBob 1.5s infinite ease-in-out',
            transition: 'transform 0.15s',
            transform: leverDown ? 'translateY(60px)' : 'translateY(0)',
          }} />
          {/* Arm */}
          <div style={{
            width: 8, height: leverDown ? 60 : 100,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.35) 100%)',
            borderRadius: '0 0 4px 4px',
            marginTop: -2,
            transition: 'height 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 0 6px rgba(255,255,255,0.2)',
          }} />
          {/* Base */}
          <div style={{ width: 24, height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.2)' }} />
          {!started && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem', fontWeight: 600, textAlign: 'center' }}>PULL<br />ME</span>}
        </div>
      </div>

      {!started && (
        <button onClick={handleSpin} style={{
          padding: '0.875rem 2.25rem', fontSize: '1.05rem', fontWeight: 800,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          border: '2px solid rgba(168,85,247,0.5)',
          borderRadius: '1rem', color: '#fff', cursor: 'pointer',
          boxShadow: '0 0 28px rgba(124,58,237,0.5)',
          animation: 'shimmer 2s infinite',
        }}>
          🎰 PULL THE LEVER!
        </button>
      )}

      {allStopped && (
        <p style={{ color: 'rgba(248,250,252,0.35)', fontSize: '0.78rem', margin: 0 }}>
          Revealing your result…
        </p>
      )}

      <style>{`
        @keyframes jackpotBounce { 0%{transform:scale(0.5)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes sparkleIn { from{opacity:0;transform:translate(-50%,-50%) scale(0)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes leverBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes shimmer {
          0%,100% { background-position:0% 50%; }
          50% { background-position:100% 50%; }
        }
      `}</style>
    </div>
  )
}
