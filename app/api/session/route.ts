import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  let { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
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

// POST — start session + lock event
export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Close any existing active sessions
  await supabase
    .from('sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('is_active', true)

  // Lock the event — blocks new registrations while session is live
  await supabase
    .from('events')
    .update({ is_active: false })
    .eq('id', eventId)

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

// PUT — pick winner (event stays locked) OR end without winner (unlocks event)
export async function PUT(req: NextRequest) {
  const { sessionId, winnerId, end, grandPrizeName, allParticipantIds, eventId } = await req.json()
  const supabase = createServiceClient()

  // ── End without picking a winner — re-open the event ──────────────────────
  if (end) {
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (eventId) {
      await supabase
        .from('events')
        .update({ is_active: true })
        .eq('id', eventId)
    }

    return NextResponse.json({ ok: true })
  }

  // ── Pick winner — event stays locked after ─────────────────────────────────
  if (!sessionId || !winnerId) {
    return NextResponse.json({ error: 'sessionId and winnerId required' }, { status: 400 })
  }

  const prizeName = grandPrizeName?.trim() || 'Grand Prize'

  // 1. Close session + record winner
  await supabase
    .from('sessions')
    .update({
      winner_registration_id: winnerId,
      is_active:              false,
      ended_at:               new Date().toISOString(),
    })
    .eq('id', sessionId)

  // 2. Update winner row — Supabase realtime fires to their SpinWheelGame
  //    → game_result='won' + prize_rank_won=1 → wheel stops on grand prize segment
  await supabase
    .from('registrations')
    .update({
      is_grand_prize_winner: true,
      game_result:           'won',
      prize_name:            prizeName,
      prize_rank_won:        1,
    })
    .eq('id', winnerId)

  // 3. Mark all others as lost — realtime fires → their wheels stop on consolation
  const loserIds: string[] = (allParticipantIds ?? []).filter(
    (pid: string) => pid !== winnerId
  )
  if (loserIds.length > 0) {
    await supabase
      .from('registrations')
      .update({ game_result: 'lost' })
      .in('id', loserIds)
  }

  // Event stays locked (is_active=false) — admin re-opens from the edit page toggle

  return NextResponse.json({ ok: true, prizeName })
}
