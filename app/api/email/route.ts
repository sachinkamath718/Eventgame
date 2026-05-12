import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Use your verified Resend domain. Until verified, Resend allows: onboarding@resend.dev
// Once you verify your domain in Resend dashboard, change this to e.g. noreply@zeliot.in
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Zeliot Events <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  try {
    const { registrationId } = await req.json()
    if (!registrationId) return NextResponse.json({ error: 'registrationId required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: reg } = await supabase
      .from('registrations')
      .select('*, events(name, slug, ui_config, linkedin_company_url)')
      .eq('id', registrationId)
      .single()

    if (!reg)           return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    if (reg.email_sent) return NextResponse.json({ ok: true, skipped: true })
    if (!reg.email)     return NextResponse.json({ error: 'No email on registration' }, { status: 400 })

    const eventName  = reg.events?.name || 'Zeliot Event'
    const isWinner   = reg.game_result === 'won' || reg.is_grand_prize_winner
    const firstName  = (reg.name || 'there').split(' ')[0]
    const refCode    = registrationId.slice(0, 8).toUpperCase()
    const zeliotUrl  = 'https://www.linkedin.com/company/realzeliot/posts/?feedView=all'

    const subject = isWinner
      ? `🎉 Congratulations ${firstName}! You won at ${eventName}`
      : `Thanks for playing at ${eventName} — Better luck next time!`

    const html = isWinner
      ? `
        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a1a;color:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed 0%,#4338ca 100%);padding:40px 32px;text-align:center;">
            <div style="font-size:52px;margin-bottom:12px;">🎉</div>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;">Congratulations, ${firstName}!</h1>
            <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.75);">You're a winner at ${eventName}</p>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;line-height:1.7;color:rgba(248,250,252,0.85);margin:0 0 16px;">
              You have won <strong style="color:#f59e0b;">${reg.prize_name || 'a prize'}</strong> 🎁
              ${reg.is_grand_prize_winner ? '<br/><span style="color:#fcd34d;">🏆 You are the Grand Prize Winner!</span>' : ''}
            </p>
            ${reg.prize_description ? `<p style="color:rgba(248,250,252,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">${reg.prize_description}</p>` : ''}
            <div style="background:rgba(245,158,11,0.1);border:1.5px solid rgba(245,158,11,0.35);border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#fcd34d;">Show this code to our staff to collect your prize</p>
              <code style="font-size:20px;font-weight:900;color:#f8fafc;letter-spacing:0.15em;">${refCode}</code>
            </div>
            <a href="${zeliotUrl}" style="display:block;background:#0a66c2;color:#fff;text-decoration:none;border-radius:10px;padding:14px;text-align:center;font-weight:700;font-size:15px;margin-bottom:16px;">
              Follow Zeliot on LinkedIn →
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:rgba(248,250,252,0.35);font-size:12px;">
            © Zeliot — ${eventName}
          </div>
        </div>`
      : `
        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a1a;color:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:40px 32px;text-align:center;">
            <div style="font-size:52px;margin-bottom:12px;">⭐</div>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;">Thanks for playing, ${firstName}!</h1>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;line-height:1.7;color:rgba(248,250,252,0.85);margin:0 0 16px;">
              Not this time — but don't worry! Better luck next time. 🙌
            </p>
            <p style="font-size:15px;line-height:1.7;color:rgba(248,250,252,0.65);margin:0 0 28px;">
              Thank you for participating in <strong>${eventName}</strong>. We hope to see you at our next event!
            </p>
            <a href="${zeliotUrl}" style="display:block;background:#0a66c2;color:#fff;text-decoration:none;border-radius:10px;padding:14px;text-align:center;font-weight:700;font-size:15px;margin-bottom:16px;">
              Follow Zeliot on LinkedIn →
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:rgba(248,250,252,0.35);font-size:12px;">
            © Zeliot — ${eventName}
          </div>
        </div>`

    if (resend) {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to:   reg.email,
        subject,
        html,
      })
    } else {
      console.warn('[email] RESEND_API_KEY not set — email not sent')
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
