import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/** Admin CRUD for events */
export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('events')
    .select('*, prizes(*), designation_rules(*)')
    .order('created_at', { ascending: false })
  return NextResponse.json({ events: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServiceClient()

  const { prizes, designation_rules, ...eventData } = body

  // Ensure slug is unique — append -2, -3, etc. if needed
  let finalSlug = eventData.slug as string
  let attempt   = 0
  while (true) {
    const { data: existing } = await supabase
      .from('events').select('id').eq('slug', finalSlug).maybeSingle()
    if (!existing) break
    attempt++
    finalSlug = `${eventData.slug}-${attempt + 1}`
  }
  eventData.slug = finalSlug

  // Create event
  const { data: event, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Insert prizes
  if (prizes?.length) {
    await supabase.from('prizes').insert(
      prizes.map((p: Record<string, unknown>) => ({ ...p, event_id: event.id }))
    )
  }

  // Insert designation rules
  if (designation_rules?.length) {
    await supabase.from('designation_rules').insert(
      designation_rules.map((r: Record<string, unknown>) => ({ ...r, event_id: event.id }))
    )
  }

  return NextResponse.json({ event })
}


export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, prizes, designation_rules, ...eventData } = body
  const supabase = createServiceClient()

  await supabase.from('events').update(eventData).eq('id', id)

  if (prizes) {
    if (prizes.length) {
      await supabase.from('prizes').upsert(prizes.map((p: Record<string, unknown>) => ({ ...p, event_id: id })))
    }
  }

  if (designation_rules) {
    if (designation_rules.length) {
      await supabase.from('designation_rules').upsert(
        designation_rules.map((r: Record<string, unknown>) => ({ ...r, event_id: id }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const supabase = createServiceClient()
  await supabase.from('events').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
