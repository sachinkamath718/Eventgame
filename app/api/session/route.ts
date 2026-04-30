import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx — get active session + participants
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (!session) return NextResponse.json({ session: null, participants: [] })

  // Get participants who registered after session started
  const { data: participants } = await supabase
    .from('registrations')
    .select('id, name, designation, company, created_at')
    .eq('event_id', eventId)
    .gte('created_at', session.started_at)
    .order('created_at', { ascending: false })

  return NextResponse.json({ session, participants: participants || [] })
}

// POST — start a new session
export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Deactivate any existing active session for this event
  await supabase
    .from('sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('is_active', true)

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      event_id: eventId,
      is_active: true,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session })
}

// PUT — select grand prize winner or end session
export async function PUT(req: NextRequest) {
  const { sessionId, winnerId, end } = await req.json()
  const supabase = createServiceClient()

  if (end) {
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    return NextResponse.json({ ok: true })
  }

  if (!sessionId || !winnerId) {
    return NextResponse.json({ error: 'sessionId and winnerId required' }, { status: 400 })
  }

  // Mark winner in session
  await supabase
    .from('sessions')
    .update({
      winner_registration_id: winnerId,
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  // Mark winner's registration
  await supabase
    .from('registrations')
    .update({ is_grand_prize_winner: true, game_result: 'won' })
    .eq('id', winnerId)

  return NextResponse.json({ ok: true })
}
