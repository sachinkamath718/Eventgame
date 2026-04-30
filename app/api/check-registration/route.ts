import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/check-registration?email=...&slug=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  const slug  = searchParams.get('slug')

  if (!email || !slug) {
    return NextResponse.json({ error: 'email and slug are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!event) return NextResponse.json({ found: false })

  const { data: reg } = await supabase
    .from('registrations')
    .select('id, name, prize_name, prize_description, prize_image_url, game_result, prize_rank_won, is_grand_prize_winner')
    .eq('event_id', event.id)
    .eq('email', email)
    .maybeSingle()

  if (!reg) return NextResponse.json({ found: false })

  return NextResponse.json({ found: true, registration: reg })
}
