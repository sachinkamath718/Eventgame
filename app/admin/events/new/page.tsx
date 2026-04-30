'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { DEFAULT_DESIGNATION_GROUPS } from '@/lib/prize-logic'

const GAMES = [
  { id: 'spin_wheel',   label: '🎡 Spin Wheel',   desc: 'Classic spinning wheel' },
  { id: 'number_match', label: '🃏 Number Match',  desc: 'Match 3 symbols' },
  { id: 'anime_match',  label: '🐉 Anime Match',   desc: 'Memory card pairs' },
]
const DEFAULT_PRIZES = [
  { rank: 1, name: 'Grand Prize',          description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 2, name: 'Premium Gift Hamper',  description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 3, name: 'Branded Merchandise',  description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 4, name: 'Digital Voucher',      description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 5, name: 'Better Luck Next Time',description: '', image_url: '', is_consolation: true,  is_grand_prize: false },
]
const DEFAULT_MAPPINGS = [
  { formLabel: 'Full Name',    fieldKey: 'name',         required: true },
  { formLabel: 'Work Email',   fieldKey: 'email',        required: true },
  { formLabel: 'Phone Number', fieldKey: 'phone_number', required: true },
  { formLabel: 'Company',      fieldKey: 'company',      required: false },
  { formLabel: 'Designation',  fieldKey: 'designation',  required: true },
]

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const F: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: '0.75rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none',
}
const L: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'rgba(248,250,252,0.55)', marginBottom: '0.35rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError]  = useState('')

  // Step 1
  const [name, setName]       = useState('')
  const [eventSlug, setSlug]  = useState('')

  // Step 2
  const [formUrl, setFormUrl]   = useState('')
  const [mappings, setMappings] = useState(DEFAULT_MAPPINGS)

  // Step 3
  const [gameType, setGameType] = useState('spin_wheel')
  const [prizes, setPrizes]     = useState(DEFAULT_PRIZES)
  const [rules, setRules]       = useState(DEFAULT_DESIGNATION_GROUPS.map(g => ({
    label: g.label, designations: g.designations.join(', '),
    prize_rank: g.prize_rank, win_probability: g.win_probability,
  })))
  const [bgColor, setBg]        = useState('#0a0a1a')
  const [bgColor2, setBg2]      = useState('#312e81')
  const [accentColor, setAccent]= useState('#f59e0b')
  const [heading, setHeading]   = useState('')
  const [logoUrl, setLogo]      = useState('')

  // Final saved event
  const [savedEvent, setSaved]  = useState<{ id: string; slug: string; webhook_secret: string } | null>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'

  // ── STEP 1 SAVE ──────────────────────────────────────────────────────────────
  async function saveStep1() {
    if (!name.trim()) { setError('Event name is required'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug: eventSlug || slug(name),
          game_type: 'spin_wheel', form_fields: DEFAULT_MAPPINGS,
          ui_config: {}, prizes: DEFAULT_PRIZES,
          designation_rules: DEFAULT_DESIGNATION_GROUPS.map(g => ({
            label: g.label, designations: g.designations,
            prize_rank: g.prize_rank, win_probability: g.win_probability,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(data.event)
      setStep(2)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  // ── STEP 2 SAVE ──────────────────────────────────────────────────────────────
  async function saveStep2() {
    if (!savedEvent) return
    setSaving(true); setError('')
    try {
      await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedEvent.id, google_form_url: formUrl, form_fields: mappings }),
      })
      setStep(3)
    } catch { setError('Failed to save form settings') }
    finally { setSaving(false) }
  }

  // ── STEP 3 SAVE ──────────────────────────────────────────────────────────────
  async function saveStep3() {
    if (!savedEvent) return
    setSaving(true); setError('')
    try {
      await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: savedEvent.id,
          game_type: gameType,
          ui_config: { bgColor, bgColor2: bgColor, accentColor, heading, logoUrl,
            bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)` },
          prizes,
          designation_rules: rules.map(r => ({
            label: r.label,
            designations: r.designations.split(',').map(d => d.trim()).filter(Boolean),
            prize_rank: r.prize_rank, win_probability: r.win_probability,
          })),
        }),
      })
      setStep(4)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }

  const webhookUrl = savedEvent ? `${appUrl}/api/webhook/${savedEvent.slug}` : ''
  const eventUrl   = savedEvent ? `${appUrl}/${savedEvent.slug}` : ''
  const appsScript = savedEvent ? `function onFormSubmit(e) {
  var responses = {};
  var items = e.response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    responses[items[i].getItem().getTitle()] = items[i].getResponse();
  }
  UrlFetchApp.fetch("${webhookUrl}", {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": "${savedEvent.webhook_secret}" },
    payload: JSON.stringify({ responses: responses }),
    muteHttpExceptions: true
  });
}` : ''

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '1rem', padding: '1.5rem',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
        <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Create New Event</h1>
      </header>

      {/* Step indicators */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
          {['Event Name', 'Google Form', 'Game & QR'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < 2 ? '1' : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                background: step > i + 1 ? '#7c3aed' : step === i + 1 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)',
                border: step === i + 1 ? '2px solid #7c3aed' : '2px solid transparent',
              }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: '0.8rem', color: step === i + 1 ? '#f8fafc' : 'rgba(248,250,252,0.4)', whiteSpace: 'nowrap' }}>{label}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>⚠️ {error}</div>}

        {/* ── STEP 1: Event Name ── */}
        {step === 1 && (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>What&apos;s your event called?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={L}>Event Name *</label>
                <input id="event-name" style={F} value={name} placeholder="e.g. TechSummit 2025 Lucky Draw"
                  onChange={e => { setName(e.target.value); if (!eventSlug) setSlug(slug(e.target.value)) }} />
              </div>
              <div>
                <label style={L}>URL Slug (auto-generated)</label>
                <input id="event-slug" style={{ ...F, color: 'rgba(248,250,252,0.5)' }} value={eventSlug} placeholder="techsummit-2025-lucky-draw"
                  onChange={e => setSlug(slug(e.target.value))} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>
                  QR will link to: <strong>{appUrl}/{eventSlug || slug(name) || 'your-event'}</strong>
                </span>
              </div>
              <button id="step1-next" onClick={saveStep1} disabled={saving} style={{ padding: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                {saving ? 'Creating…' : 'Create Event & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Google Form ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Link your Google Form</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={L}>Google Form Embed URL</label>
                <input id="google-form-url" style={F} value={formUrl} placeholder="https://docs.google.com/forms/d/.../viewform?embedded=true"
                  onChange={e => setFormUrl(e.target.value)} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>
                  In Google Forms → Send → Embed (&lt;&gt;) → copy the src URL from the iframe code
                </span>
              </div>
              {formUrl && (
                <iframe src={formUrl} style={{ width: '100%', height: 300, border: 'none', borderRadius: '0.75rem' }} />
              )}
            </div>

            {/* Field Mapping */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Field Mapping</h2>
                <button onClick={() => setMappings(m => [...m, { formLabel: '', fieldKey: 'custom', required: false }])}
                  style={{ padding: '0.4rem 0.85rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer' }}>
                  + Add Field
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.45)', marginTop: 0, marginBottom: '1rem' }}>
                Match your Google Form question titles to our field names. This controls what gets stored in the database.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['Google Form Question', 'Maps To Field', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.7rem', color: 'rgba(248,250,252,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {mappings.map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={m.formLabel} placeholder="Question title in form"
                    onChange={e => setMappings(ms => ms.map((x, j) => j === i ? { ...x, formLabel: e.target.value } : x))} />
                  <select style={{ ...F, padding: '0.5rem 0.75rem', appearance: 'none' }}
                    value={m.fieldKey} onChange={e => setMappings(ms => ms.map((x, j) => j === i ? { ...x, fieldKey: e.target.value } : x))}>
                    {['name','email','phone_number','company','designation','custom'].map(k => (
                      <option key={k} value={k} style={{ background: '#1e1b4b' }}>{k}</option>
                    ))}
                  </select>
                  <button onClick={() => setMappings(ms => ms.filter((_, j) => j !== i))}
                    style={{ padding: '0.5rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.5rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                </div>
              ))}
            </div>

            {/* Apps Script */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>📋 Google Apps Script Setup</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.5)', marginTop: 0 }}>
                Open your Google Form → Extensions → Apps Script → paste this code → Save → Add Trigger (onFormSubmit)
              </p>
              <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '0.75rem', padding: '1rem', fontSize: '0.78rem', overflowX: 'auto', color: '#a5f3fc', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {appsScript}
              </pre>
              <button onClick={() => navigator.clipboard.writeText(appsScript)}
                style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer' }}>
                Copy Script
              </button>
            </div>

            <button id="step2-next" onClick={saveStep2} disabled={saving} style={{ padding: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save & Continue →'}
            </button>
          </div>
        )}

        {/* ── STEP 3: Game & QR ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Choose Game</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                {GAMES.map(g => (
                  <button key={g.id} onClick={() => setGameType(g.id)} style={{
                    padding: '1.25rem 0.75rem', borderRadius: '1rem',
                    border: `2px solid ${gameType === g.id ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                    background: gameType === g.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                    color: '#f8fafc', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.75rem' }}>{g.label.split(' ')[0]}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.4rem' }}>{g.label.slice(g.label.indexOf(' ') + 1)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.2rem' }}>{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Appearance</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={L}>Background Color</label><input type="color" value={bgColor} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={L}>Accent Color</label><input type="color" value={accentColor} onChange={e => setAccent(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={L}>Heading</label><input style={F} value={heading} placeholder={`🎉 ${name} Lucky Draw`} onChange={e => setHeading(e.target.value)} /></div>
                <div><label style={L}>Logo URL</label><input style={F} value={logoUrl} placeholder="https://…/logo.png" onChange={e => setLogo(e.target.value)} /></div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Prizes</h2>
              {prizes.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem' }}>
                  <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', fontWeight: 700 }}>{p.is_consolation ? 'Consolation' : `Rank ${p.rank}`}</div>
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.name} onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Prize name" />
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.image_url} onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} placeholder="Image URL (optional)" />
                </div>
              ))}
            </div>

            <button id="step3-finish" onClick={saveStep3} disabled={saving} style={{ padding: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Finish & Generate QR →'}
            </button>
          </div>
        )}

        {/* ── STEP 4: QR Code ── */}
        {step === 4 && savedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Event &ldquo;{name}&rdquo; is live!</h2>
            <div style={{ ...cardStyle, width: '100%' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Your QR Code</h3>
              <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
                <QRCodeSVG id="event-qr" value={eventUrl} size={220} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)', margin: '0 0 0.75rem' }}>
                Participants scan this → fill Google Form → play game
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={eventUrl} target="_blank" rel="noreferrer"
                  style={{ padding: '0.6rem 1.25rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.65rem', color: '#a78bfa', textDecoration: 'none', fontSize: '0.875rem' }}>
                  🔗 Open Event Page
                </a>
                <button onClick={() => {
                  const svg = document.getElementById('event-qr')
                  if (!svg) return
                  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                  const url  = URL.createObjectURL(blob)
                  const a    = document.createElement('a'); a.href = url; a.download = `${savedEvent.slug}-qr.svg`; a.click()
                }} style={{ padding: '0.6rem 1.25rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.65rem', color: '#6ee7b7', fontSize: '0.875rem', cursor: 'pointer' }}>
                  ⬇ Download QR
                </button>
              </div>
            </div>
            <div style={{ ...cardStyle, width: '100%', textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>Webhook URL (for Apps Script)</h3>
              <code style={{ fontSize: '0.78rem', color: '#a5f3fc', wordBreak: 'break-all' }}>{webhookUrl}</code>
            </div>
            <button onClick={() => router.push('/admin')}
              style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Back to Admin →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
