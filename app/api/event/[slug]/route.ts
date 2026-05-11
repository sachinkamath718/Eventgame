import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      game_type,
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
    .eq('is_active', true)
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
