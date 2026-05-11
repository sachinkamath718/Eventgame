import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')       // fetch everything — we'll filter sensitive fields out below
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !event) {
    console.error('[event route] supabase error:', error?.message, '| slug:', slug)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Sort prizes by rank if the column exists and is an array
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)
  }

  // Strip server-only fields before sending to the client
  const { webhook_secret, ...safeEvent } = event

  return NextResponse.json({ event: safeEvent })
}
