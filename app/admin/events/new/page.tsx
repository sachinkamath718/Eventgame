'use client'
import { useState, useEffect } from 'react'
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
  width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem',
  border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
  color: '#f8fafc', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}
const L: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'rgba(248,250,252,0.55)', marginBottom: '0.4rem',
}

type Field = { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options: string }
type Rule  = { label: string; designations: string; prize_rank: number; win_probability: number }
type Prize = { rank: number; name: string; description: string; image_url: string; is_consolation: boolean; is_grand_prize: boolean }

export default function NewEventPage() {
  const router = useRouter()
  const [tab, setTab]       = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [saved, setSaved]   = useState<{ id: string; slug: string } | null>(null)
  const [origin, setOrigin] = useState('')

  // Details
  const [name, setName]     = useState('')
  const [eventSlug, setSlug] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Form fields
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS)

  // Design
  const [bgColor, setBg]      = useState('#0a0a1a')
  const [bgColor2, setBg2]    = useState('#312e81')
  const [accent, setAccent]   = useState('#f59e0b')
  const [heading, setHeading] = useState('')
  const [logoUrl, setLogo]    = useState('')
  const [footerText, setFooter] = useState('')

  // Game
  const [gameType, setGame] = useState('spin_wheel')

  // Prizes
  const [prizes, setPrizes] = useState<Prize[]>(DEFAULT_PRIZES)

  // Designation rules
  const [rules, setRules] = useState<Rule[]>(
    DEFAULT_DESIGNATION_GROUPS.map(g => ({
      label: g.label,
      designations: g.designations.join(', '),
      prize_rank: g.prize_rank,
      win_probability: g.win_probability,
    }))
  )

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const eventUrl = saved ? `${origin}/${saved.slug}` : ''

  const tabs = ['📋 Details', '📝 Form Fields', '🎨 Design', '🎮 Game', '🏆 Prizes', '🎯 Win Rules', '📊 QR Code']

  // ── Save / update ─────────────────────────────────────────────────────────
  async function saveAll() {
    if (!name.trim()) { setError('Event name is required'); return }
    setSaving(true); setError('')
    try {
      const finalSlug = eventSlug || slugify(name)
      const payload = {
        name,
        slug: finalSlug,
        is_active: isActive,
        game_type: gameType,
        form_fields: fields,
        ui_config: {
          bgColor, bgColor2, accentColor: accent, heading, logoUrl, footerText,
          bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)`,
        },
        prizes,
        designation_rules: rules.map(r => ({
          label: r.label,
          designations: r.designations.split(',').map(d => d.trim()).filter(Boolean),
          prize_rank: r.prize_rank,
          win_probability: r.win_probability,
        })),
      }

      if (saved) {
        // Update existing
        const res = await fetch('/api/admin/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: saved.id, ...payload }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      } else {
        // Create new
        const res = await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSaved(data.event)
        setSlug(finalSlug)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving event')
    } finally {
      setSaving(false)
    }
  }

  const addField = () => setFields(fs => [...fs, { formLabel: '', fieldKey: 'custom', required: false, fieldType: 'text', options: '' }])
  const removeField = (i: number) => setFields(fs => fs.filter((_, j) => j !== i))
  const updateField = (i: number, patch: Partial<Field>) => setFields(fs => fs.map((f, j) => j === i ? { ...f, ...patch } : f))

  function downloadQR() {
    const svg = document.getElementById('new-event-qr') as SVGElement | null
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
        a.download = `${eventSlug || slugify(name)}-qr.png`
        a.click()
      }, 'image/png')
    }
    img.src = url
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Create New Event</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {saved && (
            <a href={`/${saved.slug}`} target="_blank" rel="noreferrer"
              style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
              👁 Preview
            </a>
          )}
          <button onClick={saveAll} disabled={saving}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ Saving…' : saved ? '💾 Save' : '✨ Create Event'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: '0.5rem 1rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: tab === i ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: tab === i ? '#fff' : 'rgba(248,250,252,0.6)', transition: 'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem' }}>

          {/* TAB 0: Details */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={L}>Event Name *</label>
                <input style={F} value={name} placeholder="e.g. TechSummit 2025 Lucky Draw"
                  onChange={e => { setName(e.target.value); if (!eventSlug) setSlug(slugify(e.target.value)) }} />
              </div>
              <div>
                <label style={L}>URL Slug</label>
                <input style={F} value={eventSlug} placeholder="techsummit-2025"
                  onChange={e => setSlug(slugify(e.target.value))} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', display: 'block', marginTop: '0.25rem' }}>
                  QR will link to: <strong>{origin}/{eventSlug || slugify(name) || 'your-event'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ ...L, marginBottom: 0 }}>Active</label>
                <button type="button" onClick={() => setIsActive(v => !v)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Form Fields */}
          {tab === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>Fields shown in the participant registration form.</p>
                <button onClick={addField} style={{ padding: '0.4rem 0.85rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Add Field
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr auto', gap: '0.5rem', marginBottom: '0.4rem' }}>
                {['Label', 'Type', 'Maps To', 'Req', ''].map(h => <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>)}
              </div>
              {fields.map((field, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={field.formLabel} placeholder="Label"
                    onChange={e => updateField(i, { formLabel: e.target.value })} />
                  <select style={{ ...F, padding: '0.5rem', appearance: 'none' }} value={field.fieldType}
                    onChange={e => updateField(i, { fieldType: e.target.value })}>
                    {['text', 'email', 'tel', 'number', 'select'].map(t => <option key={t} value={t} style={{ background: '#1e1b4b' }}>{t}</option>)}
                  </select>
                  <select style={{ ...F, padding: '0.5rem 0.4rem', appearance: 'none', fontSize: '0.78rem' }} value={field.fieldKey}
                    onChange={e => updateField(i, { fieldKey: e.target.value })}>
                    {['name', 'email', 'phone_number', 'company', 'designation', 'custom'].map(k => <option key={k} value={k} style={{ background: '#1e1b4b' }}>{k}</option>)}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }} />
                  </div>
                  <button onClick={() => removeField(i)} style={{ padding: '0.4rem 0.6rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.45rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                </div>
              ))}
              {fields.some(f => f.fieldType === 'select') && (
                <div style={{ marginTop: '0.75rem' }}>
                  {fields.map((f, i) => f.fieldType === 'select' && (
                    <div key={i} style={{ marginBottom: '0.5rem' }}>
                      <label style={{ ...L, marginBottom: '0.25rem' }}>{f.formLabel || `Field ${i + 1}`} — Options (comma separated)</label>
                      <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={f.options} placeholder="Option A, Option B"
                        onChange={e => updateField(i, { options: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Design */}
          {tab === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={L}>Background Start</label><input type="color" value={bgColor} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Background End</label><input type="color" value={bgColor2} onChange={e => setBg2(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Accent Color</label><input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Logo URL</label><input style={F} value={logoUrl} placeholder="https://…/logo.png" onChange={e => setLogo(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Heading</label><input style={F} value={heading} placeholder={`🎉 ${name || 'Your Event'}`} onChange={e => setHeading(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Footer Text</label><input style={F} value={footerText} placeholder="© 2025 Your Company" onChange={e => setFooter(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1', borderRadius: '0.75rem', padding: '1.5rem', background: `linear-gradient(135deg,${bgColor},${bgColor2})`, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.2rem', color: accent }}>{heading || `🎉 ${name || 'Your Event'}`}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>Fill in your details to spin & win!</div>
              </div>
            </div>
          )}

          {/* TAB 3: Game */}
          {tab === 3 && (
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

          {/* TAB 4: Prizes */}
          {tab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {prizes.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.is_consolation ? 'Consolation' : `Rank ${p.rank}`}</span>
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.name} placeholder="Prize name"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.image_url} placeholder="Image URL (optional)"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} />
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: Win Rules */}
          {tab === 5 && (
            <div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>
                Set win probability per designation group. A roll under the % wins the prize at that rank.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['Group', 'Designations (comma separated)', 'Prize Rank', 'Win %'].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {rules.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'start' }}>
                  <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={r.label} placeholder="Group name"
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }} value={r.designations} placeholder="CEO, CTO, VP…"
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, designations: e.target.value } : x))} />
                  <input type="number" min={1} max={5} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.prize_rank}
                    onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, prize_rank: Number(e.target.value) } : x))} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="number" min={0} max={100} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.win_probability}
                      onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, win_probability: Number(e.target.value) } : x))} />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)', whiteSpace: 'nowrap' }}>%</span>
                  </div>
                </div>
              ))}
              {/* Summary */}
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

          {/* TAB 6: QR Code */}
          {tab === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
              {!saved ? (
                <div style={{ padding: '2rem', color: 'rgba(248,250,252,0.4)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                  <p>Create the event first to generate a QR code.</p>
                  <button onClick={() => setTab(0)} style={{ padding: '0.6rem 1.25rem', background: '#7c3aed', border: 'none', borderRadius: '0.65rem', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Go to Details →</button>
                </div>
              ) : (
                <>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>QR Code for &ldquo;{name}&rdquo;</h3>
                  <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', display: 'inline-flex' }}>
                    <QRCodeSVG id="new-event-qr" value={eventUrl} size={220} />
                  </div>
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', width: '100%' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)' }}>Scans to:</p>
                    <code style={{ fontSize: '0.85rem', color: '#a5f3fc', wordBreak: 'break-all' }}>{eventUrl}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a href={eventUrl} target="_blank" rel="noreferrer"
                      style={{ padding: '0.65rem 1.25rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.65rem', color: '#a78bfa', textDecoration: 'none', fontSize: '0.875rem' }}>
                      🔗 Open Page
                    </a>
                    <button onClick={downloadQR}
                      style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', borderRadius: '0.65rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }}>
                      ⬇ Download PNG
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
          <a href="/admin" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}>Cancel</a>
          <button onClick={saveAll} disabled={saving}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
            {saving ? '⏳ Saving…' : saved ? '💾 Save Changes' : '✨ Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
