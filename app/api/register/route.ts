import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { assignPrize } from '@/lib/prize-logic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_id, form_data } = body

    if (!event_id || !form_data) {
      return NextResponse.json({ error: 'event_id and form_data required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: event } = await supabase
      .from('events')
      .select('*, prizes(*), designation_rules(*), form_fields')
      .eq('id', event_id)
      .single()

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const mappings: Array<{ fieldKey: string; formLabel: string }> = event.form_fields || []
    const getValue = (key: string) => {
      const m = mappings.find(x => x.fieldKey === key)
      return m ? (form_data[m.formLabel] || form_data[key] || '') : (form_data[key] || '')
    }

    const name        = getValue('name')         || 'Unknown'
    const email       = (getValue('email') || '').toLowerCase().trim()
    const designation = getValue('designation')  || 'Unknown'
    const phone       = getValue('phone_number') || ''
    const company     = getValue('company')      || ''

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('registrations')
      .select('id, prize_name, prize_rank_won, prize_image_url, prize_description, game_result, name')
      .eq('event_id', event_id)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        registrationId:   existing.id,
        prizeName:        existing.prize_name        ?? 'Thanks for playing!',
        prizeRank:        existing.prize_rank_won    ?? 0,
        prizeImageUrl:    existing.prize_image_url   ?? undefined,
        prizeDescription: existing.prize_description ?? undefined,
        won:              existing.game_result === 'won',
        name:             existing.name,
        duplicate:        true,
      })
    }

    // FIX: use { prize, won } — won is the actual dice roll result
    const { prize, won } = assignPrize(designation, event.designation_rules || [], event.prizes || [])

    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .insert({
        event_id, name, email, designation,
        phone_number: phone, company,
        form_data,
        prize_rank_won:    prize?.rank         ?? null,
        prize_id:          prize?.id           ?? null,
        prize_name:        prize?.name         ?? null,
        prize_description: prize?.description  ?? null,
        prize_image_url:   prize?.image_url    ?? null,
        game_result:       won ? 'won' : 'lost',
      })
      .select()
      .single()

    if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

    return NextResponse.json({
      registrationId:   reg.id,
      prizeName:        reg.prize_name        ?? 'Thanks for playing!',
      prizeRank:        reg.prize_rank_won    ?? 0,
      prizeImageUrl:    reg.prize_image_url   ?? undefined,
      prizeDescription: reg.prize_description ?? undefined,
      won:              won,
      name:             reg.name,
    })

  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
