'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

type FieldMapping = { formLabel: string; fieldKey: string; required: boolean; fieldType?: string; options?: string }
type Event = {
  id: string; name: string; slug: string
  form_fields: FieldMapping[]
  ui_config: { bgColor?: string; bgColor2?: string; accentColor?: string; heading?: string; logoUrl?: string; footerText?: string }
}

const F: React.CSSProperties = {
  width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
  border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
  color: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/events')
      .then(r => r.json())
      .then(d => {
        const ev = (d.events || []).find((e: Event) => e.slug === slug)
        if (ev) { setEvent(ev); const init: Record<string, string> = {}; (ev.form_fields || []).forEach((f: FieldMapping) => { init[f.formLabel] = '' }); setValues(init) }
      })
      .finally(() => setLoading(false))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, form_data: values }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      router.push(`/${slug}/game?registrationId=${data.registrationId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>Loading…</div>
    </div>
  )

  if (!event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>😕</div><h2>Event not found</h2>
    </div>
  )

  const ui = event.ui_config || {}
  const bg = `linear-gradient(135deg,${ui.bgColor || '#0a0a1a'} 0%,${ui.bgColor2 || '#312e81'} 100%)`
  const accent = ui.accentColor || '#f59e0b'
  const fields: FieldMapping[] = event.form_fields || []

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Inter,sans-serif', color: '#f8fafc' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 2rem' }}>
        {ui.logoUrl && <img src={ui.logoUrl} alt="logo" style={{ height: 56, objectFit: 'contain', marginBottom: '1rem' }} />}
        <h1 style={{ fontSize: 'clamp(1.6rem,5vw,2.8rem)', fontWeight: 900, margin: '0 0 0.5rem', color: accent, textShadow: `0 0 40px ${accent}66` }}>
          {ui.heading || `🎉 ${event.name}`}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', margin: 0 }}>
          Fill in your details below to spin & win!
        </p>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 1rem 4rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {fields.map((field, i) => (
              <div key={i}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(248,250,252,0.55)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {field.formLabel}{field.required && <span style={{ color: accent }}> *</span>}
                </label>
                {field.fieldType === 'select' && field.options ? (
                  <select
                    style={{ ...F, appearance: 'none' }}
                    value={values[field.formLabel] || ''}
                    required={field.required}
                    onChange={e => setValues(v => ({ ...v, [field.formLabel]: e.target.value }))}
                  >
                    <option value="" style={{ background: '#1e1b4b' }}>Select…</option>
                    {field.options.split(',').map(o => o.trim()).filter(Boolean).map(opt => (
                      <option key={opt} value={opt} style={{ background: '#1e1b4b' }}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.fieldType || (field.fieldKey === 'email' ? 'email' : field.fieldKey === 'phone_number' ? 'tel' : 'text')}
                    style={F}
                    value={values[field.formLabel] || ''}
                    required={field.required}
                    placeholder={`Enter your ${field.formLabel.toLowerCase()}`}
                    onChange={e => setValues(v => ({ ...v, [field.formLabel]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <button
              id="register-submit"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '0.5rem', padding: '1rem', borderRadius: '0.875rem',
                background: submitting ? 'rgba(124,58,237,0.4)' : `linear-gradient(135deg,${accent},#ef4444)`,
                border: 'none', color: '#fff', fontWeight: 800, fontSize: '1.05rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : `0 0 30px ${accent}44`,
                transition: 'all 0.2s',
              }}
            >
              {submitting ? '⏳ Registering…' : '🎯 Submit & Play Now!'}
            </button>
          </form>
        </div>
        {ui.footerText && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '1.5rem' }}>{ui.footerText}</p>}
      </div>
    </div>
  )
}
