'use client'

import { useEffect, useState, use, Suspense } from 'react'
import EventClient from '@/components/public/EventClient'

interface LuckyEvent {  
  id: string
  name: string
  slug: string
  game_type: string
  is_active?: boolean
  form_fields: Array<{
    formLabel: string
    fieldKey: string
    required: boolean
    fieldType: string
    options: string
  }>
  ui_config: Record<string, string>
  prizes?: Array<{
    id: string; rank: number; name: string; description?: string
    image_url?: string; is_consolation: boolean; is_grand_prize: boolean
    quantity?: number; claimed?: number
  }>
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
  linkedin_company_url?: string
  linkedin_share_text?: string
  booth_number?: string
}

function EventPageInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [event, setEvent] = useState<LuckyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    fetch(`/api/event/${slug}`)
      .then(async r => {
        if (!r.ok) { setFetchError(`Event not found (${r.status})`); return }
        const d = await r.json()
        if (d.event) setEvent(d.event)
        else setFetchError('Event not found')
      })
      .catch(err => setFetchError(err?.message || 'Failed to load event'))
      .finally(() => setLoading(false))
  }, [slug])

  const errMsg = fetchError

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0d0d1f',
      color: '#f8fafc', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
        Loading…
      </div>
    </div>
  )

  if (errMsg || !event) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0d0d1f',
      color: '#f8fafc', fontFamily: 'Inter, sans-serif',
      flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <h2 style={{ margin: 0 }}>Event not found</h2>
      {errMsg && <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.85rem', margin: 0 }}>{errMsg}</p>}
    </div>
  )

  return <EventClient event={event} />
}

// Suspense wrapper ensures use(params) inside EventPageInner doesn't cause blank page
export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0d0d1f',
        color: '#f8fafc', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
          Loading…
        </div>
      </div>
    }>
      <EventPageInner params={params} />
    </Suspense>
  )
}
