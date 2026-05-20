import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Try full select (includes optional new columns)
  let { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      game_type,
      is_active,
      form_fields,
      ui_config,
      booth_number,
      linkedin_company_url,
      linkedin_share_text,
      prizes (
        id,
        rank,
        name,
        description,
        image_url,
        quantity,
        is_consolation,
        is_grand_prize
      ),
      designation_rules (
        designations,
        prize_rank,
        win_probability
      )
    `)
    .eq('slug', slug)
    .single()

  // Fallback: if new columns don't exist yet, retry with minimal select
  if (error) {
    console.warn('[event route] full select failed, retrying with fallback:', error.message)
    const fallback = await supabase
      .from('events')
      .select(`
        id, name, slug, game_type, is_active, form_fields, ui_config,
        prizes ( id, rank, name, description, image_url, is_consolation, is_grand_prize ),
        designation_rules ( designations, prize_rank, win_probability )
      `)
      .eq('slug', slug)
      .single()
    event = fallback.data
    error = fallback.error
  }

  if (error || !event) {
    console.error('[event route] fatal:', error?.message, '| slug:', slug)
    return NextResponse.json({ error: 'Event not found', detail: error?.message }, { status: 404 })
  }

  // Sort prizes by rank
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)
  }

  // ── Hydrate real-time claimed counts for each prize ──────────────────────
  // This lets the wheel filter out prizes that are genuinely out of stock
  const prizeIds = (event.prizes as Array<{ id: string; is_consolation: boolean; quantity?: number }> | null)
    ?.filter(p => !p.is_consolation && p.quantity != null)
    .map(p => p.id) ?? []

  let claimedMap: Record<string, number> = {}
  if (prizeIds.length > 0) {
    const { data: claimedRows } = await supabase
      .from('registrations')
      .select('prize_id')
      .eq('event_id', event.id)
      .eq('game_result', 'won')
      .in('prize_id', prizeIds)

    for (const row of claimedRows ?? []) {
      if (row.prize_id) {
        claimedMap[row.prize_id] = (claimedMap[row.prize_id] ?? 0) + 1
      }
    }
  }

  // Attach claimed count to each prize
  if (Array.isArray(event.prizes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(event as any).prizes = (event.prizes as any[]).map((p) => ({
      ...p,
      claimed: claimedMap[p.id] ?? 0,
    }))
  }

  return NextResponse.json({ event })
}
