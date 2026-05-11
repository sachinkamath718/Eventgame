import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      prizes,
      designation_rules,
      linkedin_company_url,
      linkedin_share_text
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !event) {
    console.error('[event route] error:', error?.message, '| slug:', slug)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Sort prizes by rank so wheel segments are always in consistent order
  if (Array.isArray(event.prizes)) {
    event.prizes.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)
  }

  return NextResponse.json({ event })
}
