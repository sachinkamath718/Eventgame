'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

type Event = {
  id: string; name: string; slug: string; google_form_url?: string
  ui_config: { bgColor?: string; bgColor2?: string; accentColor?: string; heading?: string; logoUrl?: string }
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/events?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        const ev = Array.isArray(d.events) ? d.events.find((e: Event) => e.slug === slug) : null
        if (ev) setEvent(ev); else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>Loading…</div>
  if (notFound || !event) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif', flexDirection: 'column', gap: '1rem' }}><div style={{ fontSize: '3rem' }}>😕</div><h1>Event not found</h1></div>

  const ui = event.ui_config || {}
  const bg = `linear-gradient(135deg, ${ui.bgColor || '#0a0a1a'} 0%, ${ui.bgColor2 || '#312e81'} 100%)`
  const accent = ui.accentColor || '#f59e0b'

  if (!event.google_form_url) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
          <h2>This event is being set up. Check back soon!</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Inter,sans-serif', color: '#f8fafc' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 1.5rem' }}>
        {ui.logoUrl && <img src={ui.logoUrl} alt="logo" style={{ height: 52, objectFit: 'contain', marginBottom: '1rem' }} />}
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)', fontWeight: 900, margin: '0 0 0.5rem', color: accent }}>
          {ui.heading || `🎉 ${event.name} Lucky Draw`}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', margin: 0 }}>
          Fill in the form below to enter the lucky draw and play!
        </p>
      </div>

      {/* Form embed */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1rem 2rem' }}>
        <div style={{ borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          <iframe
            src={event.google_form_url}
            style={{ width: '100%', height: 680, border: 'none', display: 'block' }}
            title="Registration Form"
          />
        </div>

        {/* Submitted button */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {!submitted ? (
            <button
              id="submitted-btn"
              onClick={() => setSubmitted(true)}
              style={{
                padding: '1rem 2.5rem', background: `linear-gradient(135deg,${accent},#ef4444)`,
                border: 'none', borderRadius: '1rem', color: '#fff', fontWeight: 800,
                fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 0 30px ${accent}55`,
              }}
            >
              ✅ I&apos;ve submitted the form — Play Now!
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                Enter the email you used in the form to continue:
              </p>
              <EmailVerify slug={slug} accent={accent} onFound={(id) => router.push(`/${slug}/game?registrationId=${id}`)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailVerify({ slug, accent, onFound }: { slug: string; accent: string; onFound: (id: string) => void }) {
  const [email, setEmail]     = useState('')
  const [checking, setChecking] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [msg, setMsg]         = useState('')

  async function verify() {
    if (!email.trim()) { setMsg('Please enter your email'); return }
    setChecking(true); setMsg('Fetching your entry…'); setAttempts(0)

    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      await new Promise(r => setTimeout(r, 2000))
      setAttempts(i + 1)
      try {
        const res  = await fetch(`/api/check-registration?email=${encodeURIComponent(email)}&slug=${slug}`)
        const data = await res.json()
        if (data.found) { found = true; onFound(data.registration.id) }
      } catch { /* retry */ }
    }
    if (!found) { setMsg('Entry not found. Make sure you submitted the form with this email.'); setChecking(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 380 }}>
      <input
        id="verify-email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        disabled={checking}
        style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#f8fafc', fontSize: '1rem', outline: 'none' }}
        onKeyDown={e => e.key === 'Enter' && !checking && verify()}
      />
      {checking ? (
        <div style={{ textAlign: 'center', color: 'rgba(248,250,252,0.6)', fontSize: '0.9rem' }}>
          <div style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⏳</div>
          Checking{attempts > 0 ? ` (attempt ${attempts}/30)` : ''}…
        </div>
      ) : (
        <button id="verify-btn" onClick={verify} style={{ padding: '0.85rem', background: `linear-gradient(135deg,${accent},#ef4444)`, border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          Find My Entry →
        </button>
      )}
      {msg && !checking && <p style={{ fontSize: '0.85rem', color: '#fca5a5', textAlign: 'center', margin: 0 }}>{msg}</p>}
    </div>
  )
}
