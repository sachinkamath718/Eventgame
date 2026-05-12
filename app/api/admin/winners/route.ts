import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx          — list all prize winners
// GET ?eventId=xxx&all=true — list ALL registrations (for CSV export)
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  const all     = req.nextUrl.searchParams.get('all') === 'true'

  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  let query = supabase
    .from('registrations')
    .select('id, name, email, designation, company, prize_name, prize_rank_won, prize_image_url, prize_handed_out, is_grand_prize_winner, game_result, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  // Without `all`, only return winners
  if (!all) {
    query = query.eq('game_result', 'won')
  }

  const { data: winners, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ winners: winners ?? [] })
}

// PATCH — mark a prize as handed out / un-handed out
export async function PATCH(req: NextRequest) {
  const { registrationId, handed_out } = await req.json()
  if (!registrationId) return NextResponse.json({ error: 'registrationId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('registrations')
    .update({ prize_handed_out: handed_out ?? true })
    .eq('id', registrationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
