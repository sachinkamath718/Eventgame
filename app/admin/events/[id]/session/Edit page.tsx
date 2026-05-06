'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Participant = {
  id: string; name: string; designation: string; company: string; created_at: string
}
type Session = {
  id: string; event_id: string; is_active: boolean
  started_at: string; winner_registration_id?: string
}

export default function AdminSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [eventName, setEventName]       = useState('')
  const [session, setSession]           = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading]           = useState(true)
  const [starting, setStarting]         = useState(false)
  const [picking, setPicking]           = useState<string | null>(null)
  const [winner, setWinner]             = useState<Participant | null>(null)
  const [ending, setEnding]             = useState(false)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    fetch('/api/admin/events').then(r => r.json()).then(d => {
      const ev = (d.events || []).find((e: { id: string; name: string }) => e.id === id)
      if (ev) setEventName(ev.name)
    })
  }, [id])

  async function loadSession() {
    const res = await fetch(`/api/session?eventId=${id}`)
    const data = await res.json()
    setSession(data.session || null)
    setParticipants(data.participants || [])
    setLoading(false)
  }

  useEffect(() => {
    loadSession()
    const t = setInterval(loadSession, 3000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    if (!session?.is_active) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase
      .channel(`session-reg-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'registrations', filter: `event_id=eq.${id}`,
      }, (payload) => {
        const reg = payload.new as Participant
        setParticipants(prev => prev.find(p => p.id === reg.id) ? prev : [reg, ...prev])
      })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [session?.id, session?.is_active])

  async function startSession() {
    setStarting(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      })
      const data = await res.json()
      setSession(data.session)
      setParticipants([])
      setWinner(null)
    } finally { setStarting(false) }
  }

  async function pickWinner(p: Participant) {
    if (!session) return
    setPicking(p.id)
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, winnerId: p.id }),
      })
      setWinner(p)
      setSession(s => s ? { ...s, is_active: false, winner_registration_id: p.id } : s)
    } finally { setPicking(null) }
  }

  async function endSession() {
    if (!session) return
    setEnding(true)
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, end: true }),
      })
      setSession(s => s ? { ...s, is_active: false } : s)
    } finally { setEnding(false) }
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '1rem', padding: '1.5rem',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,250,252,0.3)', fontFamily: 'Inter,sans-serif' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.015)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push(`/admin/events/${id}`)}
            style={{ background: 'none', border: 'none', color: 'rgba(248,250,252,0.4)', cursor: 'pointer', fontSize: '0.875rem' }}>
            ← Back
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Grand Prize Session</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)' }}>{eventName}</p>
          </div>
        </div>
        {session?.is_active && (
          <button onClick={endSession} disabled={ending} style={{
            padding: '0.5rem 1rem',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '0.65rem', color: '#fca5a5',
            fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
          }}>
            {ending ? 'Ending…' : 'End Session'}
          </button>
        )}
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Winner announcement */}
        {winner && (
          <div style={{
            ...card,
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.05)',
            textAlign: 'center', padding: '2rem',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem', fontWeight: 900, color: '#fcd34d' }}>
              {winner.name}
            </h2>
            <p style={{ margin: '0 0 1rem', color: 'rgba(248,250,252,0.5)', fontSize: '0.875rem' }}>
              {winner.designation}{winner.company ? ` · ${winner.company}` : ''}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.35)' }}>
              Their wheel has landed on the Grand Prize. All other participants have been marked &quot;Better Luck Next Time&quot;.
            </p>
          </div>
        )}

        {/* No session */}
        {!session && (
          <div style={{ ...card, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 1.25rem',
            }}>🎰</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>Start a Grand Prize Draw</h2>
            <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.875rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
              When a session is live, participants who register will see their spin wheel keep spinning until you pick a winner.
            </p>
            <button onClick={startSession} disabled={starting} style={{
              padding: '0.875rem 2rem',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              border: 'none', borderRadius: '0.875rem',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>
              {starting ? 'Starting…' : 'Start Session'}
            </button>
          </div>
        )}

        {/* Active session */}
        {session?.is_active && !winner && (
          <>
            {/* Status */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '0.875rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontWeight: 600, color: '#4ade80', fontSize: '0.875rem' }}>Session Live</span>
                <span style={{ color: 'rgba(248,250,252,0.35)', fontSize: '0.78rem' }}>· Participants spinning now</span>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(248,250,252,0.5)' }}>
                {participants.length} registered
              </span>
            </div>

            {/* Participant list */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 700, color: 'rgba(248,250,252,0.6)' }}>
                Click a participant to crown them Grand Prize winner
              </h3>

              {participants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(248,250,252,0.25)', fontSize: '0.875rem' }}>
                  Waiting for participants to register…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {participants.map(p => (
                    <button
                      key={p.id}
                      onClick={() => pickWinner(p)}
                      disabled={!!picking}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1.125rem',
                        background: picking === p.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${picking === p.id ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '0.75rem', cursor: picking ? 'not-allowed' : 'pointer',
                        textAlign: 'left', color: '#f8fafc', transition: 'all 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                          color: '#fff',
                        }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>
                            {p.designation}{p.company ? ` · ${p.company}` : ''}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: picking === p.id ? '#fcd34d' : 'rgba(248,250,252,0.25)', fontWeight: 600 }}>
                        {picking === p.id ? 'Selecting…' : 'Pick'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Ended with no winner */}
        {session && !session.is_active && !winner && !session.winner_registration_id && (
          <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'rgba(248,250,252,0.4)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
              Session ended without a winner selected.
            </p>
            <button onClick={startSession} disabled={starting} style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              border: 'none', borderRadius: '0.75rem',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}>
              {starting ? 'Starting…' : 'Start New Session'}
            </button>
          </div>
        )}

        {/* New session after winner picked */}
        {winner && (
          <button onClick={startSession} disabled={starting} style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '0.75rem', color: '#a78bfa',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
            alignSelf: 'center',
          }}>
            {starting ? 'Starting…' : 'Start New Session'}
          </button>
        )}

      </div>
    </div>
  )
}
