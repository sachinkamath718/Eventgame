'use client'

import { useState, useEffect } from 'react'

interface Props { won: boolean; onDone: () => void }

const ALL_EMOJIS = ['🐉','🦊','🐼','🦁','🐯','🦄','🐸','🦋','🦅','🐬','🐧','🦜']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Total allowed flips: winning needs 3 matches = 6 flips min.
// Losing: player gets limited attempts (max mismatches).
const MAX_MISMATCHES = 3 // losing player gets 3 wrong attempts then game ends

export default function AnimeMatchGame({ won, onDone }: Props) {
  const emojis = ALL_EMOJIS.slice(0, 3) // always 3 pairs, 6 cards
  const [cards, setCards] = useState(() =>
    shuffle([...emojis, ...emojis].map((e, i) => ({
      id: i, emoji: e, flipped: false, matched: false, shake: false,
    })))
  )
  const [selected, setSelected] = useState<number[]>([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [mismatchCount, setMismatchCount] = useState(0)
  const [locked, setLocked] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')

  // Derived
  const chancesLeft = won ? null : Math.max(0, MAX_MISMATCHES - mismatchCount)

  function flipCard(id: number) {
    if (locked || done) return
    const card = cards.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return
    if (selected.length === 1 && selected[0] === id) return

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c)
    setCards(newCards)
    const newSel = [...selected, id]
    setSelected(newSel)

    if (newSel.length === 2) {
      setLocked(true)
      const [a, b] = newSel.map(sid => newCards.find(c => c.id === sid)!)
      setTimeout(() => {
        if (a.emoji === b.emoji) {
          // Match
          const matched = newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
          )
          setCards(matched)
          const newCount = matchedCount + 1
          setMatchedCount(newCount)

          if (newCount === 3) {
            // All matched
            setMessage(won ? 'All pairs found! You Win!' : 'Nice try!')
            setTimeout(() => { setDone(true); onDone() }, 900)
          } else if (!won && newCount >= 2) {
            // Loser found 2 pairs — still trigger end
            setMessage('So close! Better luck next time')
            setTimeout(() => { setDone(true); onDone() }, 900)
          }
        } else {
          // Mismatch — shake then flip back
          setCards(newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, shake: true } : c
          ))
          setTimeout(() => {
            setCards(prev => prev.map(c =>
              c.id === a.id || c.id === b.id ? { ...c, flipped: false, shake: false } : c
            ))
          }, 480)

          const newMis = mismatchCount + 1
          setMismatchCount(newMis)

          if (!won && newMis >= MAX_MISMATCHES) {
            // Loser exhausted attempts
            setTimeout(() => {
              setMessage('Better luck next time!')
              setDone(true)
              onDone()
            }, 600)
          }
        }
        setSelected([])
        setLocked(false)
      }, 750)
    }
  }

  // Safety: if loser somehow completes all 3 without hitting mismatch limit, end too
  useEffect(() => {
    if (!won && matchedCount === 3 && !done) {
      setMessage('Nice try!')
      setTimeout(() => { setDone(true); onDone() }, 800)
    }
  }, [matchedCount]) // eslint-disable-line

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>

      {/* Header info */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p style={{ color: 'rgba(248,250,252,0.7)', fontSize: '0.875rem', margin: '0 0 0.75rem', fontWeight: 500 }}>
          Find all matching pairs to win!
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          {/* Matched progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>MATCHED</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 28, height: 7, borderRadius: 4,
                  background: i < matchedCount ? '#4ade80' : 'rgba(255,255,255,0.1)',
                  boxShadow: i < matchedCount ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
                  transition: 'all 0.35s',
                }} />
              ))}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.5)', fontWeight: 700 }}>{matchedCount}/3</span>
          </div>

          {/* Chances left — only show for losers */}
          {!won && chancesLeft !== null && !done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>CHANCES</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: i < chancesLeft ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                    boxShadow: i < chancesLeft ? '0 0 6px rgba(245,158,11,0.5)' : 'none',
                    transition: 'all 0.35s',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', color: chancesLeft <= 1 ? '#f87171' : 'rgba(248,250,252,0.5)', fontWeight: 700 }}>
                {chancesLeft} left
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card grid — 3×2, responsive */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.625rem',
        width: '100%',
        maxWidth: 320,
      }}>
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => flipCard(card.id)}
            style={{
              aspectRatio: '1',
              borderRadius: '0.875rem',
              cursor: card.matched || card.flipped || done ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(1.75rem, 8vw, 2.25rem)',
              background: card.matched
                ? 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.15))'
                : card.flipped
                ? 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(67,56,202,0.3))'
                : 'linear-gradient(135deg,#4338ca,#7c3aed)',
              border: card.matched
                ? '2px solid rgba(74,222,128,0.6)'
                : card.flipped
                ? '2px solid rgba(168,85,247,0.6)'
                : '2px solid rgba(255,255,255,0.1)',
              boxShadow: card.matched ? '0 0 18px rgba(74,222,128,0.3)' : 'none',
              transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
              userSelect: 'none',
              animation: card.shake
                ? 'cardShake 0.45s ease'
                : card.matched
                ? 'cardBounce 0.4s cubic-bezier(0.34,1.56,0.64,1)'
                : card.flipped && !card.matched
                ? 'cardFlipIn 0.3s cubic-bezier(0.22,1,0.36,1) both'
                : 'none',
            }}
          >
            {card.flipped || card.matched ? card.emoji : (
              <span style={{ opacity: 0.45, fontSize: '1.4rem' }}>✦</span>
            )}
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.12)',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
          fontWeight: 700, textAlign: 'center', fontSize: '0.9rem',
          animation: 'slideUpFade 0.35s ease both',
        }}>
          {message}
        </div>
      )}

      <style>{`
        @keyframes cardFlipIn {
          from { transform: rotateY(-80deg) scale(0.85); opacity:0; }
          to   { transform: rotateY(0deg) scale(1); opacity:1; }
        }
        @keyframes cardShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-7px) rotate(-2deg); }
          40%     { transform: translateX(7px) rotate(2deg); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes cardBounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.15); }
          70%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes slideUpFade {
          from { transform: translateY(10px); opacity:0; }
          to   { transform: translateY(0); opacity:1; }
        }
      `}</style>
    </div>
  )
}
