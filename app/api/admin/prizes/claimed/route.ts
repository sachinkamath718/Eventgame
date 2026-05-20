import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/admin/prizes/claimed?eventId=xxx
// Returns a map of prize_rank -> claimed count for use in the Prizes tab
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Count won registrations grouped by prize_rank_won
  const { data: rows } = await supabase
    .from('registrations')
    .select('prize_rank_won')
    .eq('event_id', eventId)
    .eq('game_result', 'won')
    .not('prize_rank_won', 'is', null)

  const claimedByRank: Record<number, number> = {}
  for (const row of rows ?? []) {
    if (row.prize_rank_won != null) {
      claimedByRank[row.prize_rank_won] = (claimedByRank[row.prize_rank_won] ?? 0) + 1
    }
  }

  return NextResponse.json({ claimedByRank })
}
