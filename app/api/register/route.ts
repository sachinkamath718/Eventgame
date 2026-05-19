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

    // ── Read form values ──────────────────────────────────────────────────────
    const get = (key: string): string => (form_data[key] || '').toString().trim()

    const name        = get('name')        || 'Unknown'
    const email       = get('email').toLowerCase()
    const designation = get('designation') || 'Unknown'
    const phone       = get('phone_number')
    const company     = get('company')

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    // ── Check if a grand prize session is currently active ────────────────────
    // Must happen BEFORE the duplicate check: during a live session every
    // participant is allowed to register fresh — the session resolves prizes.
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id, started_at')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .maybeSingle()

    const isGrandPrizeSession = !!activeSession

    if (isGrandPrizeSession) {
      // During a live session allow the same email to re-enter — each session
      // is an independent draw. Insert with no prize info; session PUT resolves.
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .insert({
          event_id,
          name,
          email,
          designation,
          phone_number: phone,
          company,
          form_data,
          // intentionally null — session resolves these
          prize_rank_won:    null,
          prize_id:          null,
          prize_name:        null,
          prize_description: null,
          prize_image_url:   null,
          game_result:       null,
        })
        .select()
        .single()

      if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

      return NextResponse.json({
        registrationId:   reg.id,
        prizeName:        'Grand Prize Draw',
        prizeRank:        0,
        prizeImageUrl:    undefined,
        prizeDescription: undefined,
        won:              false,
        name:             reg.name,
        isGrandPrizeSession: true,
      })
    }

    // ── Duplicate check (normal / non-session path only) ─────────────────────
    const [emailCheck, nameCheck] = await Promise.all([
      supabase
        .from('registrations')
        .select('id, prize_name, prize_rank_won, prize_image_url, prize_description, game_result, name')
        .eq('event_id', event_id)
        .eq('email', email)
        .limit(1),
      supabase
        .from('registrations')
        .select('id, prize_name, prize_rank_won, prize_image_url, prize_description, game_result, name')
        .eq('event_id', event_id)
        .ilike('name', name)
        .limit(1)
    ])

    const existing = emailCheck.data?.[0] || nameCheck.data?.[0]

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

    // ── Normal path: assign prize immediately ─────────────────────────────────

    // Always exclude grand prizes from spin wheel path
    const allPrizes      = event.prizes || []
    const eligiblePrizes = allPrizes.filter(
      (p: { is_grand_prize?: boolean }) => !p.is_grand_prize
    )

    // Count claimed prizes for stock check
    const prizeIds = eligiblePrizes
      .filter((p: { is_consolation?: boolean; quantity?: number }) =>
        !p.is_consolation && p.quantity != null
      )
      .map((p: { id: string }) => p.id)

    let claimedMap: Record<string, number> = {}

    if (prizeIds.length > 0) {
      const { data: claimedRows } = await supabase
        .from('registrations')
        .select('prize_id')
        .eq('event_id', event_id)
        .eq('game_result', 'won')
        .in('prize_id', prizeIds)

      for (const row of claimedRows ?? []) {
        if (row.prize_id) {
          claimedMap[row.prize_id] = (claimedMap[row.prize_id] ?? 0) + 1
        }
      }
    }

    const prizesWithStock = eligiblePrizes.map(
      (p: { id: string; quantity?: number }) => ({
        ...p,
        claimed: claimedMap[p.id] ?? 0,
      })
    )

    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'ymail.com']
    const emailDomain = email.split('@')[1] || ''
    const isGenericEmail = genericDomains.includes(emailDomain)

    let prize: any = null
    let won = false

    if (isGenericEmail) {
      // 90% chance to lose, 10% chance to win for generic emails
      won = Math.random() * 100 < 10
      const consolation = prizesWithStock.find((p: any) => p.is_consolation) ?? null
      
      if (won) {
        // Assign the lowest rank available non-consolation prize
        prize = prizesWithStock
          .filter((p: any) => !p.is_grand_prize && !p.is_consolation && (p.quantity == null || p.claimed < p.quantity))
          .sort((a: any, b: any) => b.rank - a.rank)[0]
        
        // If no non-consolation prize is available, fallback to loss
        if (!prize) {
          won = false
          prize = consolation
        }
      } else {
        prize = consolation
      }
    } else {
      // Normal designation-based logic for work emails
      const result = assignPrize(
        designation,
        event.designation_rules || [],
        prizesWithStock,
      )
      prize = result.prize
      won = result.won
    }

    // Save registration
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .insert({
        event_id,
        name,
        email,
        designation,
        phone_number:      phone,
        company,
        form_data,
        prize_rank_won:    prize?.rank        ?? null,
        prize_id:          prize?.id          ?? null,
        prize_name:        prize?.name        ?? null,
        prize_description: prize?.description ?? null,
        prize_image_url:   prize?.image_url   ?? null,
        game_result:       won ? 'won' : 'lost',
      })
      .select()
      .single()

    if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

    // Import the email utility dynamically or at the top
    const { sendResultEmail } = await import('@/lib/email')
    
    // Trigger email asynchronously so user doesn't wait
    sendResultEmail(
      email,
      name || 'Participant',
      event.name || 'Lucky Draw',
      won,
      prize?.name || 'Better luck next time'
    ).catch(err => console.error('Failed to trigger email:', err))

    return NextResponse.json({
      registrationId:   reg.id,
      prizeName:        reg.prize_name        ?? 'Thanks for playing!',
      prizeRank:        reg.prize_rank_won    ?? 0,
      prizeImageUrl:    reg.prize_image_url   ?? undefined,
      prizeDescription: reg.prize_description ?? undefined,
      won,
      name:             reg.name,
    })

  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
