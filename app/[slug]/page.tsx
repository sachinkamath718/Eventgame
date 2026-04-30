import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EventClient from '@/components/public/EventClient'

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, prizes(*), designation_rules(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!event) notFound()

  return <EventClient event={event} />
}
