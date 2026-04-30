'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Participant { id: string; name: string; designation: string; company: string | null; created_at: string }
interface Session { id: string; is_active: boolean; started_at: string; winner_registration_id: string | null }

export default function SessionPage() {
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/session?eventId=${eventId}`)
    const data = await res.json()
    setSession(data.session)
    setParticipants(data.participants || [])
  }, [eventId])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`session-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations', filter: `event_id=eq.${eventId}` }, () => {
        fetchSession()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId, supabase, fetchSession])

  // Timer
  useEffect(() => {
    if (session?.is_active && session.started_at) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session?.is_active, session?.started_at])

  async function startSession() {
    setLoading(true)
    const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
    const data = await res.json()
    setSession(data.session)
    setParticipants([])
    setWinner(null)
    setElapsed(0)
    setLoading(false)
  }

  async function selectWinner(participant: Participant) {
    if (!session || !confirm(`Select ${participant.name} as the Grand Prize Winner?`)) return
    setSelecting(participant.id)
    await fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, winnerId: participant.id }),
    })
    setWinner(participant)
    setSession(s => s ? { ...s, is_active: false } : s)
    if (timerRef.current) clearInterval(timerRef.current)
    setSelecting(null)
  }

  async function endSession() {
    if (!session || !confirm('End this session without selecting a winner?')) return
    await fetch('/api/session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, end: true }) })
    setSession(s => s ? { ...s, is_active: false } : s)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1rem', margin: 0 }}>🏆 Grand Prize Session</h1>
        </div>
        {session?.is_active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>
              ⏱ {formatTime(elapsed)}
            </div>
            <button onClick={endSession} style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}>
              End Session
            </button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
        {/* Winner announcement */}
        {winner && (
          <div className="animate-bounce-in" style={{ padding: '2rem', borderRadius: '1.5rem', border: '2px solid rgba(245,158,11,0.6)', background: 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.1))', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 900, fontSize: '1.75rem', marginBottom: '0.25rem', color: '#fcd34d' }}>Grand Prize Winner!</h2>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{winner.name}</p>
            <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.9rem' }}>{winner.designation}{winner.company ? ` @ ${winner.company}` : ''}</p>
          </div>
        )}

        {/* Session controls */}
        {!session?.is_active && !winner && (
          <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>Grand Prize Session</h2>
            <p style={{ color: 'rgba(248,250,252,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Start a session to capture live participants. All registrations during this window will appear below for you to select the winner.
            </p>
            <button onClick={startSession} disabled={loading} className="btn-primary" style={{ maxWidth: 220, fontSize: '1rem', padding: '0.875rem' }}>
              {loading ? '⏳ Starting…' : '🚀 Start Session'}
            </button>
          </div>
        )}

        {/* Active session info */}
        {session?.is_active && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="glass-card" style={{ flex: 1, padding: '1.25rem', minWidth: 120 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', marginBottom: '0.25rem' }}>PARTICIPANTS</div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '2rem', color: '#a855f7' }}>{participants.length}</div>
            </div>
            <div className="glass-card" style={{ flex: 1, padding: '1.25rem', minWidth: 120 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', marginBottom: '0.25rem' }}>STATUS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.7)', animation: 'floatParticle 1.5s ease-in-out infinite' }} />
                <span style={{ fontWeight: 600, color: '#4ade80', fontSize: '0.9rem' }}>LIVE</span>
              </div>
            </div>
            <div className="glass-card" style={{ flex: 2, padding: '1.25rem', minWidth: 200 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', marginBottom: '0.25rem' }}>ELAPSED</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5rem', color: '#f59e0b' }}>{formatTime(elapsed)}</div>
            </div>
          </div>
        )}

        {/* Participants grid */}
        {(session?.is_active || participants.length > 0) && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>
                {session?.is_active ? '📡 Live Participants' : '📋 Session Participants'}
              </h3>
              {session?.is_active && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>
                  Auto-refreshing via realtime
                </span>
              )}
            </div>

            {participants.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.9rem' }}>
                  Waiting for participants to register…
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {participants.map(p => (
                  <div
                    key={p.id}
                    className="glass-card animate-slide-up"
                    style={{
                      padding: '1.25rem',
                      border: winner?.id === p.id ? '2px solid #f59e0b' : undefined,
                      background: winner?.id === p.id ? 'rgba(245,158,11,0.08)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                      }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.designation}</div>
                      </div>
                    </div>
                    {p.company && <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)', marginBottom: '0.75rem' }}>@ {p.company}</div>}
                    {session?.is_active && !winner && (
                      <button
                        onClick={() => selectWinner(p)}
                        disabled={!!selecting}
                        style={{
                          width: '100%', padding: '0.5rem', borderRadius: '0.625rem',
                          border: '1px solid rgba(245,158,11,0.4)',
                          background: selecting === p.id ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.1)',
                          color: '#fcd34d', cursor: selecting ? 'not-allowed' : 'pointer',
                          fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.2s',
                        }}
                      >
                        {selecting === p.id ? '⏳ Selecting…' : '🏆 Select as Winner'}
                      </button>
                    )}
                    {winner?.id === p.id && (
                      <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>🏆 WINNER</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
