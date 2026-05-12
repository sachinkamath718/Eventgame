import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServiceClient()

  // FIX: removed .eq('is_active', true) — events locked during a grand prize session
  // (is_active=false) must still be fetchable so participants can see the waiting screen.
  // The register API handles the lock by returning 423 when is_active=false.
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      game_type,
      is_active,
      form_fields,
      ui_config,
      prizes (
        id,
        rank,
        name,
        description,
        image_url,
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

  if (error || !event) {
    console.error('[event route] supabase error:', error?.message, '| code:', error?.code, '| slug:', slug)
    return NextResponse.json({ error: 'Event not found', detail: error?.message }, { status: 404 })
  }

  // Sort prizes by rank so wheel segments are always in consistent order
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)
  }

  return NextResponse.json({ event })
}
