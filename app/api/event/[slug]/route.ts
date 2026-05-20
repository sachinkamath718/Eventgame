/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Try full select (includes optional new columns)
  const full = await supabase
    .from('events')
    .select(`
      id, name, slug, game_type, is_active, form_fields, ui_config,
      booth_number, linkedin_company_url, linkedin_share_text,
      prizes (
        id, rank, name, description, image_url, quantity,
        is_consolation, is_grand_prize
      ),
      designation_rules ( designations, prize_rank, win_probability )
    `)
    .eq('slug', slug)
    .single()

  let event: any = full.data
  let fetchError: any = full.error

  // Fallback: if new columns don't exist yet, retry with minimal select
  if (fetchError) {
    console.warn('[event route] full select failed, using fallback:', fetchError.message)
    const minimal = await supabase
      .from('events')
      .select(`
        id, name, slug, game_type, is_active, form_fields, ui_config,
        prizes ( id, rank, name, description, image_url, is_consolation, is_grand_prize ),
        designation_rules ( designations, prize_rank, win_probability )
      `)
      .eq('slug', slug)
      .single()

    event      = minimal.data as any
    fetchError = minimal.error
  }

  if (fetchError || !event) {
    console.error('[event route] fatal:', fetchError?.message, '| slug:', slug)
    return NextResponse.json(
      { error: 'Event not found', detail: fetchError?.message },
      { status: 404 }
    )
  }

  // Sort prizes by rank
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: any, b: any) => a.rank - b.rank)
  }

  // ── Hydrate real-time claimed counts ─────────────────────────────────────
  // Use prize_rank_won (always stored) rather than prize_id (new column, may not exist)
  // so that stock enforcement works even before DB migrations are run.
  if (Array.isArray(event.prizes) && event.prizes.length > 0) {
    const { data: claimedRows } = await supabase
      .from('registrations')
      .select('prize_rank_won')
      .eq('event_id', event.id)
      .eq('game_result', 'won')
      .not('prize_rank_won', 'is', null)

    // Build rank → claimed count map
    const rankClaimedMap: Record<number, number> = {}
    for (const row of claimedRows ?? []) {
      if (row.prize_rank_won != null) {
        rankClaimedMap[row.prize_rank_won] = (rankClaimedMap[row.prize_rank_won] ?? 0) + 1
      }
    }

    // Attach claimed count to each prize using its rank
    event.prizes = event.prizes.map((p: any) => ({
      ...p,
      claimed: rankClaimedMap[p.rank] ?? 0,
    }))
  }

  return NextResponse.json({ event })
}
