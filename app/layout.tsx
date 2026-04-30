import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lucky Draw | Win Exciting Prizes',
  description: 'Scan the QR code, play the game, and win amazing prizes!',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
