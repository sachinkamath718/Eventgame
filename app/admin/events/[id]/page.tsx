'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { DEFAULT_DESIGNATION_GROUPS } from '@/lib/prize-logic'

const GAMES = [
  { id: 'spin_wheel',   label: '🎡 Spin Wheel',  desc: 'Classic spinning wheel' },
  { id: 'number_match', label: '🃏 Number Match', desc: 'Match 3 symbols to win' },
  { id: 'anime_match',  label: '🐉 Anime Match',  desc: 'Memory card pair game' },
]

type FieldMapping = { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options?: string }
type Rule  = { label: string; designations: string; prize_rank: number; win_probability: number }
// ↓ quantity added
type Prize = { rank: number; name: string; description: string; image_url: string; quantity: number; is_consolation: boolean; is_grand_prize: boolean }

const F: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.07)',
  border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem',
  color: '#f8fafc', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}
const L: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'rgba(248,250,252,0.55)', marginBottom: '0.4rem',
}

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const id     = params.id as string

  const [tab, setTab]         = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [origin, setOrigin]   = useState('')

  const [name, setName]         = useState('')
  const [slug, setSlug]         = useState('')
  const [isActive, setIsActive] = useState(true)
  const [gameType, setGame]     = useState('spin_wheel')
  const [bgColor, setBg]        = useState('#0a0a1a')
  const [bgColor2, setBg2]      = useState('#312e81')
  const [accent, setAccent]     = useState('#f59e0b')
  const [heading, setHeading]   = useState('')
  const [logoUrl, setLogo]      = useState('')
  const [footerText, setFooter] = useState('')

  // ↓ quantity defaults added
  const [prizes, setPrizes] = useState<Prize[]>([
    { rank: 1, name: 'Grand Prize',           description: '', image_url: '', quantity: 1,  is_consolation: false, is_grand_prize: false },
    { rank: 2, name: 'Premium Gift Hamper',   description: '', image_url: '', quantity: 3,  is_consolation: false, is_grand_prize: false },
    { rank: 3, name: 'Branded Merchandise',   description: '', image_url: '', quantity: 5,  is_consolation: false, is_grand_prize: false },
    { rank: 4, name: 'Digital Voucher',       description: '', image_url: '', quantity: 10, is_consolation: false, is_grand_prize: false },
    { rank: 5, name: 'Better Luck Next Time', description: '', image_url: '', quantity: 0,  is_consolation: true,  is_grand_prize: false },
  ])
  const [rules, setRules]   = useState<Rule[]>(
    DEFAULT_DESIGNATION_GROUPS.map(g => ({
      label: g.label,
      designations: g.designations.join(', '),
      prize_rank: g.prize_rank,
      win_probability: g.win_probability,
    }))
  )
  const [fields, setFields] = useState<FieldMapping[]>([])

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin) }, [])

  const eventUrl = origin && slug ? `${origin}/${slug}` : ''

  useEffect(() => {
    fetch('/api/admin/events').then(r => r.json()).then(data => {
      const ev = (data.events || []).find((e: { id: string }) => e.id === id)
      if (!ev) { router.push('/admin'); return }
      setName(ev.name); setSlug(ev.slug); setIsActive(ev.is_active)
      setGame(ev.game_type || 'spin_wheel')
      const ui = ev.ui_config || {}
      setBg(ui.bgColor || '#0a0a1a'); setBg2(ui.bgColor2 || '#312e81')
      setAccent(ui.accentColor || '#f59e0b')
      setHeading(ui.heading || ''); setLogo(ui.logoUrl || ''); setFooter(ui.footerText || '')
      // ↓ map quantity from API, defaulting to 1 for existing prizes without it
      if (ev.prizes?.length) setPrizes(ev.prizes.map((p: Prize) => ({
        rank: p.rank,
        name: p.name,
        description: p.description || '',
        image_url: p.image_url || '',
        quantity: p.quantity ?? 1,
        is_consolation: p.is_consolation,
        is_grand_prize: p.is_grand_prize,
      })))
      if (ev.designation_rules?.length) setRules(ev.designation_rules.map((r: { label: string; designations: string[]; prize_rank: number; win_probability: number }) => ({
        label: r.label || '',
        designations: (r.designations || []).join(', '),
        prize_rank: r.prize_rank,
        win_probability: r.win_probability,
      })))
      if (ev.form_fields?.length) setFields(ev.form_fields)
      setLoading(false)
    })
  }, [id, router])

  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, name, slug, is_active: isActive, game_type: gameType,
          ui_config: { bgColor, bgColor2, accentColor: accent, heading, logoUrl, footerText, bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)` },
          form_fields: fields,
          prizes, // ↑ quantity is part of Prize so it's included automatically
          designation_rules: rules.map(r => ({
            label: r.label,
            designations: r.designations.split(',').map((d: string) => d.trim()).filter(Boolean),
            prize_rank: r.prize_rank,
            win_probability: r.win_probability,
          })),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      router.push('/admin')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error saving') }
    finally { setSaving(false) }
  }

  function downloadQR() {
    const svg = document.getElementById('event-detail-qr') as SVGElement | null
    if (!svg) return
    const size = 400
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${slug}-qr.png`
        a.click()
      }, 'image/png')
    }
    img.src = url
  }

  const tabs = ['📋 Details', '📝 Form Fields', '🎨 Design', '🎮 Game', '🏆 Prizes', '🎯 Win Rules', '📊 QR Code']

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter,sans-serif' }}>Loading…</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Edit: {name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => router.push(`/admin/events/${id}/session`)}
            style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fcd34d', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            🎰 Grand Prize Session
          </button>
          <a href={`/${slug}`} target="_blank" rel="noreferrer"
            style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
            👁 Preview
          </a>
          <button onClick={save} disabled={saving}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ Saving…' : '💾 Save'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: '0.5rem 1rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: tab === i ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: tab === i ? '#fff' : 'rgba(248,250,252,0.6)', transition: 'all 0.15s' }}>{t}</button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem' }}>

          {/* TAB 0: Details */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div><label style={L}>Event Name</label><input style={F} value={name} onChange={e => setName(e.target.value)} /></div>
              <div>
                <label style={L}>URL Slug</label>
                <input style={F} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>Event URL: {eventUrl}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ ...L, marginBottom: 0 }}>Active</label>
                <button type="button" onClick={() => setIsActive(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>
            </div>
          )}

         {/* TAB: Form Fields */}
{tab === (/* 1 for edit page, 0 for new page */) && (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>
        Fields shown in the participant registration form. Disable to hide from future registrations — past data is always preserved.
      </p>
      <button
        onClick={() => setFields(fs => [...fs, {
          formLabel: '', fieldKey: `custom_${Date.now()}`,
          required: false, fieldType: 'text', options: '', enabled: true,
        }])}
        style={{ padding: '0.4rem 0.85rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.5rem', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >+ Add Field</button>
    </div>

    {/* Column headers */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.5fr 0.5fr auto', gap: '0.5rem', marginBottom: '0.4rem' }}>
      {['Label', 'Type', 'Maps To', 'Req', 'On', ''].map(h => (
        <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
      ))}
    </div>

    {fields.map((field, i) => {
      const enabled = field.enabled !== false
      return (
        <div
          key={i}
          style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.5fr 0.5fr auto',
            gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center',
            opacity: enabled ? 1 : 0.4, transition: 'opacity 0.2s',
          }}
        >
          <input
            style={{ ...F, padding: '0.5rem 0.7rem' }}
            value={field.formLabel}
            placeholder="Label"
            onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, formLabel: e.target.value } : f))}
          />
          <select
            style={{ ...F, padding: '0.5rem', appearance: 'none' }}
            value={field.fieldType}
            onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, fieldType: e.target.value } : f))}
          >
            {['text','email','tel','number','select'].map(t => (
              <option key={t} value={t} style={{ background: '#1e1b4b' }}>{t}</option>
            ))}
          </select>
          <select
            style={{ ...F, padding: '0.5rem 0.4rem', appearance: 'none', fontSize: '0.78rem' }}
            value={field.fieldKey}
            onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, fieldKey: e.target.value } : f))}
          >
            {['name','email','phone_number','company','designation','custom'].map(k => (
              <option key={k} value={k} style={{ background: '#1e1b4b' }}>{k}</option>
            ))}
          </select>

          {/* Required checkbox */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => setFields(fs => fs.map((f, j) => j === i ? { ...f, required: e.target.checked } : f))}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }}
            />
          </div>

          {/* Enabled toggle — disabling hides from future forms, never deletes past data */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              title={enabled ? 'Click to disable (hides from form, keeps past data)' : 'Click to enable'}
              onClick={() => setFields(fs => fs.map((f, j) => j === i ? { ...f, enabled: !enabled } : f))}
              style={{
                width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: enabled ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2,
                left: enabled ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>

          {/* Remove button */}
          <button
            onClick={() => setFields(fs => fs.filter((_, j) => j !== i))}
            title="Remove field permanently from this event config"
            style={{ padding: '0.4rem 0.6rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.45rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem' }}
          >✕</button>
        </div>
      )
    })}

    <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)', lineHeight: 1.5 }}>
      <strong style={{ color: 'rgba(248,250,252,0.45)' }}>Toggle Off</strong> = hidden from new registrations, all past responses kept intact.{' '}
      <strong style={{ color: 'rgba(248,113,113,0.5)' }}>✕ Remove</strong> = removes from this event config only (past data in form_data column is still safe).
    </p>
  </div>
)}

          {/* TAB 2: Design */}
          {tab === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={L}>Background Start</label><input type="color" value={bgColor} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Background End</label><input type="color" value={bgColor2} onChange={e => setBg2(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Accent Color</label><input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} /></div>
              <div><label style={L}>Logo URL</label><input style={F} value={logoUrl} placeholder="https://…/logo.png" onChange={e => setLogo(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Heading</label><input style={F} value={heading} placeholder={`🎉 ${name}`} onChange={e => setHeading(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={L}>Footer Text</label><input style={F} value={footerText} placeholder="© 2025 Your Company" onChange={e => setFooter(e.target.value)} /></div>
              <div style={{ gridColumn: '1/-1', borderRadius: '0.75rem', padding: '1.5rem', background: `linear-gradient(135deg,${bgColor},${bgColor2})`, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.2rem', color: accent }}>{heading || `🎉 ${name}`}</div>
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

          {/* TAB 4: Prizes — quantity column added */}
          {tab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.5rem', paddingLeft: '0.75rem' }}>
                {['Rank', 'Prize Name', 'Image URL', 'Qty'].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {prizes.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {p.is_consolation ? 'Consolation' : `Rank ${p.rank}`}
                  </span>
                  <input
                    style={{ ...F, padding: '0.5rem 0.75rem' }}
                    value={p.name}
                    placeholder="Prize name"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    style={{ ...F, padding: '0.5rem 0.75rem' }}
                    value={p.image_url}
                    placeholder="Image URL (optional)"
                    onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))}
                  />
                  {/* ↓ quantity input — disabled (shown as ∞) for consolation prizes */}
                  {p.is_consolation ? (
                    <span style={{ textAlign: 'center', color: 'rgba(248,250,252,0.25)', fontSize: '1.1rem' }}>∞</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      style={{ ...F, padding: '0.5rem', textAlign: 'center' }}
                      value={p.quantity}
                      onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, quantity: Math.max(0, Number(e.target.value)) } : x))}
                    />
                  )}
                </div>
              ))}
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)' }}>
                Qty = total available units of each prize. Consolation prizes are unlimited (∞).
              </p>
            </div>
          )}

          {/* TAB 5: Win Rules */}
          {tab === 5 && (
            <div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>Set win probability per designation group.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['Group', 'Designations (comma separated)', 'Prize Rank', 'Win %'].map(h => <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>)}
              </div>
              {rules.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'start' }}>
                  <input style={{ ...F, padding: '0.5rem 0.7rem' }} value={r.label} placeholder="Group name" onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input style={{ ...F, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }} value={r.designations} placeholder="CEO, CTO, VP…" onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, designations: e.target.value } : x))} />
                  <input type="number" min={1} max={5} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.prize_rank} onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, prize_rank: Number(e.target.value) } : x))} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="number" min={0} max={100} style={{ ...F, padding: '0.5rem', width: 72 }} value={r.win_probability} onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, win_probability: Number(e.target.value) } : x))} />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)', whiteSpace: 'nowrap' }}>%</span>
                  </div>
                </div>
              ))}
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>QR Code for &ldquo;{name}&rdquo;</h3>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', display: 'inline-flex' }}>
                <QRCodeSVG id="event-detail-qr" value={eventUrl} size={220} />
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', width: '100%' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)' }}>Scans to:</p>
                <code style={{ fontSize: '0.85rem', color: '#a5f3fc', wordBreak: 'break-all' }}>{eventUrl}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={eventUrl} target="_blank" rel="noreferrer" style={{ padding: '0.65rem 1.25rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.65rem', color: '#a78bfa', textDecoration: 'none', fontSize: '0.875rem' }}>🔗 Open Page</a>
                <button onClick={downloadQR} style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', borderRadius: '0.65rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }}>⬇ Download PNG</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
          <a href="/admin" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}>Cancel</a>
          <button onClick={save} disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
