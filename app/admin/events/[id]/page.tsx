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

type FieldMapping = { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options?: string; enabled?: boolean }
type Rule  = { id?: string; label: string; designations: string; prize_rank: number; win_probability: number }
type Prize = {
  id?: string
  rank: number; name: string; description: string; image_url: string
  quantity: number; is_consolation: boolean; is_grand_prize: boolean
}

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

  type Winner = { id: string; name: string; designation: string; company: string; email: string; prize_name: string; prize_rank_won: number; prize_handed_out: boolean; is_grand_prize_winner: boolean; game_result: string; created_at: string }
  const [winners, setWinners]         = useState<Winner[]>([])
  const [winnersLoading, setWinnersLoading] = useState(false)
  const [handingOut, setHandingOut]   = useState<string | null>(null)
  const [winnerSearch, setWinnerSearch] = useState('')

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
  const [boothNumber, setBooth] = useState('')

  const [prizes, setPrizes] = useState<Prize[]>([
    { rank: 1, name: 'Grand Prize',           description: '', image_url: '', quantity: 1,  is_consolation: false, is_grand_prize: true  },
    { rank: 2, name: 'Premium Gift Hamper',   description: '', image_url: '', quantity: 3,  is_consolation: false, is_grand_prize: false },
    { rank: 3, name: 'Branded Merchandise',   description: '', image_url: '', quantity: 5,  is_consolation: false, is_grand_prize: false },
    { rank: 4, name: 'Digital Voucher',       description: '', image_url: '', quantity: 10, is_consolation: false, is_grand_prize: false },
    { rank: 5, name: 'Better Luck Next Time', description: '', image_url: '', quantity: 0,  is_consolation: true,  is_grand_prize: false },
  ])
  const [rules, setRules] = useState<Rule[]>(
    DEFAULT_DESIGNATION_GROUPS.map(g => ({
      label: g.label, designations: g.designations.join(', '),
      prize_rank: g.prize_rank, win_probability: g.win_probability,
    }))
  )
  const [fields, setFields]     = useState<FieldMapping[]>([])
  const [claimedMap, setClaimedMap] = useState<Record<number, number>>({})
  const [newDesigInputs, setNewDesigInputs] = useState<Record<string, string>>({})

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin) }, [])
  const eventUrl = origin && slug ? `${origin}/${slug}` : ''

  useEffect(() => {
    fetch('/api/admin/events').then(r => r.json()).then(async data => {
      const ev = (data.events || []).find((e: { id: string }) => e.id === id)
      if (!ev) { router.push('/admin'); return }
      setName(ev.name); setSlug(ev.slug); setIsActive(ev.is_active)
      setGame(ev.game_type || 'spin_wheel')
      const ui = ev.ui_config || {}
      setBg(ui.bgColor || '#0a0a1a'); setBg2(ui.bgColor2 || '#312e81')
      setAccent(ui.accentColor || '#f59e0b')
      setHeading(ui.heading || ''); setLogo(ui.logoUrl || ''); setFooter(ui.footerText || '')
      setBooth(ev.booth_number || '')
      if (ev.prizes?.length) {
        setPrizes(ev.prizes.map((p: Prize) => ({
          id: p.id,
          rank: p.rank, name: p.name, description: p.description || '',
          image_url: p.image_url || '', quantity: p.quantity ?? 1,
          is_consolation: p.is_consolation,
          is_grand_prize: p.rank === 1 ? true : p.is_grand_prize,
        })))
      }
      if (ev.designation_rules?.length) {
        setRules(ev.designation_rules.map((r: { id: string; label: string; designations: string[]; prize_rank: number; win_probability: number }) => ({
          id: r.id,
          label: r.label || '', designations: (r.designations || []).join(', '),
          prize_rank: r.prize_rank, win_probability: r.win_probability,
        })))
      }
      if (ev.form_fields?.length) setFields(ev.form_fields)
      const claimRes = await fetch(`/api/admin/prizes/claimed?eventId=${id}`)
      if (claimRes.ok) {
        const claimData = await claimRes.json()
        setClaimedMap(claimData.claimedByRank ?? {})
      }
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
          booth_number: boothNumber,
          ui_config: { bgColor, bgColor2, accentColor: accent, heading, logoUrl, footerText, bgGradient: `linear-gradient(135deg,${bgColor} 0%,${bgColor2} 100%)` },
          form_fields: fields,
          prizes: prizes.map(p => ({ ...p, is_grand_prize: p.rank === 1 ? true : p.is_grand_prize })),
          designation_rules: rules.map(r => ({
            id: r.id,
            label: r.label,
            designations: r.designations.split(',').map((d: string) => d.trim()).filter(Boolean),
            prize_rank: r.prize_rank, win_probability: r.win_probability,
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

  async function loadWinners() {
    setWinnersLoading(true)
    // Load ALL registrations so the grouped columns can show "Better Luck Next Time" too
    const res = await fetch(`/api/admin/winners?eventId=${id}&all=true`)
    if (res.ok) { const d = await res.json(); setWinners(d.winners ?? []) }
    setWinnersLoading(false)
  }

  async function markHandedOut(regId: string, currentState: boolean) {
    setHandingOut(regId)
    await fetch('/api/admin/winners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: regId, handed_out: !currentState }),
    })
    setWinners(prev => prev.map(w => w.id === regId ? { ...w, prize_handed_out: !currentState } : w))
    setHandingOut(null)
  }

  async function downloadCSV() {
    // Export ALL registrations (not just winners)
    const res = await fetch(`/api/admin/winners?eventId=${id}&all=true`)
    const d   = await res.json()
    const rows: string[][] = []
    rows.push(['Name','Email','Designation','Company','Prize','Prize Rank','Result','Handed Out','Date'])
    for (const w of (d.winners ?? [])) {
      rows.push([
        w.name ?? '', w.email ?? '', w.designation ?? '', w.company ?? '',
        w.prize_name ?? '', String(w.prize_rank_won ?? ''),
        w.game_result === 'won' ? 'Won' : 'Better Luck Next Time',
        w.prize_handed_out ? 'Yes' : 'No',
        new Date(w.created_at).toLocaleString(),
      ])
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${slug}-all-registrations.csv`; a.click()
  }

  const tabs = [
    { label: 'Details',    icon: '📋' },
    { label: 'Form',       icon: '📝' },
    { label: 'Design',     icon: '🎨' },
    { label: 'Game',       icon: '🎮' },
    { label: 'Prizes',     icon: '🏆' },
    { label: 'Win Rules',  icon: '🎯' },
    { label: 'QR Code',    icon: '📊' },
    { label: 'Winners',    icon: '🏅' },
  ]

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
          <button onClick={() => router.push(`/admin/events/${id}/session`)} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fcd34d', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            🎰 Grand Prize Session
          </button>
          <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
            👁 Preview
          </a>
          <button onClick={save} disabled={saving} style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ Saving…' : '💾 Save'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
        {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.25rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

          {/* ── Left sidebar nav ── */}
          <nav style={{
            width: 170, flexShrink: 0,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '0.625rem',
            position: 'sticky', top: 72,
          }}>
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => { setTab(i); if (i === 7 && winners.length === 0) loadWinners() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  width: '100%', padding: '0.6rem 0.75rem',
                  borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: tab === i ? 700 : 500,
                  textAlign: 'left',
                  background: tab === i ? '#7c3aed' : 'transparent',
                  color: tab === i ? '#fff' : 'rgba(248,250,252,0.55)',
                  transition: 'all 0.15s',
                  marginBottom: '0.15rem',
                }}
                onMouseEnter={e => { if (tab !== i) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (tab !== i) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: '0.95rem' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* ── Main content panel ── */}
          <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.75rem' }}>

          {/* TAB 0: Details */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div><label style={L}>Event Name</label><input style={F} value={name} onChange={e => setName(e.target.value)} /></div>
              <div>
                <label style={L}>URL Slug</label>
                <input style={F} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>Event URL: {eventUrl}</span>
              </div>
              <div>
                <label style={L}>Booth Number</label>
                <input style={F} value={boothNumber} placeholder="e.g. B12, Hall 3, Gate A" onChange={e => setBooth(e.target.value)} />
                <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>Shown on winner’s result screen as “Show this at Booth [X]”</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ ...L, marginBottom: 0 }}>Active</label>
                <button type="button" onClick={() => setIsActive(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Form Fields */}
          {tab === 1 && (
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

          {/* TAB 4: Prizes */}
          {tab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 72px 100px', gap: '0.5rem', paddingLeft: '0.75rem' }}>
                {['Rank', 'Prize Name', 'Image URL', 'Qty', 'Remaining'].map(h => (
                  <span key={h} style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {prizes.map((p, i) => {
                const claimed   = claimedMap[p.rank] ?? 0
                const remaining = p.is_consolation ? null : Math.max(0, p.quantity - claimed)
                const soldOut   = !p.is_consolation && remaining === 0 && p.quantity > 0
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 72px 100px', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: soldOut ? '1px solid rgba(248,113,113,0.3)' : '1px solid transparent' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', fontWeight: 700, display: 'block' }}>
                        {p.is_consolation ? 'Consolation' : `Rank ${p.rank}`}
                      </span>
                      {p.is_grand_prize && (
                        <span style={{ fontSize: '0.6rem', color: '#fcd34d', fontWeight: 700, background: 'rgba(245,158,11,0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', marginTop: '0.2rem', display: 'inline-block' }}>🏆 Grand</span>
                      )}
                    </div>
                    <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.name} placeholder="Prize name"
                      onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input style={{ ...F, padding: '0.5rem 0.75rem' }} value={p.image_url} placeholder="Image URL (optional)"
                      onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} />
                    {p.is_consolation ? (
                      <span style={{ textAlign: 'center', color: 'rgba(248,250,252,0.25)', fontSize: '1.1rem' }}>∞</span>
                    ) : (
                      <input type="number" min={0} style={{ ...F, padding: '0.5rem', textAlign: 'center' }} value={p.quantity}
                        onChange={e => setPrizes(ps => ps.map((x, j) => j === i ? { ...x, quantity: Math.max(0, Number(e.target.value)) } : x))} />
                    )}
                    {p.is_consolation ? (
                      <span style={{ fontSize: '0.72rem', color: 'rgba(248,250,252,0.25)', textAlign: 'center' }}>∞</span>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: soldOut ? '#f87171' : remaining! <= 2 ? '#fbbf24' : '#4ade80' }}>{remaining} left</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(248,250,252,0.3)' }}>{claimed} claimed</span>
                      </div>
                    )}
                  </div>
                )
              })}
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.3)' }}>
                Qty = total units. Red = sold out. 🏆 Grand prize is awarded only via Grand Prize Session.
              </p>
            </div>
          )}

          {/* TAB 5: Win Rules */}
          {tab === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
                  Each card defines a group of job titles eligible for a specific prize rank.
                  Add/remove individual designations as chips — no comma typing needed.
                </p>
              </div>

              {rules.map((r, i) => {
                const ruleKey = r.id || String(i)
                const chips = r.designations.split(',').map((d: string) => d.trim()).filter(Boolean)
                const targetPrize = prizes.find(p => !p.is_consolation && !p.is_grand_prize && p.rank === r.prize_rank)
                const inputVal = newDesigInputs[ruleKey] || ''

                function addChip(val: string) {
                  const trimmed = val.trim()
                  if (!trimmed || chips.includes(trimmed)) return
                  const next = [...chips, trimmed].join(', ')
                  setRules(rs => rs.map((x, j) => j === i ? { ...x, designations: next } : x))
                  setNewDesigInputs(prev => ({ ...prev, [ruleKey]: '' }))
                }

                function removeChip(ci: number) {
                  const next = chips.filter((_: string, idx: number) => idx !== ci).join(', ')
                  setRules(rs => rs.map((x, j) => j === i ? { ...x, designations: next } : x))
                }

                return (
                  <div key={ruleKey} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '1rem', padding: '1.25rem',
                    transition: 'border-color 0.2s',
                  }}>
                    {/* ── Card header row ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' as const }}>
                      {/* Group name */}
                      <input style={{ ...F, padding: '0.5rem 0.75rem', flex: '1 1 160px', minWidth: 140 }}
                        value={r.label} placeholder="Group name (e.g. C-Suite / VP)"
                        onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />

                      {/* Prize rank dropdown */}
                      <select
                        value={r.prize_rank}
                        onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, prize_rank: Number(e.target.value) } : x))}
                        style={{ ...F, padding: '0.45rem 0.75rem', flex: '0 1 220px', appearance: 'none' as const }}
                      >
                        {prizes.filter(p => !p.is_consolation && !p.is_grand_prize).map(p => (
                          <option key={p.rank} value={p.rank} style={{ background: '#1e1b4b' }}>
                            Rank {p.rank} — {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Win probability */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <input type="number" min={0} max={100}
                          style={{ ...F, padding: '0.45rem', width: 62, textAlign: 'center' as const }}
                          value={r.win_probability}
                          onChange={e => setRules(rs => rs.map((x, j) => j === i ? { ...x, win_probability: Number(e.target.value) } : x))} />
                        <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)', whiteSpace: 'nowrap' }}>% win</span>
                      </div>

                      {/* Delete rule */}
                      <button onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}
                        style={{ padding: '0.4rem 0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '0.5rem', color: '#fca5a5', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' as const }}>
                        ✕ Remove
                      </button>
                    </div>

                    {/* ── Prize badge ── */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '0.2rem 0.65rem', borderRadius: '999px', border: '1px solid rgba(124,58,237,0.25)' }}>
                        Eligible for: {targetPrize ? `Rank ${targetPrize.rank} — ${targetPrize.name}` : `Rank ${r.prize_rank}`}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(248,250,252,0.35)', marginLeft: '0.625rem' }}>
                        {r.win_probability}% chance to win · {chips.length} designation{chips.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* ── Designation chips ── */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      {chips.map((chip: string, ci: number) => (
                        <span key={ci} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.25rem 0.5rem 0.25rem 0.75rem',
                          background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.28)',
                          borderRadius: '999px', fontSize: '0.78rem', color: '#c4b5fd',
                        }}>
                          {chip}
                          <button onClick={() => removeChip(ci)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(196,181,253,0.55)', padding: '0 0.1rem',
                            lineHeight: 1, fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                          }}>✕</button>
                        </span>
                      ))}

                      {/* Inline add input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          value={inputVal}
                          placeholder="+ Add title, Enter"
                          onChange={e => setNewDesigInputs(prev => ({ ...prev, [ruleKey]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(inputVal) } }}
                          style={{
                            padding: '0.25rem 0.6rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: '999px', color: '#f8fafc', fontSize: '0.78rem',
                            outline: 'none', width: 150, transition: 'border-color 0.2s',
                          }}
                        />
                        {inputVal.trim() && (
                          <button onClick={() => addChip(inputVal)} style={{
                            padding: '0.25rem 0.6rem',
                            background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                            borderRadius: '999px', color: '#a78bfa', cursor: 'pointer', fontSize: '0.78rem',
                          }}>Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add new rule */}
              <button
                onClick={() => setRules(rs => [...rs, { id: crypto.randomUUID(), label: '', designations: '', prize_rank: prizes.find(p => !p.is_consolation && !p.is_grand_prize)?.rank ?? 2, win_probability: 30 }])}
                style={{ padding: '0.65rem 1.25rem', background: 'rgba(124,58,237,0.12)', border: '1px dashed rgba(124,58,237,0.35)', borderRadius: '0.75rem', color: '#a78bfa', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
              >+ Add Group Rule</button>

              {/* Win ratio summary */}
              <div style={{ padding: '1rem', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: '0.875rem' }}>
                <p style={{ margin: '0 0 0.625rem', fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Win Probability Summary</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {rules.map((r, i) => {
                    const tPrize = prizes.find(p => !p.is_consolation && !p.is_grand_prize && p.rank === r.prize_rank)
                    const chips = r.designations.split(',').map((d: string) => d.trim()).filter(Boolean)
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'rgba(248,250,252,0.55)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>{r.label || `Group ${i + 1}`}</span>
                          {tPrize && <span style={{ fontSize: '0.68rem', color: 'rgba(167,139,250,0.7)' }}>→ {tPrize.name}</span>}
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>{chips.length} titles</span>
                        </span>
                        <span style={{ color: '#a78bfa', fontWeight: 700 }}>{r.win_probability}:{100 - r.win_probability}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Winners — grouped by prize */}
          {tab === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Prize Winners</h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)' }}>Tick ✓ when you physically hand out a prize.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={downloadCSV} style={{ padding: '0.35rem 0.85rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '0.45rem', color: '#34d399', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                    ⬇ Export All CSV
                  </button>
                  <button onClick={loadWinners} style={{ padding: '0.35rem 0.75rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '0.45rem', color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {winnersLoading ? '⏳' : '↻ Refresh'}
                  </button>
                </div>
              </div>

              {/* Summary bar */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Registrations', val: winners.length, color: '#a78bfa' },
                  { label: 'Winners', val: winners.filter(w => w.game_result === 'won').length, color: '#4ade80' },
                  { label: 'Handed Out', val: winners.filter(w => w.prize_handed_out).length, color: '#34d399' },
                  { label: 'Better Luck', val: winners.filter(w => w.game_result !== 'won').length, color: '#94a3b8' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.625rem', padding: '0.625rem 1rem', flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.1rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Search bar */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'rgba(248,250,252,0.35)', pointerEvents: 'none' }}>🔍</span>
                <input
                  value={winnerSearch}
                  onChange={e => setWinnerSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.65rem', color: '#f8fafc', fontSize: '0.82rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {winnerSearch && (
                  <button onClick={() => setWinnerSearch('')} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(248,250,252,0.4)', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                )}
              </div>

              {winnersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(248,250,252,0.3)', fontSize: '0.875rem' }}>Loading…</div>
              ) : winners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(248,250,252,0.25)', fontSize: '0.825rem' }}>
                  No registrations yet.
                </div>
              ) : (
                /* ── Prize-grouped columns ── */
                <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', alignItems: 'start', paddingBottom: '0.5rem' }}>
                  {[
                    // Non-consolation prizes sorted by rank
                    ...prizes.filter(p => !p.is_consolation && !p.is_grand_prize).sort((a,b) => a.rank - b.rank),
                    // Consolation last
                    ...prizes.filter(p => p.is_consolation),
                  ].map(p => {
                    const isConsolation = !!p.is_consolation
                    const q = winnerSearch.trim().toLowerCase()
                    const colWinners = winners.filter(w => {
                      const matchesPrize = isConsolation
                        ? w.game_result !== 'won'
                        : w.prize_rank_won === p.rank && w.game_result === 'won'
                      if (!matchesPrize) return false
                      if (!q) return true
                      return w.name.toLowerCase().includes(q) || (w.email ?? '').toLowerCase().includes(q)
                    })
                    const totalWon  = colWinners.length   // all digital winners (for stock calc)
                    const handedOut = colWinners.filter(w => w.prize_handed_out).length  // physically given out (tick ✓)
                    const remaining = isConsolation ? null : Math.max(0, p.quantity - totalWon)
                    const soldOut   = !isConsolation && remaining === 0

                    const accentColor = isConsolation ? '#64748b'
                      : p.rank === 2 ? '#f59e0b'
                      : p.rank === 3 ? '#a78bfa'
                      : '#60a5fa'

                    return (
                      <div key={p.rank} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${soldOut ? 'rgba(248,113,113,0.25)' : `rgba(${isConsolation?'100,116,139':'255,255,255'},0.09)`}`,
                        borderRadius: '1rem', overflow: 'hidden', flexShrink: 0,
                        width: 260, minWidth: 220,
                      }}>
                        {/* Column header */}
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: `rgba(${isConsolation?'100,116,139':p.rank===2?'245,158,11':p.rank===3?'167,139,250':'96,165,250'},0.08)`,
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: accentColor }}>{p.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.1rem' }}>
                            {isConsolation ? `${totalWon} participants` : (
                              <span>
                                <span style={{ color: soldOut ? '#f87171' : remaining! <= 2 ? '#fbbf24' : '#4ade80', fontWeight: 700 }}>
                                  {remaining} left
                                </span>
                                {' · '}{handedOut}/{p.quantity} handed out ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rows — slim, divider-separated */}
                        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                          {colWinners.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'rgba(248,250,252,0.18)', fontSize: '0.72rem' }}>None yet</div>
                          ) : colWinners.map((w, idx) => (
                            <div key={w.id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.45rem 0.75rem',
                              background: w.prize_handed_out ? 'rgba(74,222,128,0.05)' : 'transparent',
                              borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                              transition: 'background 0.2s',
                            }}>
                              {/* Slim avatar initial */}
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.6rem', color: '#fff',
                                background: `hsl(${(w.name.charCodeAt(0)*15)%360},45%,30%)`,
                              }}>
                                {w.name.charAt(0).toUpperCase()}
                              </div>
                              {/* Name + email inline */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.73rem', color: w.prize_handed_out ? '#4ade80' : '#f8fafc', marginRight: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {w.name}
                                  {w.designation ? <span style={{ fontWeight: 400, color: 'rgba(248,250,252,0.35)', fontSize: '0.66rem' }}> &middot; {w.designation}</span> : null}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {w.email}
                                </span>
                              </div>
                              {/* Tick — only for actual winners */}
                              {!isConsolation && (
                                <button
                                  onClick={() => markHandedOut(w.id, w.prize_handed_out)}
                                  disabled={handingOut === w.id}
                                  title={w.prize_handed_out ? 'Undo handed out' : 'Mark handed out'}
                                  style={{
                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: 'none',
                                    background: w.prize_handed_out ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)',
                                    color: w.prize_handed_out ? '#4ade80' : 'rgba(248,250,252,0.25)',
                                    fontSize: '0.78rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  {handingOut === w.id ? '…' : w.prize_handed_out ? '✓' : '○'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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

        </div>{/* end main content panel */}

        </div>{/* end flex row */}
      </div>{/* end page wrapper */}
    </div>
  )
}
