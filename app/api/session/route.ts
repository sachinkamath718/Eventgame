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

// POST — start session
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

// PATCH — manually add a participant during a live session
export async function PATCH(req: NextRequest) {
  const { eventId, name } = await req.json()
  if (!eventId || !name?.trim()) {
    return NextResponse.json({ error: 'eventId and name required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: participant, error } = await supabase
    .from('registrations')
    .insert({
      event_id:     eventId,
      name:         name.trim(),
      designation:  '',
      company:      '',
      email:        `manual-${Date.now()}@session.local`,
      phone_number: '',
      game_result:  null, // session will resolve this
    })
    .select('id, name, designation, company, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participant })
}

// PUT — pick winner OR end without winner
export async function PUT(req: NextRequest) {
  const { sessionId, winnerId, end, grandPrizeName, allParticipantIds, eventId } = await req.json()
  const supabase = createServiceClient()

  // ── End without picking a winner ──────────────────────────────────────────
  if (end) {
    // Mark all unresolved session participants as lost
    if (eventId && sessionId) {
      // Get session start time so we only touch session participants
      const { data: sess } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single()

      if (sess) {
        await supabase
          .from('registrations')
          .update({ game_result: 'lost' })
          .eq('event_id', eventId)
          .gte('created_at', sess.started_at)
          .is('game_result', null)
      }
    }

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

  // ── Look up grand prize row for this event ────────────────────────────────
  let grandPrizeId:          string | null = null
  let grandPrizeDescription: string | null = null
  let grandPrizeImageUrl:    string | null = null

  if (eventId) {
    const { data: prizes } = await supabase
      .from('prizes')
      .select('id, rank, name, description, image_url, is_grand_prize')
      .eq('event_id', eventId)
      .order('rank', { ascending: true })

    if (prizes?.length) {
      const gp =
        prizes.find(p => p.is_grand_prize) ??
        prizes.find(p => p.rank === 1)     ??
        null

      if (gp) {
        grandPrizeId          = gp.id
        grandPrizeDescription = gp.description ?? null
        grandPrizeImageUrl    = gp.image_url   ?? null
      }
    }
  }

  // ── Close session + record winner ─────────────────────────────────────────
  await supabase
    .from('sessions')
    .update({
      winner_registration_id: winnerId,
      is_active:              false,
      ended_at:               new Date().toISOString(),
    })
    .eq('id', sessionId)

  // ── Mark winner with grand prize ──────────────────────────────────────────
  await supabase
    .from('registrations')
    .update({
      is_grand_prize_winner: true,
      game_result:           'won',
      prize_name:            prizeName,
      prize_rank_won:        1,
      prize_description:     grandPrizeDescription,
      prize_image_url:       grandPrizeImageUrl,
      ...(grandPrizeId ? { prize_id: grandPrizeId } : {}),
    })
    .eq('id', winnerId)

  // ── Mark ALL non-winners as lost — remove the null guard so session
  //    participants who got game_result from the spin wheel are also overwritten
  const loserIds: string[] = (allParticipantIds ?? []).filter(
    (pid: string) => pid !== winnerId
  )
  if (loserIds.length > 0) {
    await supabase
      .from('registrations')
      .update({ game_result: 'lost', prize_name: 'Better Luck Next Time', prize_rank_won: null })
      .in('id', loserIds)
  }

  return NextResponse.json({ ok: true, prizeName })
}
