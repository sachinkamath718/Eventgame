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
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 50,
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

      <main style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Events', value: events.length, icon: '🎪' },
            { label: 'Active Events', value: events.filter(e => e.is_active).length, icon: '🟢' },
            { label: 'Inactive', value: events.filter(e => !e.is_active).length, icon: '⚫' },
          ].map(stat => (
            <div key={stat.label} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)' }}>{stat.label}</div>
            </div>
          ))}
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
                  padding: '1.25rem 1.5rem',
                  display: 'flex', alignItems: 'center', gap: '1rem',
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
                  <ActionBtn title="Show QR" onClick={() => setQrEvent(event)}>📱</ActionBtn>
                  <Link
                    href={`/admin/events/${event.id}/session`}
                    style={actionBtnStyle}
                    title="Grand Prize Session"
                  >🏆</Link>
                  <Link
                    href={`/admin/events/${event.id}`}
                    style={actionBtnStyle}
                    title="Edit Event"
                  >✏️</Link>
                  <ActionBtn
                    title={event.is_active ? 'Deactivate' : 'Activate'}
                    onClick={() => toggleActive(event)}
                    style={{ color: event.is_active ? '#4ade80' : 'rgba(248,250,252,0.35)' }}
                  >
                    {event.is_active ? '🟢' : '⚫'}
                  </ActionBtn>
                  <ActionBtn
                    title="Delete"
                    onClick={() => deleteEvent(event.id)}
                    style={{ color: 'rgba(248,113,113,0.5)' }}
                    hoverColor="rgba(248,113,113,0.8)"
                  >🗑️</ActionBtn>
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
