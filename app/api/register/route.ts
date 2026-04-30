import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { determinePrize } from '@/lib/prize-logic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, name, email, designation, phone_number, company, ...extraFields } = body

    // Validate mandatory fields
    if (!eventId || !name || !email || !designation || !phone_number) {
      return NextResponse.json(
        { error: 'name, email, designation, and phone_number are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch event with prizes and rules
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*, prizes(*), designation_rules(*)')
      .eq('id', eventId)
      .eq('is_active', true)
      .single()

    if (evErr || !event) {
      return NextResponse.json({ error: 'Event not found or inactive' }, { status: 404 })
    }

    // Prevent duplicate registration per event
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, prize_name, prize_rank_won, game_result, prize_image_url, prize_description')
      .eq('event_id', eventId)
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({
        registrationId: existing.id,
        prizeName: existing.prize_name,
        prizeRank: existing.prize_rank_won,
        prizeImageUrl: existing.prize_image_url,
        prizeDescription: existing.prize_description,
        won: existing.game_result === 'won',
        alreadyRegistered: true,
      })
    }

    // Determine prize based on designation
    const rules = event.designation_rules || []
    const { prizeRank, won } = determinePrize(designation, rules)

    // Find matching prize from DB
    const prizes: Array<{
      id: string
      rank: number
      name: string
      description?: string
      image_url?: string
      is_consolation: boolean
      is_grand_prize: boolean
    }> = event.prizes || []

    const consolation = prizes.find((p) => p.is_consolation)
    const matchedPrize = won
      ? prizes.find((p) => p.rank === prizeRank && !p.is_consolation && !p.is_grand_prize)
      : consolation

    // Insert registration
    const { data: registration, error: regErr } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        designation: designation.trim(),
        phone_number: phone_number.trim(),
        company: company?.trim() || null,
        form_data: extraFields,
        prize_rank_won: won ? prizeRank : (consolation ? 5 : null),
        prize_id: matchedPrize?.id || null,
        prize_name: matchedPrize?.name || (won ? 'Prize' : 'Better Luck Next Time'),
        prize_description: matchedPrize?.description || null,
        prize_image_url: matchedPrize?.image_url || null,
        game_result: won ? 'won' : 'lost',
      })
      .select()
      .single()

    if (regErr || !registration) {
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    return NextResponse.json({
      registrationId: registration.id,
      prizeName: registration.prize_name,
      prizeRank: registration.prize_rank_won,
      prizeImageUrl: registration.prize_image_url,
      prizeDescription: registration.prize_description,
      won,
      alreadyRegistered: false,
    })
  } catch (e) {
    console.error('[POST /api/register]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
