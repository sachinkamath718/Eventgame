'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Participant = {
  id: string; name: string; designation: string; company: string; email: string; created_at: string
}
type Session = {
  id: string; event_id: string; is_active: boolean
  started_at: string; ended_at?: string; winner_registration_id?: string
}

export default function AdminSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [eventName, setEventName]           = useState('')
  const [session, setSession]               = useState<Session | null>(null)
  const [participants, setParticipants]     = useState<Participant[]>([])
  const [loading, setLoading]               = useState(true)
  const [starting, setStarting]             = useState(false)
  const [ending, setEnding]                 = useState(false)
  const [picking, setPicking]               = useState(false)
  const [winner, setWinner]                 = useState<Participant | null>(null)
  const [search, setSearch]                 = useState('')
  const [grandPrizeName, setGrandPrizeName] = useState('Grand Prize')
  const [confirm, setConfirm]               = useState<Participant | null>(null)
  const [manualName, setManualName]         = useState('')
  const [addingManual, setAddingManual]     = useState(false)
  const [grandPrizeStock, setGrandPrizeStock] = useState<{quantity: number, claimed: number} | null>(null)

  const supabase   = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    fetch('/api/admin/events').then(r => r.json()).then(d => {
      const ev = (d.events || []).find((e: { id: string; name: string }) => e.id === id)
      if (ev) setEventName(ev.name)
    })
  }, [id])

  const loadSession = useCallback(async () => {
    const res  = await fetch(`/api/session?eventId=${id}`)
    const data = await res.json()
    const s: Session | null = data.session ?? null
    setSession(s)
    setParticipants(data.participants ?? [])
    setGrandPrizeStock(data.grandPrizeStock ?? null)

    if (s?.winner_registration_id && !s.is_active) {
      const fromList = (data.participants as Participant[]).find(
        p => p.id === s.winner_registration_id
      )
      if (fromList) {
        setWinner(fromList)
      } else {
        const { data: reg } = await supabase
          .from('registrations')
          .select('id, name, designation, company, created_at')
          .eq('id', s.winner_registration_id)
          .single()
        if (reg) setWinner(reg as Participant)
      }
    }

    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    loadSession()
    const t = setInterval(loadSession, 4000)
    return () => clearInterval(t)
  }, [loadSession])

  // Realtime new registrations while session is live
  useEffect(() => {
    if (!session?.is_active) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const ch = supabase
      .channel(`session-reg-${id}-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'registrations', filter: `event_id=eq.${id}`,
      }, (payload) => {
        const reg = payload.new as Participant
        setParticipants(prev =>
          prev.find(p => p.id === reg.id) ? prev : [reg, ...prev]
        )
      })
      .subscribe()

    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [session?.id, session?.is_active, id, supabase])

  // Start session
  async function startSession() {
    setStarting(true)
    setWinner(null)
    setSearch('')
    setManualName('')
    try {
      const res  = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      setSession(data.session)
      setParticipants([])
    } finally { setStarting(false) }
  }

  // Manually add a participant during a live session
  async function addManualParticipant() {
    const name = manualName.trim()
    if (!name || !session) return
    setAddingManual(true)
    try {
      const res  = await fetch('/api/session', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ eventId: id, name }),
      })
      const data = await res.json()
      if (res.ok && data.participant) {
        setParticipants(prev =>
          prev.find(p => p.id === data.participant.id) ? prev : [data.participant, ...prev]
        )
        setManualName('')
      }
    } finally { setAddingManual(false) }
  }

  // Pick winner
  async function confirmPick() {
    if (!session || !confirm) return
    const p = confirm
    setConfirm(null)
    setPicking(true)
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:         session.id,
          winnerId:          p.id,
          grandPrizeName:    grandPrizeName.trim() || 'Grand Prize',
          allParticipantIds: participants.map(x => x.id),
          eventId:           id,
        }),
      })
      setWinner(p)
      setSession(s => s ? { ...s, is_active: false, winner_registration_id: p.id } : s)
    } finally { setPicking(false) }
  }

  // End session without winner
  async function endSession() {
    if (!session) return
    setEnding(true)
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, end: true, eventId: id }),
      })
      setSession(s => s ? { ...s, is_active: false } : s)
    } finally { setEnding(false) }
  }

  const filtered = participants.filter(p =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.designation?.toLowerCase().includes(search.toLowerCase()) ||
    p.company?.toLowerCase().includes(search.toLowerCase())
  )

  const card: React.CSSProperties = {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: '1rem',
    padding:      '1.5rem',
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0d0d1f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(248,250,252,0.3)', fontFamily: 'Inter,sans-serif',
    }}>Loading…</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>

      {/* Confirm modal */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            background: '#131327', border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: '1.25rem', padding: '2.25rem',
            maxWidth: 400, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>
              Crown as Grand Prize Winner?
            </h2>
            <p style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', fontWeight: 700, color: '#fcd34d' }}>
              {confirm.name}
            </p>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'rgba(248,250,252,0.45)' }}>
              {confirm.designation}{confirm.company ? ` · ${confirm.company}` : ''}
            </p>
            <div style={{
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1.5rem',
              fontSize: '0.82rem', color: 'rgba(248,250,252,0.55)', lineHeight: 1.6,
            }}>
              Prize: <strong style={{ color: '#fcd34d' }}>{grandPrizeName.trim() || 'Grand Prize'}</strong>
              <br />
              {participants.length - 1} other participant{participants.length !== 2 ? 's' : ''} will
              immediately see &ldquo;Better Luck Next Time&rdquo;.
              <br />
              <span style={{ color: 'rgba(248,113,113,0.7)', fontSize: '0.78rem' }}>
                ⚠ Event will stay locked after — re-open from the Edit page.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirm(null)} style={{
                flex: 1, padding: '0.75rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem', color: 'rgba(248,250,252,0.6)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              }}>Cancel</button>
              <button onClick={confirmPick} style={{
                flex: 1, padding: '0.75rem',
                background: 'linear-gradient(135deg,#d97706,#b45309)',
                border: 'none', borderRadius: '0.75rem',
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
              }}>Confirm Winner</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.015)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push(`/admin/events/${id}`)} style={{
            background: 'none', border: 'none',
            color: 'rgba(248,250,252,0.4)', cursor: 'pointer', fontSize: '0.875rem',
          }}>← Back</button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Grand Prize Session</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)' }}>{eventName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {session?.is_active && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: '0.5rem', fontSize: '0.75rem', color: '#fca5a5',
              }}>
                🔒 Event locked
              </div>
              <button onClick={endSession} disabled={ending} style={{
                padding: '0.5rem 1rem',
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: '0.65rem', color: '#fca5a5',
                fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
              }}>{ending ? 'Ending…' : 'End Session'}</button>
            </>
          )}
          {winner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '0.5rem', fontSize: '0.75rem', color: '#fca5a5',
            }}>
              🔒 Event locked — re-open from Edit page
            </div>
          )}
        </div>
      </header>

      <div style={{
        maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
      }}>

        {/* Winner card */}
        {winner && (
          <div style={{
            ...card,
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.05)',
            textAlign: 'center', padding: '2.25rem',
          }}>
            <div style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 900, color: '#fcd34d' }}>
              {winner.name}
            </h2>
            <p style={{ margin: '0 0 0.5rem', color: 'rgba(248,250,252,0.5)', fontSize: '0.875rem' }}>
              {winner.designation}{winner.company ? ` · ${winner.company}` : ''}
            </p>
            <p style={{ margin: '0 0 1rem', color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem' }}>
              {grandPrizeName.trim() || 'Grand Prize'}
            </p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', color: 'rgba(248,250,252,0.35)' }}>
              Their screen now shows the winner card. All other participants have been notified.
            </p>
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '0.75rem', fontSize: '0.8rem', color: 'rgba(248,250,252,0.5)',
            }}>
              🔒 Event is locked. To allow new registrations, toggle it active from the{' '}
              <button
                onClick={() => router.push(`/admin/events/${id}`)}
                style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
              >Edit page</button>.
            </div>
          </div>
        )}

        {/* No session yet */}
        {!session && (
          <div style={{ ...card, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 1.25rem',
            }}>🎰</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
              Start a Grand Prize Draw
            </h2>
            <p style={{
              color: 'rgba(248,250,252,0.4)', fontSize: '0.875rem',
              margin: '0 0 0.75rem', lineHeight: 1.6,
            }}>
              Starting a session locks the event — no new registrations until you end it or pick a winner.
              All registered participants see their wheel spinning live until you select someone.
            </p>
            <div style={{
              padding: '0.625rem 0.875rem', marginBottom: '0.75rem',
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
              borderRadius: '0.65rem', fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)',
            }}>
              🔒 Event will be locked while the session is live
            </div>
            
            {grandPrizeStock && (
              <div style={{
                padding: '0.625rem 0.875rem', marginBottom: '1.75rem',
                background: grandPrizeStock.claimed >= grandPrizeStock.quantity ? 'rgba(248,113,113,0.08)' : 'rgba(34,197,94,0.06)',
                border: grandPrizeStock.claimed >= grandPrizeStock.quantity ? '1px solid rgba(248,113,113,0.2)' : '1px solid rgba(34,197,94,0.2)',
                borderRadius: '0.65rem', fontSize: '0.82rem', 
                color: grandPrizeStock.claimed >= grandPrizeStock.quantity ? '#fca5a5' : '#4ade80',
                fontWeight: 600
              }}>
                📦 Grand Prize Stock: {grandPrizeStock.quantity - grandPrizeStock.claimed} remaining (out of {grandPrizeStock.quantity})
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                color: 'rgba(248,250,252,0.45)', marginBottom: '0.5rem', letterSpacing: '0.05em',
              }}>GRAND PRIZE NAME</label>
              <input
                value={grandPrizeName}
                onChange={e => setGrandPrizeName(e.target.value)}
                placeholder="e.g. MacBook Pro, Weekend Getaway…"
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '0.75rem', color: '#f8fafc',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <button onClick={startSession} disabled={starting} style={{
              padding: '0.875rem 2rem',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              border: 'none', borderRadius: '0.875rem',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}>{starting ? 'Starting…' : '🎬 Start Session'}</button>
          </div>
        )}

        {/* Active session — participant picker */}
        {session?.is_active && !winner && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '0.875rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
                  animation: 'livePulse 2s infinite',
                }} />
                <span style={{ fontWeight: 600, color: '#4ade80', fontSize: '0.875rem' }}>Session Live</span>
                <span style={{ color: 'rgba(248,250,252,0.35)', fontSize: '0.78rem' }}>
                  · {grandPrizeName.trim() || 'Grand Prize'} · 🔒 Event locked
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(248,250,252,0.5)' }}>
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={card}>
              {/* Manual participant entry */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.72rem', fontWeight: 600,
                  color: 'rgba(248,250,252,0.4)', marginBottom: '0.5rem', letterSpacing: '0.05em',
                }}>ADD PARTICIPANT MANUALLY</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addManualParticipant() }}
                    placeholder="Type name and press Enter…"
                    style={{
                      flex: 1, padding: '0.65rem 1rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '0.65rem', color: '#f8fafc',
                      fontSize: '0.875rem', outline: 'none',
                    }}
                  />
                  <button
                    onClick={addManualParticipant}
                    disabled={addingManual || !manualName.trim()}
                    style={{
                      padding: '0.65rem 1.1rem',
                      background: manualName.trim()
                        ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                        : 'rgba(124,58,237,0.2)',
                      border: 'none', borderRadius: '0.65rem',
                      color: '#fff', fontWeight: 700,
                      cursor: manualName.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem', whiteSpace: 'nowrap',
                    }}
                  >
                    {addingManual ? '…' : '+ Add'}
                  </button>
                </div>
              </div>

              <div style={{
                height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 0 1rem',
              }} />

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' as const,
              }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'rgba(248,250,252,0.6)' }}>
                  Click a participant to crown them Grand Prize winner
                </h3>
                {participants.length > 5 && (
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, role, company…"
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.625rem', color: '#f8fafc',
                      fontSize: '0.82rem', outline: 'none', width: 220,
                    }}
                  />
                )}
              </div>

              {participants.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 2rem',
                  color: 'rgba(248,250,252,0.25)', fontSize: '0.875rem',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                  Waiting for participants to register…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '2rem',
                  color: 'rgba(248,250,252,0.25)', fontSize: '0.875rem',
                }}>
                  No participants match &ldquo;{search}&rdquo;
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filtered.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => !picking && setConfirm(p)}
                      disabled={picking}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1.125rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '0.75rem',
                        cursor: picking ? 'not-allowed' : 'pointer',
                        textAlign: 'left', color: '#f8fafc', transition: 'all 0.15s',
                        width: '100%', opacity: picking ? 0.5 : 1,
                      }}
                      onMouseEnter={e => {
                        if (!picking) {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.background = 'rgba(124,58,237,0.1)'
                          el.style.borderColor = 'rgba(124,58,237,0.3)'
                        }
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = 'rgba(255,255,255,0.03)'
                        el.style.borderColor = 'rgba(255,255,255,0.07)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: `hsl(${(i * 47) % 360},55%,38%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, color: '#fff',
                        }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>
                            {p.designation}{p.company ? ` · ${p.company}` : ''}
                          </div>
                          {p.email && (
                            <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.6)', marginTop: '0.1rem' }}>
                              {p.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.72rem', color: 'rgba(248,250,252,0.25)',
                        fontWeight: 600, flexShrink: 0,
                      }}>Pick →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Session ended, no winner */}
        {session && !session.is_active && !winner && !session.winner_registration_id && (
          <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'rgba(248,250,252,0.4)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
              Session ended without a winner. Event has been re-opened.
            </p>
            <button onClick={startSession} disabled={starting} style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              border: 'none', borderRadius: '0.75rem',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}>{starting ? 'Starting…' : 'Start New Session'}</button>
          </div>
        )}

        {/* Start new session after winner */}
        {winner && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={startSession} disabled={starting} style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '0.75rem', color: '#a78bfa',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
            }}>{starting ? 'Starting…' : '+ Start New Session'}</button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          50%       { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
        }
      `}</style>
    </div>
  )
}
