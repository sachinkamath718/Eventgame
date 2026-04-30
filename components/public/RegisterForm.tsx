'use client'

import { useState } from 'react'

interface LuckyEvent {
  id: string
  ui_config?: {
    heading?: string
    subheading?: string
    accentColor?: string
  }
  prizes?: Array<{ id: string; rank: number; name: string; description?: string; image_url?: string; is_consolation: boolean; is_grand_prize: boolean }>
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
}

interface Props { event: LuckyEvent }

interface RegResult {
  registrationId: string
  prizeName: string
  prizeRank: number
  prizeImageUrl?: string
  prizeDescription?: string
  won: boolean
  alreadyRegistered?: boolean
}

const DESIGNATIONS = [
  'CEO','COO','CFO','CTO','CMO','President','VP','Director',
  'Engineering Manager','Senior Engineer','Tech Lead','Architect','Manager',
  'Software Engineer','Data Engineer','Data Analyst','Business Analyst','Developer','QA Engineer',
  'Student','Intern','Fresher','Trainee','Graduate','Other',
]

export default function RegisterForm({ event }: Props) {
  const [form, setForm] = useState({ name: '', email: '', designation: '', phone_number: '', company: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RegResult | null>(null)

  const accentColor = event.ui_config?.accentColor || '#f59e0b'

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())         e.name = 'Full name is required'
    if (!form.email.trim())        e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.designation)         e.designation = 'Designation is required'
    if (!form.phone_number.trim()) e.phone_number = 'Phone number is required'
    else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone_number)) e.phone_number = 'Enter a valid phone number'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    // Bubble result up — parent handles stage transition
    // Use custom event for decoupled communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('registration-complete', { detail: result }))
    }
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem' }}>
        <div className="animate-spin-slow" style={{ fontSize: '2rem', marginBottom: '1rem' }}>⭐</div>
        <p style={{ color: 'rgba(248,250,252,0.7)' }}>Loading your game…</p>
      </div>
    )
  }

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: '0.75rem',
    color: '#f8fafc',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: '0.85rem',
    marginBottom: '0.4rem',
    color: 'rgba(248,250,252,0.75)',
  }

  const errorStyle: React.CSSProperties = {
    color: '#f87171',
    fontSize: '0.78rem',
    marginTop: '0.3rem',
    display: 'block',
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>Full Name <span style={{ color: accentColor }}>*</span></label>
        <input
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={{ ...inputStyle, borderColor: errors.name ? '#f87171' : 'rgba(255,255,255,0.15)' }}
        />
        {errors.name && <span style={errorStyle}>{errors.name}</span>}
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Work Email <span style={{ color: accentColor }}>*</span></label>
        <input
          type="email"
          placeholder="john@company.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={{ ...inputStyle, borderColor: errors.email ? '#f87171' : 'rgba(255,255,255,0.15)' }}
        />
        {errors.email && <span style={errorStyle}>{errors.email}</span>}
      </div>

      {/* Designation */}
      <div>
        <label style={labelStyle}>Designation <span style={{ color: accentColor }}>*</span></label>
        <select
          value={form.designation}
          onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
          style={{
            ...inputStyle,
            borderColor: errors.designation ? '#f87171' : 'rgba(255,255,255,0.15)',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.5)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="" disabled style={{ background: '#1e1b4b' }}>Select your designation</option>
          {DESIGNATIONS.map(d => (
            <option key={d} value={d} style={{ background: '#1e1b4b', color: '#f8fafc' }}>{d}</option>
          ))}
        </select>
        {errors.designation && <span style={errorStyle}>{errors.designation}</span>}
      </div>

      {/* Phone */}
      <div>
        <label style={labelStyle}>Phone Number <span style={{ color: accentColor }}>*</span></label>
        <input
          type="tel"
          placeholder="+91 98765 43210"
          value={form.phone_number}
          onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
          style={{ ...inputStyle, borderColor: errors.phone_number ? '#f87171' : 'rgba(255,255,255,0.15)' }}
        />
        {errors.phone_number && <span style={errorStyle}>{errors.phone_number}</span>}
      </div>

      {/* Company (optional) */}
      <div>
        <label style={labelStyle}>Company <span style={{ color: 'rgba(248,250,252,0.35)', fontWeight: 400 }}>(optional)</span></label>
        <input
          type="text"
          placeholder="Your company name"
          value={form.company}
          onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
          style={inputStyle}
        />
      </div>

      {errors.submit && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: '0.75rem',
          color: '#fca5a5',
          fontSize: '0.85rem',
        }}>
          {errors.submit}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ marginTop: '0.5rem', fontSize: '1rem' }}
      >
        {loading ? '⏳ Registering…' : '🎯 Play & Win →'}
      </button>
    </form>
  )
}
