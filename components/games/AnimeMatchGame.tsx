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

export default function AnimeMatchGame({ won, onDone }: Props) {
  const pairsNeeded = won ? 3 : 2
  const emojis = ALL_EMOJIS.slice(0, 3)
  const [cards, setCards] = useState(() =>
    shuffle([...emojis, ...emojis].map((e, i) => ({
      id: i, emoji: e, flipped: false, matched: false, shake: false, bounce: false,
    })))
  )
  const [selected, setSelected] = useState<number[]>([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [locked, setLocked] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const [showStars, setShowStars] = useState<number[]>([]) // card ids that just matched

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
          // Match!
          const matched = newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, matched: true, bounce: true } : c
          )
          setCards(matched)
          setShowStars([a.id, b.id])
          setTimeout(() => {
            setCards(prev => prev.map(c => ({ ...c, bounce: false })))
            setShowStars([])
          }, 700)
          const newCount = matchedCount + 1
          setMatchedCount(newCount)
          if (newCount === 3) {
            setMessage(won ? '🎉 All pairs found! You Win!' : '😊 Nice effort!')
            setTimeout(() => setDone(true), 900)
          } else if (!won && newCount >= pairsNeeded) {
            setMessage('😔 So close! Better luck next time')
            setTimeout(() => setDone(true), 900)
          }
        } else {
          // Mismatch — shake
          setCards(newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, shake: true } : c
          ))
          setTimeout(() => {
            setCards(prev => prev.map(c =>
              c.id === a.id || c.id === b.id ? { ...c, flipped: false, shake: false } : c
            ))
          }, 500)
        }
        setSelected([])
        setLocked(false)
      }, 800)
    }
  }

  useEffect(() => {
    if (!won && matchedCount === 2 && cards.filter(c => c.matched).length === 4) {
      setMessage('😔 So close! Better luck next time')
      setTimeout(() => setDone(true), 1000)
    }
  }, [matchedCount]) // eslint-disable-line

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(248,250,252,0.75)', fontSize: '0.95rem', margin: '0 0 0.4rem', fontWeight: 600 }}>
          🃏 Find all matching pairs to win!
        </p>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 36, height: 8, borderRadius: 4,
              background: i < matchedCount ? '#4ade80' : 'rgba(255,255,255,0.1)',
              boxShadow: i < matchedCount ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
              transition: 'all 0.4s',
            }} />
          ))}
          <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>
            {matchedCount}/3
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 100px)',
        gridTemplateRows: 'repeat(2, 100px)',
        gap: '0.875rem',
      }}>
        {cards.map(card => (
          <div key={card.id} style={{ position: 'relative' }}>
            {/* Star burst on match */}
            {showStars.includes(card.id) && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute', fontSize: '0.9rem',
                    animation: `starBurst 0.6s ${i * 60}ms ease-out forwards`,
                    '--angle': `${i * 60}deg`,
                  } as React.CSSProperties}>⭐</div>
                ))}
              </div>
            )}
            <div
              onClick={() => flipCard(card.id)}
              style={{
                width: 100, height: 100,
                borderRadius: '1.125rem',
                cursor: card.matched || card.flipped ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem',
                background: card.matched
                  ? 'linear-gradient(135deg,rgba(34,197,94,0.3),rgba(16,185,129,0.2))'
                  : card.flipped
                  ? 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(67,56,202,0.35))'
                  : 'linear-gradient(135deg,#4338ca,#7c3aed)',
                border: card.matched
                  ? '2.5px solid rgba(74,222,128,0.7)'
                  : card.flipped
                  ? '2.5px solid rgba(168,85,247,0.7)'
                  : '2.5px solid rgba(255,255,255,0.12)',
                boxShadow: card.matched
                  ? '0 0 22px rgba(74,222,128,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : card.flipped
                  ? '0 0 16px rgba(168,85,247,0.4)'
                  : '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
                userSelect: 'none',
                // 3D flip effect via transform perspective
                transform: card.shake
                  ? 'translateX(0)'
                  : card.bounce
                  ? 'scale(1.12)'
                  : card.flipped && !card.matched
                  ? 'rotateY(0deg)'
                  : 'rotateY(0deg)',
                animation: card.shake
                  ? 'cardShake 0.45s ease'
                  : card.bounce
                  ? 'cardBounce 0.45s cubic-bezier(0.34,1.56,0.64,1)'
                  : card.flipped && !card.matched
                  ? 'cardFlipIn 0.35s cubic-bezier(0.22,1,0.36,1) both'
                  : 'none',
                // Unflipped card: subtle shimmer background
                backgroundImage: !card.flipped && !card.matched
                  ? 'linear-gradient(135deg,#4338ca,#7c3aed,#4338ca)'
                  : undefined,
              }}
            >
              {card.flipped || card.matched ? (
                <span style={{ animation: card.matched ? 'matchPop 0.3s ease both' : 'none' }}>
                  {card.emoji}
                </span>
              ) : (
                // Card back: pattern
                <span style={{ fontSize: '1.6rem', opacity: 0.5, animation: 'cardPulse 2s infinite' }}>✦</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '0.875rem 1.75rem',
          borderRadius: '0.875rem',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.12)',
          border: `2px solid ${won ? 'rgba(245,158,11,0.5)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
          fontWeight: 700, textAlign: 'center', fontSize: '1rem',
          animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {message}
        </div>
      )}

      {done && (
        <button onClick={onDone} style={{
          padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          border: 'none', borderRadius: '0.875rem', color: '#fff', cursor: 'pointer',
          boxShadow: '0 0 24px rgba(124,58,237,0.5)',
          animation: 'fadeInUp 0.4s ease both',
        }}>
          See Your Prize →
        </button>
      )}

      <style>{`
        @keyframes cardFlipIn {
          from { transform: rotateY(-90deg) scale(0.85); opacity:0; }
          to   { transform: rotateY(0deg) scale(1); opacity:1; }
        }
        @keyframes cardShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px) rotate(-3deg); }
          40%      { transform: translateX(8px) rotate(3deg); }
          60%      { transform: translateX(-6px) rotate(-2deg); }
          80%      { transform: translateX(6px) rotate(2deg); }
        }
        @keyframes cardBounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes matchPop {
          0%   { transform: scale(0.6); opacity:0.5; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity:1; }
        }
        @keyframes starBurst {
          0%   { transform: rotate(var(--angle)) translateY(0) scale(1); opacity:1; }
          100% { transform: rotate(var(--angle)) translateY(-50px) scale(0.3); opacity:0; }
        }
        @keyframes cardPulse {
          0%,100% { opacity:0.45; }
          50%      { opacity:0.65; }
        }
        @keyframes slideUpFade {
          from { transform: translateY(12px); opacity:0; }
          to   { transform: translateY(0); opacity:1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(16px); opacity:0; }
          to   { transform: translateY(0); opacity:1; }
        }
      `}</style>
    </div>
  )
}
