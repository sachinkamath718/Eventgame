'use client'

import { useState, useEffect } from 'react'
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

const FIELD_ICONS: Record<string, string> = {
  name: '👤', email: '📧', phone_number: '📱', company: '🏢', designation: '💼',
}

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
  const [visibleFields, setVisibleFields] = useState<number>(0)

  const accent = event.ui_config?.accentColor || '#f59e0b'

  // Stagger field reveal
  useEffect(() => {
    fields.forEach((_, i) => {
      setTimeout(() => setVisibleFields(v => Math.max(v, i + 1)), i * 120)
    })
  }, []) // eslint-disable-line

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
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spinBounce 1s ease infinite' }}>🎰</div>
          <p style={{ color: 'rgba(248,250,252,0.7)', fontWeight: 600 }}>Joining the Grand Prize Draw…</p>
        </div>
      )
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('registration-complete', { detail: result }))
    }
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'starSpin 0.8s ease both' }}>⭐</div>
        <p style={{ color: 'rgba(248,250,252,0.7)', fontWeight: 600 }}>Loading your game…</p>
      </div>
    )
  }

  function renderInput(field: FormField, idx: number) {
    const val = form[field.fieldKey] || ''
    const hasError = !!errors[field.fieldKey]
    const isFocused = focused === field.fieldKey
    const hasValue = val.length > 0
    const icon = FIELD_ICONS[field.fieldKey] || '✏️'

    const borderColor = hasError ? '#f87171' : isFocused ? accent : 'rgba(255,255,255,0.12)'
    const glowColor = hasError ? 'rgba(248,113,113,0.2)' : isFocused ? `${accent}30` : 'transparent'

    const baseInput: React.CSSProperties = {
      width: '100%', padding: '1rem 1rem 0.5rem 2.75rem',
      background: 'rgba(255,255,255,0.06)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: '0.875rem', color: '#f8fafc',
      fontSize: '0.95rem', outline: 'none',
      transition: 'border-color 0.25s, box-shadow 0.25s',
      boxSizing: 'border-box',
      boxShadow: isFocused || hasError ? `0 0 0 4px ${glowColor}` : 'none',
      animation: hasError ? 'shake 0.4s ease' : undefined,
    }

    if (field.fieldKey === 'designation' || field.fieldType === 'select') {
      const opts = field.options
        ? field.options.split(',').map(o => o.trim()).filter(Boolean)
        : field.fieldKey === 'designation' ? DESIGNATIONS : []
      return (
        <div style={{ position: 'relative', opacity: idx < visibleFields ? 1 : 0, transform: idx < visibleFields ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.35s ${idx * 0.05}s, transform 0.35s ${idx * 0.05}s` }}>
          {/* Icon */}
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', zIndex: 2 }}>{icon}</span>
          {/* Floating label */}
          <label style={{
            position: 'absolute', left: '2.75rem',
            top: isFocused || hasValue ? '0.45rem' : '50%',
            transform: isFocused || hasValue ? 'translateY(0) scale(0.8)' : 'translateY(-50%)',
            transformOrigin: 'left center',
            fontSize: isFocused || hasValue ? '0.72rem' : '0.9rem',
            color: isFocused ? accent : hasError ? '#f87171' : 'rgba(248,250,252,0.45)',
            transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
            pointerEvents: 'none', fontWeight: 500,
            zIndex: 2,
          }}>
            {field.formLabel}{field.required ? ' *' : ''}
          </label>
          <select
            value={val}
            onChange={e => setForm(f => ({ ...f, [field.fieldKey]: e.target.value }))}
            onFocus={() => setFocused(field.fieldKey)}
            onBlur={() => setFocused(null)}
            style={{ ...baseInput, appearance: 'none', paddingRight: '2.5rem',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center',
            }}
          >
            <option value="" disabled style={{ background: '#1e1b4b' }}>
              {field.fieldKey === 'designation' ? 'Select your designation' : `Select ${field.formLabel.toLowerCase()}`}
            </option>
            {opts.map(o => <option key={o} value={o} style={{ background: '#1e1b4b', color: '#f8fafc' }}>{o}</option>)}
          </select>
          {errors[field.fieldKey] && (
            <span style={{ display: 'block', color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem', paddingLeft: '0.25rem', animation: 'fadeIn 0.2s ease' }}>
              ⚠ {errors[field.fieldKey]}
            </span>
          )}
        </div>
      )
    }

    return (
      <div style={{ position: 'relative', opacity: idx < visibleFields ? 1 : 0, transform: idx < visibleFields ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.35s ${idx * 0.05}s, transform 0.35s ${idx * 0.05}s` }}>
        {/* Icon */}
        <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', zIndex: 2 }}>{icon}</span>
        {/* Floating label */}
        <label style={{
          position: 'absolute', left: '2.75rem',
          top: isFocused || hasValue ? '0.45rem' : '50%',
          transform: isFocused || hasValue ? 'translateY(0) scale(0.8)' : 'translateY(-50%)',
          transformOrigin: 'left center',
          fontSize: isFocused || hasValue ? '0.72rem' : '0.9rem',
          color: isFocused ? accent : hasError ? '#f87171' : 'rgba(248,250,252,0.45)',
          transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: 'none', fontWeight: 500,
          zIndex: 2,
        }}>
          {field.formLabel}{field.required ? ' *' : ''}
        </label>
        <input
          type={field.fieldType || 'text'}
          value={val}
          onChange={e => setForm(f => ({ ...f, [field.fieldKey]: e.target.value }))}
          onFocus={() => setFocused(field.fieldKey)}
          onBlur={() => setFocused(null)}
          style={baseInput}
        />
        {errors[field.fieldKey] && (
          <span style={{ display: 'block', color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem', paddingLeft: '0.25rem', animation: 'fadeIn 0.2s ease' }}>
            ⚠ {errors[field.fieldKey]}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {fields.map((field, i) => (
          <div key={field.fieldKey}>{renderInput(field, i)}</div>
        ))}

        {errors.submit && (
          <div style={{
            padding: '0.875rem 1rem', background: 'rgba(248,113,113,0.1)',
            border: '1.5px solid rgba(248,113,113,0.35)', borderRadius: '0.875rem',
            color: '#fca5a5', fontSize: '0.875rem',
            animation: 'shake 0.4s ease, fadeIn 0.3s ease',
          }}>
            ⚠️ {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.75rem',
            padding: '1.1rem 1.5rem',
            background: loading
              ? 'rgba(124,58,237,0.4)'
              : `linear-gradient(135deg,${accent} 0%,#d97706 40%,${accent} 100%)`,
            backgroundSize: '200% 100%',
            border: 'none', borderRadius: '1rem',
            color: loading ? 'rgba(255,255,255,0.6)' : '#fff',
            fontWeight: 800, fontSize: '1.05rem', cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            boxShadow: loading ? 'none' : `0 0 30px ${accent}55, 0 4px 20px rgba(0,0,0,0.3)`,
            animation: !loading ? 'shimmer 2.5s linear infinite' : 'none',
            transition: 'transform 0.15s, box-shadow 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin360 0.6s linear infinite' }}>⏳</span>
              Registering…
            </>
          ) : (
            <>🎯 Play &amp; Win →</>
          )}
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%      { transform:translateX(-8px); }
          40%      { transform:translateX(8px); }
          60%      { transform:translateX(-5px); }
          80%      { transform:translateX(5px); }
        }
        @keyframes shimmer {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }
        @keyframes spin360 { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spinBounce {
          0%,100% { transform:rotate(0deg) scale(1); }
          50%      { transform:rotate(15deg) scale(1.1); }
        }
        @keyframes starSpin {
          from { transform:rotate(-180deg) scale(0); opacity:0; }
          to   { transform:rotate(0deg) scale(1); opacity:1; }
        }
      `}</style>
    </>
  )
}
