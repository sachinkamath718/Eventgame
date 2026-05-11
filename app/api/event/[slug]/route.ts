import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public (anon) client — uses RLS, only returns active events
function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      game_type,
      form_fields,
      ui_config,
      linkedin_company_url,
      linkedin_share_text,
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
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Supabase returns related rows unordered — sort prizes by rank so the
  // wheel segments always appear in a consistent order
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)
  }

  return NextResponse.json({ event })
}
