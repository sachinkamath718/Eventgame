import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendResultEmail(
  toEmail: string,
  participantName: string,
  eventName: string,
  won: boolean,
  prizeName: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email.')
    return
  }

  const subject = won 
    ? `Congratulations! You won at ${eventName} 🎉` 
    : `Thanks for participating in ${eventName}!`

  const html = won 
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #7c3aed;">Congratulations, ${participantName}!</h2>
        <p>You're a winner in our <strong>${eventName}</strong> lucky draw!</p>
        <div style="background: #fdf4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #86198f; font-weight: bold; text-align: center; font-size: 1.2rem;">
            Prize: ${prizeName}
          </p>
        </div>
        <p>Please show this email to our team at the booth to claim your prize.</p>
        <p>Thanks for playing!</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333;">Hi ${participantName},</h2>
        <p>Thank you for participating in the <strong>${eventName}</strong> lucky draw!</p>
        <p>Unfortunately, you didn't win a prize this time, but we hope you had fun playing.</p>
        <p>We hope to see you at our future events!</p>
      </div>
    `

  try {
    const { data, error } = await resend.emails.send({
      from: 'Zeliot Events <marketing@zeliot.in>',
      to: toEmail,
      subject,
      html,
    })

    if (error) {
      console.error('Error sending Resend email:', error)
    } else {
      console.log('Email sent successfully:', data)
    }
  } catch (err) {
    console.error('Unexpected error sending email:', err)
  }
}
