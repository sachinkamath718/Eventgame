'use client'

import { useState } from 'react'

interface Props {
  won: boolean
  onDone: () => void
}

const WIN_COMBO = ['⭐', '⭐', '⭐']
const LOSE_COMBOS = [
  ['🍋', '🍒', '7️⃣'],
  ['🔔', '🍀', '🍋'],
  ['🎯', '🔔', '⭐'],
]

export default function NumberMatchGame({ won, onDone }: Props) {
  // FIX: compute slots once on mount, not on every render
  const [slots] = useState<string[]>(() =>
    won ? WIN_COMBO : LOSE_COMBOS[Math.floor(Math.random() * LOSE_COMBOS.length)]
  )
  const [revealed, setRevealed] = useState<(string | null)[]>([null, null, null])
  const [flipping, setFlipping] = useState<boolean[]>([false, false, false])
  const [done, setDone] = useState(false)

  function revealSlot(idx: number) {
    if (revealed[idx] !== null || done) return
    setFlipping(f => { const n = [...f]; n[idx] = true; return n })

    setTimeout(() => {
      setRevealed(r => {
        const n = [...r]
        n[idx] = slots[idx]
        // Check if all revealed after this update
        if (n.every(v => v !== null)) {
          setTimeout(() => setDone(true), 600)
        }
        return n
      })
      setFlipping(f => { const n = [...f]; n[idx] = false; return n })
    }, 350)
  }

  function revealAll() {
    if (done) return
    ;[0, 1, 2].forEach((i) => {
      setTimeout(() => revealSlot(i), i * 300)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      <p style={{ color: 'rgba(248,250,252,0.6)', fontSize: '0.95rem', textAlign: 'center' }}>
        Tap each card to reveal — match all 3 to win!
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {[0, 1, 2].map(idx => (
          <div
            key={idx}
            onClick={() => revealSlot(idx)}
            style={{
              width: 90,
              height: 110,
              borderRadius: '1rem',
              cursor: revealed[idx] !== null ? 'default' : 'pointer',
              perspective: 600,
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              background: revealed[idx] !== null
                ? 'linear-gradient(135deg, rgba(124,62,237,0.3), rgba(67,56,202,0.3))'
                : 'linear-gradient(135deg, #4338ca, #7c3aed)',
              border: revealed[idx] !== null
                ? '2px solid rgba(168,85,247,0.4)'
                : '2px solid rgba(255,255,255,0.15)',
              boxShadow: revealed[idx] !== null
                ? '0 0 20px rgba(168,85,247,0.3)'
                : '0 4px 16px rgba(0,0,0,0.4)',
              animation: flipping[idx] ? 'flipCardIn 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
              transition: 'background 0.3s, border 0.3s',
              userSelect: 'none',
            }}>
              {revealed[idx] !== null ? revealed[idx] : '❓'}
            </div>
          </div>
        ))}
      </div>

      {/* Match indicator */}
      {revealed.every(v => v !== null) && (
        <div style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
          fontWeight: 700,
          fontSize: '1rem',
          textAlign: 'center',
        }}>
          {won ? '⭐ Three of a kind! You win!' : '😔 No match this time'}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!done && revealed.some(v => v === null) && (
          <button onClick={revealAll} className="btn-secondary">
            Reveal All
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
