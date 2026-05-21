'use client'
// Error boundary for the public event page.
// Without this, any runtime crash in EventClient shows a blank page in production.
import { useEffect } from 'react'

export default function EventError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[EventPage Error]', error) }, [error])
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg,#0a0a1a 0%,#1e1b4b 100%)',
      color: '#f8fafc', fontFamily: 'Inter, sans-serif', textAlign: 'center', gap: '1rem', padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>Something went wrong</h2>
      <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.875rem', margin: 0 }}>
        The event page ran into an error. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: '0.5rem', padding: '0.75rem 2rem',
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          border: 'none', borderRadius: '0.75rem', color: '#fff',
          fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  )
}
