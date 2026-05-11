'use client'

import { useEffect, useState, use } from 'react'
import EventClient from '@/components/public/EventClient'

interface LuckyEvent {  
  id: string
  name: string
  slug: string
  game_type: string
  form_fields: unknown[]
  ui_config: Record<string, string>
  prizes?: Array<{
    id: string; rank: number; name: string; description?: string
    image_url?: string; is_consolation: boolean; is_grand_prize: boolean
  }>
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
  linkedin_company_url?: string
  linkedin_share_text?: string
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [event, setEvent] = useState<LuckyEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/event/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.event) setEvent(d.event) })
      .finally(() => setLoading(false))
  }, [slug])

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

  if (!event) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0d0d1f',
      color: '#f8fafc', fontFamily: 'Inter, sans-serif',
      flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <h2>Event not found</h2>
    </div>
  )

  return <EventClient event={event} />
}
