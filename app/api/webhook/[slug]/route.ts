import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { assignPrize } from '@/lib/prize-logic'

// POST /api/webhook/[slug]
// Called by Google Apps Script on every form submission
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const secret = req.headers.get('x-webhook-secret')
    const body = await req.json()

    const supabase = createServiceClient()

    // Fetch event + its field mapping
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*, prizes(*), designation_rules(*)')
      .eq('slug', slug)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Validate webhook secret
    if (event.webhook_secret && secret !== event.webhook_secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Map form labels → our field keys using event.form_fields mapping
    // body.responses = { "Full Name": "John Doe", "Work Email": "john@acme.com", ... }
    const responses: Record<string, string> = body.responses || body

    const fieldMappings: Array<{ formLabel: string; fieldKey: string }> =
      event.form_fields || []

    const mapped: Record<string, string> = {}
    for (const mapping of fieldMappings) {
      const value = responses[mapping.formLabel] || responses[mapping.fieldKey] || ''
      mapped[mapping.fieldKey] = value
    }

    const name        = mapped['name']        || body.name        || 'Unknown'
    const email       = mapped['email']       || body.email       || ''
    const designation = mapped['designation'] || body.designation || 'Unknown'
    const phone       = mapped['phone_number']|| body.phone_number|| ''
    const company     = mapped['company']     || body.company     || ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check for duplicate (same email + event)
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', event.id)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, registrationId: existing.id })
    }

    // Assign prize based on designation rules
    const prizeResult = assignPrize(designation, event.designation_rules || [], event.prizes || [])

    // Store all extra fields in form_data JSONB
    const form_data: Record<string, string> = {}
    for (const [k, v] of Object.entries(responses)) {
      form_data[k] = v
    }

    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .insert({
        event_id:         event.id,
        name,
        email:            email.toLowerCase().trim(),
        designation,
        phone_number:     phone,
        company,
        form_data,
        prize_rank_won:   prizeResult?.rank ?? null,
        prize_id:         prizeResult?.id   ?? null,
        prize_name:       prizeResult?.name ?? null,
        prize_description:prizeResult?.description ?? null,
        prize_image_url:  prizeResult?.image_url ?? null,
        game_result:      prizeResult ? 'won' : 'lost',
      })
      .select()
      .single()

    if (regErr) {
      console.error('[webhook] insert error', regErr)
      return NextResponse.json({ error: 'Failed to save registration' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, registrationId: reg.id })
  } catch (e) {
    console.error('[webhook] error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
