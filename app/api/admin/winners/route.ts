import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET ?eventId=xxx — list all winners for an event
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: winners, error } = await supabase
    .from('registrations')
    .select('id, name, designation, company, email, prize_name, prize_rank_won, prize_image_url, prize_handed_out, is_grand_prize_winner, created_at')
    .eq('event_id', eventId)
    .eq('game_result', 'won')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ winners: winners ?? [] })
}

// PATCH — mark a prize as handed out
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
