import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: registration } = await supabase
    .from('registrations')
    .select('id, prize_name, prize_rank_won, prize_image_url, prize_description, game_result, is_grand_prize_winner, name')
    .eq('id', id)
    .single()

  if (!registration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ registration })
}
