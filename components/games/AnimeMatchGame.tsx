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
  const pairsNeeded = won ? 3 : 2 // win = find 3 pairs, lose = only 2 match-able but board is 3 pairs
  const emojis = ALL_EMOJIS.slice(0, 3) // always 3 pairs
  const [cards, setCards] = useState(() =>
    shuffle([...emojis, ...emojis].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })))
  )
  const [selected, setSelected] = useState<number[]>([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [locked, setLocked] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')

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
          const matched = newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
          )
          setCards(matched)
          const newCount = matchedCount + 1
          setMatchedCount(newCount)
          if (newCount === 3) {
            setMessage(won ? '🎉 All pairs matched! You win!' : '😊 Nice try!')
            setTimeout(() => setDone(true), 800)
          } else if (!won && newCount >= pairsNeeded) {
            setMessage('😔 Time\'s up — better luck next time')
            setTimeout(() => setDone(true), 800)
          }
        } else {
          setCards(newCards.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
          ))
        }
        setSelected([])
        setLocked(false)
      }, 900)
    }
  }

  // For losing: auto-reveal wrong result after all flipped
  useEffect(() => {
    if (!won && matchedCount === 2 && cards.filter(c => c.matched).length === 4) {
      setMessage('😔 So close! Better luck next time')
      setTimeout(() => setDone(true), 1000)
    }
  }, [matchedCount])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <p style={{ color: 'rgba(248,250,252,0.6)', fontSize: '0.9rem', textAlign: 'center' }}>
        Find all matching pairs to win!
        <br />
        <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)' }}>
          {matchedCount}/3 matched
        </span>
      </p>

      {/* 2×3 grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 80px)',
        gridTemplateRows: 'repeat(2, 80px)',
        gap: '0.75rem',
      }}>
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => flipCard(card.id)}
            style={{
              width: 80, height: 80,
              borderRadius: '1rem',
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
              background: card.matched
                ? 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))'
                : card.flipped
                ? 'linear-gradient(135deg, rgba(124,62,237,0.3), rgba(67,56,202,0.3))'
                : 'linear-gradient(135deg, #4338ca, #7c3aed)',
              border: card.matched
                ? '2px solid rgba(34,197,94,0.5)'
                : card.flipped
                ? '2px solid rgba(168,85,247,0.5)'
                : '2px solid rgba(255,255,255,0.1)',
              boxShadow: card.matched ? '0 0 16px rgba(34,197,94,0.3)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              userSelect: 'none',
              animation: card.flipped && !card.matched ? 'flipCardIn 0.3s ease both' : 'none',
            }}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </div>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.1)',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
          color: won ? '#fcd34d' : '#94a3b8',
          fontWeight: 700,
          textAlign: 'center',
          animation: 'slideUpFade 0.4s ease both',
        }}>
          {message}
        </div>
      )}

      {done && (
        <button onClick={onDone} className="btn-primary" style={{ maxWidth: 200 }}>
          See Your Prize →
        </button>
      )}
    </div>
  )
}
