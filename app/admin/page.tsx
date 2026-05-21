'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'

interface Event {
  id: string; name: string; slug: string
  is_active: boolean; created_at: string; game_type: string
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [qrEvent, setQrEvent] = useState<Event | null>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const fetchEvents = async () => {
    const res = await fetch('/api/admin/events')
    const data = await res.json()
    setEvents(data.events || [])
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [])

  const toggleActive = async (event: Event) => {
    await fetch('/api/admin/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, is_active: !event.is_active }),
    })
    fetchEvents()
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event and all its data? This cannot be undone.')) return
    await fetch(`/api/admin/events?id=${id}`, { method: 'DELETE' })
    fetchEvents()
  }

  const GAME_LABELS: Record<string, string> = {
    spin_wheel: '🎡 Spin Wheel',
    number_match: '🃏 Number Match',
    anime_match: '🐉 Anime Match',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc' }}>
      {/* Header */}
      <header className="evt-header" style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 50,
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
          }}>🎰</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              Lucky Draw Admin
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', margin: 0 }}>
              Control Panel
            </p>
          </div>
        </div>
        <Link
          href="/admin/events/new"
          style={{
            padding: '0.6rem 1.25rem',
            background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
            color: '#fff',
            borderRadius: '0.75rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'transform 0.15s, box-shadow 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => (e.currentTarget.style.transform = '')}
        >
          <span style={{ fontSize: '1rem' }}>＋</span> New Event
        </Link>
      </header>

      <main style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>
        {/* Summary stats */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
          padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem',
          marginBottom: '1.5rem', backdropFilter: 'blur(10px)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.45)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Events</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#f8fafc' }}>
              {events.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Active</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>
                {events.filter(e => e.is_active).length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Draft</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(248,250,252,0.6)' }}>
                {events.filter(e => !e.is_active).length}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Events</h2>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[1,2,3].map(i => (
              <div key={i} className="glass-card shimmer" style={{ height: 80, borderRadius: '1.25rem' }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎪</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '0.5rem' }}>
              No events yet
            </h3>
            <p style={{ color: 'rgba(248,250,252,0.45)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Create your first event to get started
            </p>
            <Link
              href="/admin/events/new"
              style={{
                padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                color: '#fff', borderRadius: '0.75rem', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem',
              }}
            >
              Create Event →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {events.map(event => (
              <div
                key={event.id}
                className="glass-card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  flexWrap: 'wrap',
                  transition: 'border-color 0.2s',
                  borderColor: event.is_active ? 'rgba(124,62,237,0.3)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {/* Left: status dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: event.is_active ? '#4ade80' : '#475569',
                  boxShadow: event.is_active ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700, fontSize: '1rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {event.name}
                    </span>
                    <span className={`badge ${event.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {event.is_active ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(248,250,252,0.4)' }}>
                      /{event.slug}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(248,250,252,0.35)' }}>
                      {GAME_LABELS[event.game_type] || '🎮 Game'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                  <ActionBtn title="Show QR" onClick={() => setQrEvent(event)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M9 14v7M14 9h7M9 9h7v7H9z"/></svg>
                  </ActionBtn>
                  
                  <Link href={`/admin/events/${event.id}/session`} style={actionBtnStyle} title="Grand Prize Session">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  </Link>
                  
                  <Link href={`/admin/events/${event.id}`} style={actionBtnStyle} title="Edit Event">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                  </Link>
                  
                  <ActionBtn
                    title={event.is_active ? 'Deactivate' : 'Activate'}
                    onClick={() => toggleActive(event)}
                    style={{ color: event.is_active ? '#4ade80' : 'rgba(248,250,252,0.35)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                  </ActionBtn>
                  
                  <ActionBtn
                    title="Delete"
                    onClick={() => deleteEvent(event.id)}
                    style={{ color: 'rgba(248,113,113,0.5)' }}
                    hoverColor="rgba(248,113,113,0.15)"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </ActionBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* QR Modal */}
      {qrEvent && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1rem', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setQrEvent(null)}
        >
          <div
            className="glass-dark animate-scale-in"
            style={{ padding: '2rem', maxWidth: 340, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {qrEvent.name}
            </h3>
            <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              {appUrl}/{qrEvent.slug}
            </p>
            <div style={{
              background: '#fff', padding: '1.25rem', borderRadius: '1rem',
              display: 'inline-block', marginBottom: '1.5rem',
              boxShadow: '0 0 40px rgba(124,62,237,0.3)',
            }}>
              <QRCode value={`${appUrl}/${qrEvent.slug}`} size={200} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={`${appUrl}/${qrEvent.slug}`}
                target="_blank"
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                  color: '#fff', borderRadius: '0.75rem',
                  fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center',
                }}
              >
                🔗 Open Link
              </a>
              <button
                onClick={() => setQrEvent(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  color: 'rgba(248,250,252,0.45)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  textDecoration: 'none',
  width: 36, height: 36,
}

function ActionBtn({
  children, onClick, title, style, hoverColor,
}: {
  children: React.ReactNode; onClick: () => void; title?: string
  style?: React.CSSProperties; hoverColor?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ ...actionBtnStyle, ...style }}
      onMouseOver={e => {
        e.currentTarget.style.background = hoverColor || 'rgba(255,255,255,0.08)'
      }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
