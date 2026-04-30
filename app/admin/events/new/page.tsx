'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_DESIGNATION_GROUPS } from '@/lib/prize-logic'

const FONTS = ['Inter','Poppins','Montserrat','Roboto','DM Sans']
const GAMES = [
  { id: 'spin_wheel',    label: '🎡 Spin Wheel',    desc: 'Classic spinning wheel' },
  { id: 'number_match',  label: '🃏 Number Match',   desc: 'Match 3 symbols to win' },
  { id: 'anime_match',   label: '🐉 Anime Match',    desc: 'Memory card pair game' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const defaultPrizes = [
  { rank: 1, name: 'Grand Experience Package', description: 'Our top prize', image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 2, name: 'Premium Gift Hamper',       description: '',              image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 3, name: 'Branded Merchandise Kit',   description: '',              image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 4, name: 'Digital Voucher',           description: '',              image_url: '', is_consolation: false, is_grand_prize: false },
  { rank: 5, name: 'Better Luck Next Time',     description: 'Keep trying!',  image_url: '', is_consolation: true,  is_grand_prize: false },
]

export default function NewEventPage() {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Basic
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // UI
  const [bgColor, setBgColor] = useState('#0a0a1a')
  const [bgColor2, setBgColor2] = useState('#312e81')
  const [accentColor, setAccentColor] = useState('#f59e0b')
  const [fontFamily, setFontFamily] = useState('Poppins')
  const [heading, setHeading] = useState('')
  const [subheading, setSubheading] = useState('')
  const [footerText, setFooterText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Game
  const [gameType, setGameType] = useState('spin_wheel')
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState('')
  const [linkedinShareText, setLinkedinShareText] = useState('')

  // Prizes
  const [prizes, setPrizes] = useState(defaultPrizes)

  // Designation rules
  const [rules, setRules] = useState(DEFAULT_DESIGNATION_GROUPS.map(g => ({
    label: g.label,
    designations: g.designations.join(', '),
    prize_rank: g.prize_rank,
    win_probability: g.win_probability,
  })))

  const tabs = ['📋 Basic', '🎨 Design', '🎮 Game', '🏆 Prizes', '👤 Rules']

  async function save() {
    if (!name.trim()) { setError('Event name is required'); setTab(0); return }
    if (!slug.trim()) { setError('Slug is required'); setTab(0); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug, description, is_active: isActive,
          game_type: gameType,
          linkedin_company_url: linkedinCompanyUrl || null,
          linkedin_share_text: linkedinShareText || null,
          ui_config: { bgColor, bgColor2, accentColor, fontFamily, heading, subheading, footerText, logoUrl,
            bgGradient: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor2} 100%)` },
          prizes,
          designation_rules: rules.map(r => ({
            label: r.label,
            designations: r.designations.split(',').map(d => d.trim()).filter(Boolean),
            prize_rank: r.prize_rank,
            win_probability: r.win_probability,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      router.push('/admin')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving event')
    } finally { setSaving(false) }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '0.75rem', color: '#f8fafc', fontFamily: 'Inter,sans-serif', fontSize: '0.9rem', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8rem', fontWeight: 600,
    color: 'rgba(248,250,252,0.6)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1f', color: '#f8fafc', fontFamily: 'Inter,sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/admin" style={{ color: 'rgba(248,250,252,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>← Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Create Event</h1>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ maxWidth: 140, padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}>
          {saving ? '⏳ Saving…' : '💾 Save Event'}
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tab bar */}
        <div className="tab-list" style={{ marginBottom: '1.5rem' }}>
          {tabs.map((t, i) => (
            <button key={i} className={`tab-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {/* ── Tab 0: Basic ── */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Event Name *</label>
                <input style={fieldStyle} value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)) }} placeholder="My Awesome Event" />
              </div>
              <div>
                <label style={labelStyle}>URL Slug *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>/</span>
                  <input style={fieldStyle} value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="my-awesome-event" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief event description…" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Active (visible to participants)</label>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isActive ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: isActive ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', display: 'block',
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* ── Tab 1: Design ── */}
          {tab === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Background Gradient</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>From</span>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>To</span>
                      <input type="color" value={bgColor2} onChange={e => setBgColor2(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', marginTop: '0.25rem' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Accent Color</label>
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '100%', height: 40, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={labelStyle}>Font Family</label>
                  <select style={{ ...fieldStyle, appearance: 'none' }} value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                    {FONTS.map(f => <option key={f} value={f} style={{ background: '#1e1b4b' }}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Logo URL</label>
                  <input style={fieldStyle} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
                </div>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input style={fieldStyle} value={heading} onChange={e => setHeading(e.target.value)} placeholder="🎉 Win Amazing Prizes!" />
                </div>
                <div>
                  <label style={labelStyle}>Sub-heading</label>
                  <input style={fieldStyle} value={subheading} onChange={e => setSubheading(e.target.value)} placeholder="Fill the form to spin & win!" />
                </div>
                <div>
                  <label style={labelStyle}>Footer Text</label>
                  <input style={fieldStyle} value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="© 2025 Company Name" />
                </div>
              </div>
              {/* Live preview */}
              <div>
                <label style={labelStyle}>Preview</label>
                <div style={{
                  borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                  background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor2} 100%)`,
                  minHeight: 300, padding: '2rem', textAlign: 'center',
                  fontFamily: fontFamily + ',sans-serif',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                }}>
                  {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 40, objectFit: 'contain' }} />}
                  <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: accentColor, margin: 0 }}>
                    {heading || `🎉 ${name || 'Event Name'}`}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
                    {subheading || 'Fill the form to spin & win!'}
                  </p>
                  <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1rem', width: '100%', textAlign: 'left' }}>
                    <div style={{ height: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: '0.5rem', width: '60%' }} />
                    <div style={{ height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: '0.5rem' }} />
                    <div style={{ height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 2: Game ── */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Select Game</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                  {GAMES.map(g => (
                    <button key={g.id} type="button" onClick={() => setGameType(g.id)} style={{
                      padding: '1.25rem 1rem', borderRadius: '1rem', border: '2px solid',
                      borderColor: gameType === g.id ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                      background: gameType === g.id ? 'rgba(124,62,237,0.2)' : 'rgba(255,255,255,0.04)',
                      color: '#f8fafc', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{g.label.split(' ')[0]}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{g.label.slice(g.label.indexOf(' ')+1)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.45)', marginTop: '0.25rem' }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>LinkedIn Company URL</label>
                <input style={fieldStyle} value={linkedinCompanyUrl} onChange={e => setLinkedinCompanyUrl(e.target.value)} placeholder="https://www.linkedin.com/company/your-company" />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn Share Message</label>
                <textarea style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }} value={linkedinShareText} onChange={e => setLinkedinShareText(e.target.value)} placeholder="Just won at {event}! 🎉 Check out this awesome event…" />
                <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)', marginTop: '0.25rem', display: 'block' }}>Leave blank for auto-generated message</span>
              </div>
            </div>
          )}

          {/* ── Tab 3: Prizes ── */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)', marginBottom: '0.5rem' }}>
                Define up to 5 prize tiers. Rank 5 is the consolation &ldquo;Better Luck Next Time&rdquo;.
              </p>
              {prizes.map((prize, i) => (
                <div key={i} className="glass-dark" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: prize.is_consolation ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                    }}>
                      {prize.is_consolation ? '—' : `#${prize.rank}`}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {prize.is_consolation ? 'Consolation Prize' : `Rank ${prize.rank} Prize`}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Prize Name</label>
                      <input style={fieldStyle} value={prize.name} onChange={e => setPrizes(p => p.map((x,j) => j===i ? {...x,name:e.target.value} : x))} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Image URL</label>
                      <input style={fieldStyle} value={prize.image_url} onChange={e => setPrizes(p => p.map((x,j) => j===i ? {...x,image_url:e.target.value} : x))} placeholder="https://…/prize.png" />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Description</label>
                      <input style={fieldStyle} value={prize.description} onChange={e => setPrizes(p => p.map((x,j) => j===i ? {...x,description:e.target.value} : x))} placeholder="Brief prize description" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab 4: Designation Rules ── */}
          {tab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'rgba(248,250,252,0.5)' }}>
                Map designation groups to prize tiers. Win probability: 90 = 90% chance to win that tier&apos;s prize.
              </p>
              {rules.map((rule, i) => (
                <div key={i} className="glass-dark" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Group Label</label>
                      <input style={fieldStyle} value={rule.label} onChange={e => setRules(r => r.map((x,j) => j===i ? {...x,label:e.target.value} : x))} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Prize Rank</label>
                      <select style={{ ...fieldStyle, width: 90, appearance: 'none' }} value={rule.prize_rank} onChange={e => setRules(r => r.map((x,j) => j===i ? {...x,prize_rank:+e.target.value} : x))}>
                        {[1,2,3,4].map(n => <option key={n} value={n} style={{background:'#1e1b4b'}}>Rank {n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Win % ({rule.win_probability})</label>
                      <input type="range" min={0} max={100} value={rule.win_probability} onChange={e => setRules(r => r.map((x,j) => j===i ? {...x,win_probability:+e.target.value} : x))} style={{ width: 120 }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Designations (comma separated)</label>
                    <input style={fieldStyle} value={rule.designations} onChange={e => setRules(r => r.map((x,j) => j===i ? {...x,designations:e.target.value} : x))} placeholder="CEO, COO, VP, Director" />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => setRules(r => [...r, { label: 'New Group', designations: '', prize_rank: 4, win_probability: 50 }])}>
                + Add Group
              </button>
            </div>
          )}
        </div>

        {/* Bottom save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
          <a href="/admin" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}>Cancel</a>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ maxWidth: 180, fontSize: '0.9rem' }}>
            {saving ? '⏳ Saving…' : '💾 Save Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
