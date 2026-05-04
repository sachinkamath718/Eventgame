'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { DEFAULT_DESIGNATION_GROUPS } from '@/lib/prize-logic'

const GAMES = [
  { id: 'spin_wheel',   label: '🎡 Spin Wheel',  desc: 'Classic spinning wheel' },
  { id: 'number_match', label: '🃏 Number Match', desc: 'Match 3 symbols' },
  { id: 'anime_match',  label: '🐉 Anime Match',  desc: 'Memory card pairs' },
]
const DEFAULT_PRIZES = [
  { rank: 1, name: 'Grand Prize',           description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 2, name: 'Premium Gift Hamper',   description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 3, name: 'Branded Merchandise',   description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 4, name: 'Digital Voucher',       description: '', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 5, name: 'Better Luck Next Time', description: '', image_url: '', is_consolation: true,  is_grand_prize: false },
]
const DEFAULT_FIELDS = [
  { formLabel: 'Full Name',    fieldKey: 'name',         required: true,  fieldType: 'text',  options: '' },
  { formLabel: 'Work Email',   fieldKey: 'email',        required: true,  fieldType: 'email', options: '' },
  { formLabel: 'Phone Number', fieldKey: 'phone_number', required: true,  fieldType: 'tel',   options: '' },
  { formLabel: 'Company',      fieldKey: 'company',      required: false, fieldType: 'text',  options: '' },
  { formLabel: 'Designation',  fieldKey: 'designation',  required: true,  fieldType: 'text',  options: '' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const F: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.65rem',
  border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
  color: '#f8fafc', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}
const L: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  color: 'rgba(248,250,252,0.5)', marginBottom: '0.3rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '1rem', padding: '1.5rem',
}
const btnPrimary: React.CSSProperties = {
  padding: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
  border: 'none', borderRadius: '0.75rem', color: '#fff',
  fontWeight: 700, fontSize: '1rem', cursor: 'pointer', width: '100%',
}

type Field = { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options: string }

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Step 1
  const [name, setName]       = useState('')
  const [eventSlug, setSlug]  = useState('')

  // Step 2 — form fields
  const [fields, setFields]   = useState<Field[]>(DEFAULT_FIELDS)

  // Step 3 — game & appearance
  const [gameType, setGame]   = useState('spin_wheel')
  const [prizes, setPrizes]   = useState(DEFAULT_PRIZES)
  const [rules, setRules]     = useState(DEFAULT_DESIGNATION_GROUPS.map(g => ({
    label: g.label, designations: g.designations.join(', '),
    prize_rank: g.prize_rank, win_probability: g.win_probability,
  })))
  const [bgColor, setBg]      = useState('#0a0a1a')
  const [bgColor2, setBg2]    = useState('#312e81')
  const [accent, setAccent]   = useState('#f59e0b')
  const [heading, setHeading] = useState('')
  const [logoUrl, setLogo]    = useState('')
  const [footerText, setFooter] = useState('')

  // Saved event
  const [saved, setSaved]     = useState<{ id: string; slug: string } | null>(null)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const eventUrl = saved ? `${appUrl}/${saved.slug}` : ''

  // ── Step 1: Create event skeleton ─────────────────────────────────────────
  async function goStep2() {
    if (!name.trim()) { setError('Event name is required'); return }
    setSaving(true); setError('')
    try {
      const finalSlug = eventSlug || slugify(name)
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug: finalSlug,
          game_type: 'spin_wheel',
          form_fields: DEFAULT_FIELDS,
          ui_config: {},
          prizes: DEFAULT_PRIZES,
          designation_rules: DEFAULT_DESIGNATION_GROUPS.map(g => ({
            label: g.label, designations: g.designations,
            prize_rank: g.prize_rank, win_probability: g.win_probability,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(data.event)
      setSlug(finalSlug)
      setStep(2)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error creating event') }
    finally { setSaving(false) }
  }

  // ── Step 2: Save form fields ───────────────────────────────────────────────
  async function goStep3() {
    if (!saved) return
    setSaving(true); setError('')
    try {
      await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: saved.id, form_fields: fields }),
      })
      setStep(3)
    } catch { setError('Failed to save form fields') }
    finally { setSaving(false) }
  }

  // ── Step 3: Save game config ───────────────────────────────────────────────
  async function finish() {
    if (!saved) return
    setSaving(true); setError('')
    try {
      await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: saved.id,
          game_type: gameType,
          ui_config: { bgColor, bgColor2, accentColor: accent, heading, logoUrl, footerText,
            bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)` },
          prizes,
          designation_rules: rules.map(r => ({
            label: r.label,
            designations: r.designations.split(',').map(d => d.trim()).filter(Boolean),
            prize_rank: r.prize_rank,
            win_probability: r.win_probability,
          })),
        }),
      })
      setStep(4)
    } catch { setError('Failed to save') }
    finally { setSaving(false) }
  }

  const addField = () => setFields(fs => [...fs, { formLabel: '', fieldKey: 'custom', required: false, fieldType: 'text', options: '' }])
  const removeField = (i: number) => setFields(fs => fs.filter((_, j) => j !== i))
  const updateField = (i: number, patch: Partial<Field>) => setFields(fs => fs.map((f, j) => j === i ? { ...f, ...patch } : f))

  const stepLabels = ['Event Name', 'Form Fields', 'Game & QR']

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Create New Event</h1>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < stepLabels.length - 1 ? 1 : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, background: step > i + 1 ? '#7c3aed' : step === i + 1 ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.07)', border: step === i + 1 ? '2px solid #7c3aed' : '2px solid transparent' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.8rem', color: step === i + 1 ? '#f8fafc' : 'rgba(248,250,252,0.35)', whiteSpace: 'nowrap' }}>{label}</span>
              {i < stepLabels.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>⚠️ {error}</div>}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={card}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 800 }}>What&apos;s your event called?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={L}>Event Name *</label>
                <input id="event-name" style={F} value={name} placeholder="e.g. TechSummit 2025 Lucky Draw"
                  onChange={e => { setName(e.target.value); if (!eventSlug) setSlug(slugify(e.target.value)) }} />
              </div>
              <div>
                <label style={L}>URL Slug</label>
                <input id="event-slug" style={F} value={eventSlug} placeholder="techsummit-2025-lucky-draw"
                  onChange={e => setSlug(slugify(e.target.value))} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', display: 'block', marginTop: '0.25rem' }}>
                  QR will link to: <strong>{appUrl}/{eventSlug || slugify(name) || 'your-event'}</strong>
                </span>
              </div>
              <button id="step1-next" onClick={goStep2} disabled={saving} style={btnPrimary}>
                {saving ? 'Creating…' : 'Create & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Form Field Builder ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Registration Form Fields</h2>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'rgba(248,250,252,0.45)' }}>
                    These fields will appear on the registration form participants fill out.
                  </p>
                </div>
                <button id="add-field" onClick={addField} style={{ padding: '0.45rem 0.9rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Add Field
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr auto', gap: '0.5rem', marginBottom: '0.4rem' }}>
                {['Field Label', 'Type', 'Maps To', 'Required', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {fields.map((field, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={field.formLabel} placeholder="Label shown to user"
                    onChange={e => updateField(i, { formLabel: e.target.value })} />
                  <select style={{ ...F, padding: '0.5rem 0.5rem', appearance: 'none' }} value={field.fieldType}
                    onChange={e => updateField(i, { fieldType: e.target.value })}>
                    {['text','email','tel','number','select'].map(t => <option key={t} value={t} style={{ background: '#1e1b4b' }}>{t}</option>)}
                  </select>
                  <select style={{ ...F, padding: '0.5rem 0.4rem', appearance: 'none', fontSize: '0.78rem' }} value={field.fieldKey}
                    onChange={e => updateField(i, { fieldKey: e.target.value })}>
                    {['name','email','phone_number','company','designation','custom'].map(k => <option key={k} value={k} style={{ background: '#1e1b4b' }}>{k}</option>)}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }} />
                  </div>
                  <button onClick={() => removeField(i)} style={{ padding: '0.4rem 0.6rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.45rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                </div>
              ))}

              {/* Options for select fields */}
              {fields.some(f => f.fieldType === 'select') && (
                <div style={{ marginTop: '0.75rem' }}>
                  {fields.map((f, i) => f.fieldType === 'select' && (
                    <div key={i} style={{ marginBottom: '0.5rem' }}>
                      <label style={{ ...L, marginBottom: '0.25rem' }}>{f.formLabel || `Field ${i+1}`} — Options (comma separated)</label>
                      <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={f.options} placeholder="Option A, Option B, Option C"
                        onChange={e => updateField(i, { options: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>Form Preview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.7, pointerEvents: 'none' }}>
                {fields.map((f, i) => (
                  <div key={i}>
                    <label style={{ ...L, textTransform: 'none', letterSpacing: 0, fontSize: '0.8rem' }}>{f.formLabel || '(no label)'}{f.required && ' *'}</label>
                    {f.fieldType === 'select' ? (
                      <select style={{ ...F, appearance: 'none' }} disabled><option>Select…</option></select>
                    ) : (
                      <input style={F} type={f.fieldType} placeholder={`Enter ${(f.formLabel || '').toLowerCase()}`} disabled />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button id="step2-next" onClick={goStep3} disabled={saving} style={btnPrimary}>
              {saving ? 'Saving…' : 'Save Fields & Continue →'}
            </button>
          </div>
        )}

        {/* ── STEP 3: Game & Appearance ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Game type */}
            <div style={card}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Choose Game Type</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                {GAMES.map(g => (
                  <button key={g.id} onClick={() => setGame(g.id)} style={{ padding: '1.25rem 0.75rem', borderRadius: '1rem', border: `2px solid ${gameType === g.id ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`, background: gameType === g.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)', color: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem' }}>{g.label.split(' ')[0]}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.4rem' }}>{g.label.slice(g.label.indexOf(' ') + 1)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.2rem' }}>{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Appearance */}
            <div style={card}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Appearance</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={L}>Background Start</label><input type="color" value={bgColor} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={L}>Background End</label><input type="color" value={bgColor2} onChange={e => setBg2(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={L}>Accent Color</label><input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={L}>Logo URL</label><input style={F} value={logoUrl} placeholder="https://…/logo.png" onChange={e => setLogo(e.target.value)} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={L}>Page Heading</label><input style={F} value={heading} placeholder={`🎉 ${name} Lucky Draw`} onChange={e => setHeading(e.target.value)} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={L}>Footer Text</label><input style={F} value={footerText} placeholder="© 2025 Your Company" onChange={e => setFooter(e.target.value)} /></div>
              </div>
              {/* Live mini preview */}
              <div style={{ marginTop: '1rem', borderRadius: '0.75rem', overflow: 'hidden', background: `linear-gradient(135deg,${bgColor},${bgColor2})`, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: accent }}>{heading || `🎉 ${name}`}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>Fill in your details to spin & win!</div>
              </div>
            </div>

            {/* Prizes */}
            <div style={card}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Prizes</h2>
              {prizes.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.is_consolation ? 'Consolation' : `Rank ${p.rank}`}</span>
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.name} placeholder="Prize name" onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.image_url} placeholder="Image URL (optional)" onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} />
                </div>
              ))}
            </div>

            <button id="step3-finish" onClick={finish} disabled={saving} style={btnPrimary}>
              {saving ? 'Saving…' : '✨ Finish & Generate QR →'}
            </button>
          </div>
        )}

        {/* ── STEP 4: Done + QR ── */}
        {step === 4 && saved && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem' }}>🎉</div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>Event &ldquo;{name}&rdquo; is live!</h2>
            <div style={{ ...card, width: '100%' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Your QR Code</h3>
              <div style={{ display: 'inline-flex', background: '#fff', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
                <QRCodeSVG id="event-qr" value={eventUrl || `https://eventgame.vercel.app/${saved.slug}`} size={200} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(248,250,252,0.45)', margin: '0 0 1rem' }}>
                Participants scan this → fill the form → play the game!
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={eventUrl || `/${saved.slug}`} target="_blank" rel="noreferrer"
                  style={{ padding: '0.6rem 1.25rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.65rem', color: '#a78bfa', textDecoration: 'none', fontSize: '0.875rem' }}>
                  🔗 Open Event Page
                </a>
                <button onClick={() => {
                  const svg = document.getElementById('event-qr') as SVGElement | null
                  if (!svg) return
                  const size = 400
                  const canvas = document.createElement('canvas')
                  canvas.width = size; canvas.height = size
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const svgData = new XMLSerializer().serializeToString(svg)
                  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const img = new Image()
                  img.onload = () => {
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(0, 0, size, size)
                    ctx.drawImage(img, 0, 0, size, size)
                    URL.revokeObjectURL(url)
                    canvas.toBlob(b => {
                      if (!b) return
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(b)
                      a.download = `${saved.slug}-qr.png`
                      a.click()
                    }, 'image/png')
                  }
                  img.src = url
                }} style={{ padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', borderRadius: '0.65rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }}>
                  ⬇ Download PNG
                </button>
              </div>
            </div>
            <button onClick={() => router.push('/admin')} style={{ ...btnPrimary, maxWidth: 240 }}>Back to Admin →</button>
          </div>
        )}
      </div>
    </div>
  )
}
