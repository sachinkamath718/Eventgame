'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { DEFAULT_DESIGNATION_GROUPS } from '@/lib/prize-logic'

const GAMES = [
  { id: 'spin_wheel',   label: '🎡 Spin Wheel',  desc: 'Classic spinning wheel' },
  { id: 'number_match', label: '🃏 Number Match', desc: 'Match 3 symbols' },
  { id: 'anime_match',  label: '🐉 Anime Match',  desc: 'Memory card pairs' },
]

type Prize = { rank: number; name: string; description: string; image_url: string; quantity: number; is_consolation: boolean; is_grand_prize: boolean }
type Field = { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options: string; enabled?: boolean }
type Rule  = { id?: string; label: string; designations: string; prize_rank: number; win_probability: number }
type Saved = { id: string; slug: string }

const DEFAULT_PRIZES: Prize[] = [
  { rank: 1, name: 'Grand Prize',           description: '', image_url: '', quantity: 1,  is_consolation: false, is_grand_prize: true  },
  { rank: 2, name: 'Premium Gift Hamper',   description: '', image_url: '', quantity: 3,  is_consolation: false, is_grand_prize: false },
  { rank: 3, name: 'Branded Merchandise',   description: '', image_url: '', quantity: 5,  is_consolation: false, is_grand_prize: false },
  { rank: 4, name: 'Digital Voucher',       description: '', image_url: '', quantity: 10, is_consolation: false, is_grand_prize: false },
  { rank: 5, name: 'Better Luck Next Time', description: '', image_url: '', quantity: 0,  is_consolation: true,  is_grand_prize: false },
]

const DEFAULT_FIELDS: Field[] = [
  { formLabel: 'Full Name',    fieldKey: 'name',         required: true,  fieldType: 'text',   options: '', enabled: true },
  { formLabel: 'Work Email',   fieldKey: 'email',        required: true,  fieldType: 'email',  options: '', enabled: true },
  { formLabel: 'Phone Number', fieldKey: 'phone_number', required: true,  fieldType: 'tel',    options: '', enabled: true },
  { formLabel: 'Company',      fieldKey: 'company',      required: false, fieldType: 'text',   options: '', enabled: true },
  { formLabel: 'Designation',  fieldKey: 'designation',  required: true,  fieldType: 'select', options: '', enabled: true },
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const F: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem',
  border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
  color: '#f8fafc', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}
const L: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'rgba(248,250,252,0.55)', marginBottom: '0.4rem',
}

export default function NewEventPage() {
  const router = useRouter()

  const [phase, setPhase]           = useState<'create' | 'edit'>('create')
  const [tab, setTab]               = useState<number>(0)
  const [creating, setCreating]     = useState<boolean>(false)
  const [saving, setSaving]         = useState<boolean>(false)
  const [autoSaving, setAutoSaving] = useState<boolean>(false)
  const [error, setError]           = useState<string>('')
  const [saved, setSaved]           = useState<Saved | null>(null)
  const [origin, setOrigin]         = useState<string>('')

  const [name, setName]         = useState<string>('')
  const [eventSlug, setSlug]    = useState<string>('')
  const [fields, setFields]     = useState<Field[]>(DEFAULT_FIELDS)
  const [bgColor, setBg]        = useState<string>('#0a0a1a')
  const [bgColor2, setBg2]      = useState<string>('#312e81')
  const [accent, setAccent]     = useState<string>('#f59e0b')
  const [heading, setHeading]   = useState<string>('')
  const [logoUrl, setLogo]      = useState<string>('')
  const [footerText, setFooter] = useState<string>('')
  const [gameType, setGame]     = useState<string>('spin_wheel')
  const [prizes, setPrizes]     = useState<Prize[]>(DEFAULT_PRIZES)
  const [rules, setRules]       = useState<Rule[]>(
    DEFAULT_DESIGNATION_GROUPS.map(g => ({
      label: g.label, designations: g.designations.join(', '),
      prize_rank: g.prize_rank, win_probability: g.win_probability,
    }))
  )
  const [boothNumber, setBooth] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])
  const eventUrl = saved ? `${origin}/${saved.slug}` : ''

  async function createEvent(): Promise<void> {
    if (!name.trim()) { setError('Event name is required'); return }
    setCreating(true); setError('')
    try {
      const finalSlug = eventSlug || slugify(name)
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug: finalSlug, game_type: 'spin_wheel',
          form_fields: DEFAULT_FIELDS,
          ui_config: { bgColor: '#0a0a1a', bgColor2: '#312e81', accentColor: '#f59e0b' },
          prizes: DEFAULT_PRIZES,
          designation_rules: DEFAULT_DESIGNATION_GROUPS.map(g => ({
            label: g.label, designations: g.designations,
            prize_rank: g.prize_rank, win_probability: g.win_probability,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(data.event as Saved)
      setSlug(finalSlug)
      
      // Preserve IDs from DB to prevent duplication on AutoSave
      if (data.prizes?.length) setPrizes(data.prizes)
      if (data.designation_rules?.length) {
        setRules(data.designation_rules.map((r: any) => ({
          id: r.id, label: r.label, designations: (r.designations || []).join(', '),
          prize_rank: r.prize_rank, win_probability: r.win_probability
        })))
      }

      setPhase('edit')
      setTab(0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating event')
    } finally { setCreating(false) }
  }

  const buildPayload = useCallback(() => ({
    id: saved?.id, name, game_type: gameType, form_fields: fields,
    booth_number: boothNumber,
    ui_config: { bgColor, bgColor2, accentColor: accent, heading, logoUrl, footerText, bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)` },
    prizes,
    designation_rules: rules.map(r => ({
      id: r.id,
      label: r.label,
      designations: r.designations.split(',').map((d: string) => d.trim()).filter(Boolean),
      prize_rank: r.prize_rank, win_probability: r.win_probability,
    })),
  }), [saved, name, gameType, fields, bgColor, bgColor2, accent, heading, logoUrl, footerText, prizes, rules])

  const autoSave = useCallback(async (): Promise<void> => {
    if (!saved) return
    setAutoSaving(true)
    try {
      await fetch('/api/admin/events', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
    } catch { /* silent */ }
    finally { setAutoSaving(false) }
  }, [saved, buildPayload])

  function switchTab(next: number): void { autoSave(); setTab(next) }

  async function saveAndGetQR(): Promise<void> {
    if (!saved) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/events', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setTab(5)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally { setSaving(false) }
  }

  function downloadQR(): void {
    const svg = document.getElementById('new-event-qr') as SVGElement | null
    if (!svg) return
    const size = 400
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => {
        if (!b) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(b)
        a.download = `${eventSlug || slugify(name)}-qr.png`
        a.click()
      }, 'image/png')
    }
    img.src = url
  }

  const tabs = ['📝 Form Fields', '🎨 Design', '🎮 Game', '🏆 Prizes', '🎯 Win Rules', '📊 QR Code']

  if (phase === 'create') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.4)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '2rem' }}>← Back to Admin</a>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Create New Event</h1>
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.9rem', margin: '0 0 2rem' }}>Give your event a name to get started.</p>
          {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>⚠️ {error}</div>}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={L}>Event Name *</label>
              <input style={F} value={name} placeholder="e.g. TechSummit 2025 Lucky Draw" autoFocus
                onChange={e => { setName(e.target.value); if (!eventSlug) setSlug(slugify(e.target.value)) }}
                onKeyDown={e => { if (e.key === 'Enter') createEvent() }} />
            </div>
            <div>
              <label style={L}>URL Slug</label>
              <input style={F} value={eventSlug} placeholder="techsummit-2025" onChange={e => setSlug(slugify(e.target.value))} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)', display: 'block', marginTop: '0.3rem' }}>
                {origin}/{eventSlug || slugify(name) || 'your-event'}
              </span>
            </div>
            <button onClick={createEvent} disabled={creating || !name.trim()} style={{
              padding: '1rem', border: 'none', borderRadius: '0.875rem', color: '#fff',
              fontWeight: 800, fontSize: '1rem', marginTop: '0.25rem',
              background: creating || !name.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              cursor: creating || !name.trim() ? 'not-allowed' : 'pointer',
            }}>
              {creating ? '⏳ Creating…' : '✨ Create Event & Continue →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{name}</h1>
          {autoSaving && <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)' }}>saving…</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href={`/${saved?.slug}`} target="_blank" rel="noreferrer"
            style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
            👁 Preview
          </a>
          <button onClick={saveAndGetQR} disabled={saving} style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
            {saving ? '⏳ Saving…' : '📊 Save & Get QR →'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => switchTab(i)} style={{ padding: '0.5rem 1rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s', background: tab === i ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: tab === i ? '#fff' : 'rgba(248,250,252,0.6)' }}>{t}</button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem' }}>

          {/* TAB 0: Form Fields */}
          {tab === 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>
                  Fields shown in the participant registration form. Disabled fields are hidden from new registrations — past data is always kept.
                </p>
                <button
                  onClick={() => setFields(fs => [...fs, { formLabel: '', fieldKey: `custom_${Date.now()}`, required: false, fieldType: 'text', options: '', enabled: true }])}
                  style={{ padding: '0.4rem 0.85rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >+ Add Field</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto auto', gap: '0.5rem', marginBottom: '0.4rem', paddingLeft: '0.25rem' }}>
                {['Label', 'Type', 'Maps To', 'Required', 'Show', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {fields.map((field, i) => {
                const isEnabled = field.enabled !== false
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', opacity: isEnabled ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                    <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={field.formLabel} placeholder="Label"
                      onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, formLabel: e.target.value } : f))} />
                    <select style={{ ...F, padding: '0.5rem', appearance: 'none' }} value={field.fieldType}
                      onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, fieldType: e.target.value } : f))}>
                      {['text', 'email', 'tel', 'number', 'select'].map(t => (
                        <option key={t} value={t} style={{ background: '#1e1b4b' }}>{t}</option>
                      ))}
                    </select>
                    <select style={{ ...F, padding: '0.5rem', appearance: 'none', fontSize: '0.78rem' }} value={field.fieldKey}
                      onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, fieldKey: e.target.value } : f))}>
                      {['name', 'email', 'phone_number', 'company', 'designation', 'custom'].map(k => (
                        <option key={k} value={k} style={{ background: '#1e1b4b' }}>{k}</option>
                      ))}
                    </select>
                    {/* Required toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <button type="button"
                        onClick={() => setFields(fs => fs.map((f, j) => j === i ? { ...f, required: !f.required } : f))}
                        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: field.required ? '#7c3aed' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 3, left: field.required ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                      </button>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.3)', whiteSpace: 'nowrap' }}>{field.required ? 'Required' : 'Optional'}</span>
                    </div>
                    {/* Show/hide toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <button type="button"
                        onClick={() => setFields(fs => fs.map((f, j) => j === i ? { ...f, enabled: !isEnabled } : f))}
                        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isEnabled ? '#059669' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 3, left: isEnabled ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                      </button>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.3)', whiteSpace: 'nowrap' }}>{isEnabled ? 'Shown' : 'Hidden'}</span>
                    </div>
                    {/* Remove */}
                    <button onClick={() => setFields(fs => fs.filter((_, j) => j !== i))}
                      style={{ padding: '0.4rem 0.6rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.45rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                  </div>
                )
              })}
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)', lineHeight: 1.5 }}>
                <strong style={{ color: 'rgba(248,250,252,0.45)' }}>Show toggle</strong> — hides field from new registrations, all past data kept.{' '}
                <strong style={{ color: 'rgba(248,113,113,0.45)' }}>✕</strong> — removes from config only, past data always safe.
              </p>
            </div>
          )}

          {/* TAB 1: Design */}
          {tab === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={L}>Background Start</label><input type="color" value={bgColor} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Background End</label><input type="color" value={bgColor2} onChange={e => setBg2(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Accent Color</label><input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Logo URL</label><input style={F} value={logoUrl} placeholder="https://…/logo.png" onChange={e => setLogo(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Heading</label><input style={F} value={heading} placeholder={`🎉 ${name}`} onChange={e => setHeading(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Footer Text</label><input style={F} value={footerText} placeholder="© 2025 Your Company" onChange={e => setFooter(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={L}>Booth Number</label>
                <input style={F} value={boothNumber} placeholder="e.g. B12, Hall 3, Gate A" onChange={e => setBooth(e.target.value)} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>Shown on winner’s screen as “Show this at Booth [X]”</span>
              </div>
              <div style={{ gridColumn: '1/-1', borderRadius: '0.75rem', padding: '1.5rem', background: `linear-gradient(135deg,${bgColor},${bgColor2})`, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.2rem', color: accent }}>{heading || `🎉 ${name}`}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>Fill in your details to spin & win!</div>
              </div>
            </div>
          )}

          {/* TAB 2: Game */}
          {tab === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
              {GAMES.map(g => (
                <button key={g.id} onClick={() => setGame(g.id)} style={{ padding: '1.25rem 0.75rem', borderRadius: '1rem', border: `2px solid ${gameType === g.id ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`, background: gameType === g.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)', color: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem' }}>{g.label.split(' ')[0]}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.4rem' }}>{g.label.slice(g.label.indexOf(' ') + 1)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.2rem' }}>{g.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* TAB 3: Prizes */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.5rem', paddingLeft: '0.75rem' }}>
                {['Rank', 'Prize Name', 'Image URL', 'Qty'].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {prizes.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: p.is_grand_prize ? 'rgba(245,158,11,0.06)' : 'rgba(0,0,0,0.2)', border: p.is_grand_prize ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent', borderRadius: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: p.is_grand_prize ? '#fbbf24' : 'rgba(248,250,252,0.4)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {p.is_consolation ? 'Consolation' : p.is_grand_prize ? '🏆 Grand' : `Rank ${p.rank}`}
                  </span>
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.name} placeholder="Prize name"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.image_url} placeholder="Image URL (optional)"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} />
                  {p.is_consolation ? (
                    <span style={{ textAlign: 'center', color: 'rgba(248,250,252,0.25)', fontSize: '1.1rem' }}>∞</span>
                  ) : p.is_grand_prize ? (
                    <span style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(245,158,11,0.5)', fontWeight: 600 }}>Session</span>
                  ) : (
                    <input type="number" min={0} style={{ ...F, padding: '0.5rem', textAlign: 'center' }} value={p.quantity}
                      onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, quantity: Math.max(0, Number(e.target.value)) } : x))} />
                  )}
                </div>
              ))}
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)' }}>
                🏆 Grand prize is awarded manually via the Session page. Consolation = unlimited (∞).
              </p>
            </div>
          )}

          {/* TAB 4: Win Rules */}
          {tab === 4 && (
            <div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>Set win probability per designation group.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto 40px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['Group', 'Designations (comma separated)', 'Prize Rank', 'Win %', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {rules.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto 40px', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'start' }}>
                  <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={r.label} placeholder="Group name"
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }} value={r.designations} placeholder="CEO, CTO, VP…"
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, designations: e.target.value } : x))} />
                  <input type="number" min={1} max={5} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.prize_rank}
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, prize_rank: Number(e.target.value) } : x))} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="number" min={0} max={100} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.win_probability}
                      onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, win_probability: Number(e.target.value) } : x))} />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)' }}>%</span>
                  </div>
                  <button onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}
                    style={{ padding: '0.45rem', height: '36px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.45rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
              <button
                onClick={() => setRules(rs => [...rs, { label: '', designations: '', prize_rank: 2, win_probability: 50 }])}
                style={{ padding: '0.5rem 1rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}
              >+ Add Rule</button>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa' }}>Current Win Ratios</p>
                {rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(248,250,252,0.6)', marginBottom: '0.25rem' }}>
                    <span>{r.label || `Group ${i + 1}`}</span>
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>{r.win_probability}:{100 - r.win_probability} (win:lose)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: QR Code */}
          {tab === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>&ldquo;{name}&rdquo; is ready!</h2>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', display: 'inline-flex' }}>
                <QRCodeSVG id="new-event-qr" value={eventUrl} size={220} />
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', width: '100%' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)' }}>Participants scan this to register & play:</p>
                <code style={{ fontSize: '0.85rem', color: '#a5f3fc', wordBreak: 'break-all' }}>{eventUrl}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={eventUrl} target="_blank" rel="noreferrer" style={{ padding: '0.65rem 1.25rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.65rem', color: '#a78bfa', textDecoration: 'none', fontSize: '0.875rem' }}>🔗 Open Page</a>
                <button onClick={downloadQR} style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', borderRadius: '0.65rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }}>⬇ Download PNG</button>
              </div>
              <button onClick={() => router.push('/admin')} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                Back to Admin →
              </button>
            </div>
          )}

        </div>

        {tab < 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button onClick={() => switchTab(Math.max(0, tab - 1))} disabled={tab === 0} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', fontSize: '0.875rem', cursor: tab === 0 ? 'not-allowed' : 'pointer', color: tab === 0 ? 'rgba(248,250,252,0.2)' : 'rgba(248,250,252,0.6)' }}>
              ← Previous
            </button>
            {tab < 4
              ? <button onClick={() => switchTab(tab + 1)} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Next →</button>
              : <button onClick={saveAndGetQR} disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>{saving ? '⏳ Saving…' : '📊 Save & Generate QR →'}</button>
            }
          </div>
        )}
      </div>
    </div>
  )
}
