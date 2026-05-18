import nodemailer from 'nodemailer'

// Create a transporter using environment variables
// For Gmail, use host: 'smtp.gmail.com', port: 465, secure: true
// For Outlook, use host: 'smtp.office365.com', port: 587, secure: false
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'false' ? false : true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendResultEmail(
  toEmail: string,
  participantName: string,
  eventName: string,
  won: boolean,
  prizeName: string
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials are not set. Skipping email.')
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
    const info = await transporter.sendMail({
      from: `"Zeliot Events" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html,
    })
    console.log('Email sent successfully:', info.messageId)
  } catch (err) {
    console.error('Unexpected error sending email via SMTP:', err)
  }
}
