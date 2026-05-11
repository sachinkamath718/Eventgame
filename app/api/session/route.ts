import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx — get active (or most recent) session + participants
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Try active session first, then most recent ended session so admin
  // can see the winner card after a page refresh
  let { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
    // Fall back to the most recent session for this event (so winner persists on refresh)
    const { data: recent } = await supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    session = recent ?? null
  }

  if (!session) return NextResponse.json({ session: null, participants: [] })

  const { data: participants } = await supabase
    .from('registrations')
    .select('id, name, designation, company, created_at')
    .eq('event_id', eventId)
    .gte('created_at', session.started_at)
    .order('created_at', { ascending: false })

  return NextResponse.json({ session, participants: participants ?? [] })
}

// POST — start a new session
export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Deactivate any existing active sessions
  await supabase
    .from('sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('is_active', true)

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      event_id:   eventId,
      is_active:  true,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session })
}

// PUT — pick grand prize winner (marks all others as losers) OR end session
export async function PUT(req: NextRequest) {
  const { sessionId, winnerId, end, grandPrizeName, allParticipantIds } = await req.json()
  const supabase = createServiceClient()

  // ── End session without picking a winner ───────────────────────────────────
  if (end) {
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    return NextResponse.json({ ok: true })
  }

  // ── Pick winner ────────────────────────────────────────────────────────────
  if (!sessionId || !winnerId) {
    return NextResponse.json({ error: 'sessionId and winnerId required' }, { status: 400 })
  }

  const prizeName = grandPrizeName?.trim() || 'Grand Prize'

  // 1. Close the session and record winner
  await supabase
    .from('sessions')
    .update({
      winner_registration_id: winnerId,
      is_active:              false,
      ended_at:               new Date().toISOString(),
    })
    .eq('id', sessionId)

  // 2. Mark winner's registration — set prize name so player screen shows it
  await supabase
    .from('registrations')
    .update({
      is_grand_prize_winner: true,
      game_result:           'won',
      prize_name:            prizeName,
    })
    .eq('id', winnerId)

  // 3. BUG FIX — mark every OTHER participant as lost so their waiting
  //    screen transitions to "Better Luck Next Time" in real time
  const loserIds: string[] = (allParticipantIds ?? []).filter(
    (pid: string) => pid !== winnerId
  )
  if (loserIds.length > 0) {
    await supabase
      .from('registrations')
      .update({ game_result: 'lost' })
      .in('id', loserIds)
  }

  return NextResponse.json({ ok: true, prizeName })
}
