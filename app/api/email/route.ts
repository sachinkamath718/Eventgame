import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    const { registrationId } = await req.json()
    if (!registrationId) return NextResponse.json({ error: 'registrationId required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: reg } = await supabase
      .from('registrations')
      .select('*, events(name, ui_config, linkedin_company_url)')
      .eq('id', registrationId)
      .single()

    if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    if (reg.email_sent) return NextResponse.json({ ok: true, skipped: true })

    const eventName = reg.events?.name || 'Lucky Draw'
    const won = reg.game_result === 'won' || reg.is_grand_prize_winner

    const subject = won
      ? `🎉 Congratulations! You won at ${eventName}!`
      : `Thanks for participating in ${eventName}`

    const html = won
      ? `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0a0a1a;color:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#4338ca);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🎉</div>
            <h1 style="margin:0;font-size:28px;font-weight:900;">Congratulations!</h1>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;line-height:1.6;color:rgba(248,250,252,0.8);">Hi <strong>${reg.name}</strong>,</p>
            <p style="font-size:16px;line-height:1.6;color:rgba(248,250,252,0.8);">
              You won <strong style="color:#f59e0b">${reg.prize_name}</strong> at ${eventName}!
              ${reg.is_grand_prize_winner ? '<br/><span style="color:#fcd34d">🏆 You are the Grand Prize Winner!</span>' : ''}
            </p>
            ${reg.prize_description ? `<p style="color:rgba(248,250,252,0.6);font-size:14px;">${reg.prize_description}</p>` : ''}
            <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
              <p style="margin:0;font-size:14px;color:#fcd34d;">Show this email to our staff to collect your prize.</p>
            </div>
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:rgba(248,250,252,0.4);font-size:12px;">
            ${eventName} — Lucky Draw Platform
          </div>
        </div>`
      : `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0a0a1a;color:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">⭐</div>
            <h1 style="margin:0;font-size:28px;font-weight:900;">Thanks for playing!</h1>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;line-height:1.6;color:rgba(248,250,252,0.8);">Hi <strong>${reg.name}</strong>,</p>
            <p style="font-size:16px;line-height:1.6;color:rgba(248,250,252,0.8);">
              Better luck next time! Thank you for participating in ${eventName}.
              We hope to see you at our future events!
            </p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:rgba(248,250,252,0.4);font-size:12px;">
            ${eventName} — Lucky Draw Platform
          </div>
        </div>`

    if (resend) {
      await resend.emails.send({
        from: 'Lucky Draw <noreply@yourdomain.com>',
        to: reg.email,
        subject,
        html,
      })
    }

    await supabase
      .from('registrations')
      .update({ email_sent: true })
      .eq('id', registrationId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/email]', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
