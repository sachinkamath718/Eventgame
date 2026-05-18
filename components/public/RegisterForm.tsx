'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

interface FormField { formLabel: string; fieldKey: string; required: boolean; fieldType: string; options: string; enabled?: boolean }
interface LuckyEvent {
  id: string; form_fields?: FormField[]; ui_config?: { accentColor?: string }
  prizes?: Array<{ id: string; rank: number; name: string; description?: string; image_url?: string; is_consolation: boolean; is_grand_prize: boolean }>
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
}
interface RegResult {
  registrationId: string; prizeName: string; prizeRank: number; prizeImageUrl?: string
  prizeDescription?: string; won: boolean; name?: string; isGrandPrizeSession?: boolean
}

const DESIGNATIONS = [
  'CEO','COO','CFO','CTO','CMO','President','VP','Director',
  'Engineering Manager','Senior Engineer','Tech Lead','Architect','Manager',
  'Software Engineer','Data Engineer','Data Analyst','Business Analyst','Developer','QA Engineer',
  'Student','Intern','Fresher','Trainee','Graduate','Other',
]

const DEFAULT_FIELDS: FormField[] = [
  { formLabel: 'Full Name',    fieldKey: 'name',         required: true,  fieldType: 'text',   options: '' },
  { formLabel: 'Work Email',   fieldKey: 'email',        required: true,  fieldType: 'email',  options: '' },
  { formLabel: 'Phone Number', fieldKey: 'phone_number', required: true,  fieldType: 'tel',    options: '' },
  { formLabel: 'Company',      fieldKey: 'company',      required: false, fieldType: 'text',   options: '' },
  { formLabel: 'Designation',  fieldKey: 'designation',  required: true,  fieldType: 'select', options: '' },
]

export default function RegisterForm({ event }: { event: LuckyEvent }) {
  const pathname = usePathname()
  const slug = pathname?.split('/').filter(Boolean)[0] ?? ''

  const fields: FormField[] = (
    event.form_fields && event.form_fields.length > 0 ? event.form_fields : DEFAULT_FIELDS
  ).filter(f => f.enabled !== false)

  const [form, setForm] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map(f => [f.fieldKey, '']))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [focused, setFocused] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RegResult | null>(null)

  const accent = event.ui_config?.accentColor || '#f59e0b'

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    for (const field of fields) {
      const val = (form[field.fieldKey] || '').trim()
      if (field.required && !val) { e[field.fieldKey] = `${field.formLabel} is required`; continue }
      if (!val) continue
      if (field.fieldType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) e[field.fieldKey] = 'Enter a valid email'
      if (field.fieldType === 'tel' && !/^\+?[\d\s\-]{7,15}$/.test(val)) e[field.fieldKey] = 'Enter a valid phone number'
    }
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
        body: JSON.stringify({ event_id: event.id, form_data: form }),
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
    if (result.isGrandPrizeSession) {
      if (typeof window !== 'undefined') window.location.href = `/${slug}/session?regId=${result.registrationId}`
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎰</div>
          <p style={{ color: 'rgba(248,250,252,0.7)', fontWeight: 600 }}>Joining the Live Draw…</p>
        </div>
      )
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('registration-complete', { detail: result }))
    }

    if ((result as any).duplicate) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔄</div>
          <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>You've already played!</p>
          <p style={{ color: 'rgba(248,250,252,0.7)', fontWeight: 500, fontSize: '0.9rem' }}>Loading your original result…</p>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⭐</div>
        <p style={{ color: 'rgba(248,250,252,0.7)', fontWeight: 600 }}>Loading your game…</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: '0.75rem',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 500,
    fontSize: '0.8rem',
    marginBottom: '0.35rem',
    color: 'rgba(248,250,252,0.6)',
    letterSpacing: '0.01em',
  }

  function renderInput(field: FormField) {
    const val = form[field.fieldKey] || ''
    const hasError = !!errors[field.fieldKey]
    const isFocused = focused === field.fieldKey
    const borderColor = hasError ? '#f87171' : isFocused ? accent : 'rgba(255,255,255,0.15)'
    const shadow = isFocused ? `0 0 0 3px ${accent}28` : hasError ? '0 0 0 3px rgba(248,113,113,0.2)' : 'none'

    if (field.fieldKey === 'designation' || field.fieldType === 'select') {
      const opts = field.options
        ? field.options.split(',').map(o => o.trim()).filter(Boolean)
        : field.fieldKey === 'designation' ? DESIGNATIONS : []
      return (
        <select
          value={val}
          onChange={e => setForm(f => ({ ...f, [field.fieldKey]: e.target.value }))}
          onFocus={() => setFocused(field.fieldKey)}
          onBlur={() => setFocused(null)}
          style={{
            ...inputStyle, borderColor, boxShadow: shadow,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="" disabled style={{ background: '#1e1b4b' }}>
            {field.fieldKey === 'designation' ? 'Select your designation' : `Select ${field.formLabel.toLowerCase()}`}
          </option>
          {opts.map(o => <option key={o} value={o} style={{ background: '#1e1b4b', color: '#f8fafc' }}>{o}</option>)}
        </select>
      )
    }

    return (
      <input
        type={field.fieldType || 'text'}
        placeholder={field.formLabel}
        value={val}
        onChange={e => setForm(f => ({ ...f, [field.fieldKey]: e.target.value }))}
        onFocus={() => setFocused(field.fieldKey)}
        onBlur={() => setFocused(null)}
        style={{ ...inputStyle, borderColor, boxShadow: shadow }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {fields.map(field => (
        <div key={field.fieldKey}>
          <label style={labelStyle}>
            {field.formLabel}
            {field.required
              ? <span style={{ color: accent, marginLeft: '0.25rem' }}>*</span>
              : <span style={{ color: 'rgba(248,250,252,0.3)', fontWeight: 400, marginLeft: '0.3rem', fontSize: '0.74rem' }}>(optional)</span>
            }
          </label>
          {renderInput(field)}
          {errors[field.fieldKey] && (
            <span style={{ display: 'block', color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem' }}>
              {errors[field.fieldKey]}
            </span>
          )}
        </div>
      ))}

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
        style={{
          marginTop: '0.25rem',
          padding: '0.95rem 1.5rem',
          background: loading ? 'rgba(124,58,237,0.35)' : `linear-gradient(135deg,${accent},#d97706)`,
          border: 'none',
          borderRadius: '0.875rem',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : `0 0 24px ${accent}44`,
          transition: 'transform 0.15s, box-shadow 0.2s',
          width: '100%',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
      >
        {loading ? 'Registering…' : 'Play & Win →'}
      </button>
    </form>
  )
}
