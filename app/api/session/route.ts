import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Prefer active session first
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

  // Only fetch participants who registered DURING this session window
  const { data: participants } = await supabase
    .from('registrations')
    .select('id, name, designation, company, created_at')
    .eq('event_id', eventId)
    .gte('created_at', session.started_at)
    .order('created_at', { ascending: false })

  return NextResponse.json({ session, participants: participants ?? [] })
}

// POST — start session (NO event locking)
export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Close any existing active sessions for this event
  await supabase
    .from('sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('is_active', true)

  // ── DO NOT lock the event — registrations stay open during session ──

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

// PUT — pick winner OR end without winner
export async function PUT(req: NextRequest) {
  const { sessionId, winnerId, end, grandPrizeName, allParticipantIds, eventId } = await req.json()
  const supabase = createServiceClient()

  // ── End without picking a winner ──────────────────────────────────────────
  if (end) {
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    // No need to touch is_active on the event — it was never locked
    return NextResponse.json({ ok: true })
  }

  // ── Pick winner ────────────────────────────────────────────────────────────
  if (!sessionId || !winnerId) {
    return NextResponse.json({ error: 'sessionId and winnerId required' }, { status: 400 })
  }

  const prizeName = grandPrizeName?.trim() || 'Grand Prize'

  // Fetch the grand prize row so we can attach prize_id
  let grandPrizeId: string | null = null
  if (eventId) {
    const { data: gp } = await supabase
      .from('prizes')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_grand_prize', true)
      .limit(1)
      .maybeSingle()

    if (!gp) {
      // Fallback: find by rank 1 if is_grand_prize flag wasn't set
      const { data: rank1 } = await supabase
        .from('prizes')
        .select('id')
        .eq('event_id', eventId)
        .eq('rank', 1)
        .limit(1)
        .maybeSingle()
      grandPrizeId = rank1?.id ?? null
    } else {
      grandPrizeId = gp.id
    }
  }

  // Close session + record winner
  await supabase
    .from('sessions')
    .update({
      winner_registration_id: winnerId,
      is_active:              false,
      ended_at:               new Date().toISOString(),
    })
    .eq('id', sessionId)

  // Update winner registration — realtime fires to their SpinWheelGame
  await supabase
    .from('registrations')
    .update({
      is_grand_prize_winner: true,
      game_result:           'won',
      prize_name:            prizeName,
      prize_rank_won:        1,
      ...(grandPrizeId ? { prize_id: grandPrizeId } : {}),
    })
    .eq('id', winnerId)

  // Mark all non-winners as lost — only if not already resolved
  const loserIds: string[] = (allParticipantIds ?? []).filter(
    (pid: string) => pid !== winnerId
  )
  if (loserIds.length > 0) {
    await supabase
      .from('registrations')
      .update({ game_result: 'lost' })
      .in('id', loserIds)
      .is('game_result', null)
  }

  return NextResponse.json({ ok: true, prizeName })
}
