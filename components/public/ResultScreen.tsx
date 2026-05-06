'use client'

import { useEffect, useState } from 'react'
import Confetti from './Confetti'

interface Props {
  won: boolean
  prizeName: string
  prizeDescription?: string | null
  prizeImageUrl?: string | null
  isGrandPrize?: boolean
  linkedinCompanyUrl?: string | null
  linkedinShareText?: string | null
  participantName: string
  registrationId: string
}

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

export default function ResultScreen({
  won, prizeName, prizeDescription, prizeImageUrl,
  isGrandPrize, linkedinCompanyUrl, linkedinShareText,
  participantName, registrationId,
}: Props) {
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (!emailSent) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      }).finally(() => setEmailSent(true))
    }
  }, [registrationId])

  const shareUrl  = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = linkedinShareText || (won
    ? `I just won "${prizeName}" — what a day! ${shareUrl}`
    : `Just participated in a lucky draw event. ${shareUrl}`)

  const linkedinShareUrl  = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`
  const linkedinFollowUrl = linkedinCompanyUrl || 'https://www.linkedin.com/company/'
  const firstName         = participantName.split(' ')[0] || 'there'

  return (
    <div style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {won && <Confetti />}

      {/* Main result card */}
      <div style={{
        borderRadius: '1.5rem',
        overflow: 'hidden',
        border: `1px solid ${won ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: won
          ? 'linear-gradient(160deg,rgba(245,158,11,0.08) 0%,rgba(239,68,68,0.05) 100%)'
          : 'rgba(255,255,255,0.03)',
      }}>
        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: won
            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
            : 'rgba(255,255,255,0.08)',
        }} />

        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Prize image or icon */}
          <div style={{ marginBottom: '1.25rem' }}>
            {prizeImageUrl ? (
              <img
                src={prizeImageUrl}
                alt={prizeName}
                style={{
                  width: 100, height: 100, objectFit: 'contain',
                  borderRadius: '1rem', margin: '0 auto', display: 'block',
                  filter: won ? 'drop-shadow(0 0 16px rgba(245,158,11,0.5))' : 'none',
                }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem',
                background: won ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${won ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                {isGrandPrize ? '🏆' : won ? '🎁' : '✦'}
              </div>
            )}
          </div>

          {/* Status pill */}
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 0.875rem',
            borderRadius: 999,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.875rem',
            background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.12)',
            color: won ? '#fcd34d' : '#94a3b8',
            border: `1px solid ${won ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)'}`,
          }}>
            {isGrandPrize ? 'Grand Prize Winner' : won ? 'You Won' : 'Better Luck Next Time'}
          </div>

          {/* Prize name */}
          <h2 style={{
            fontWeight: 800,
            fontSize: '1.6rem',
            margin: '0 0 0.5rem',
            lineHeight: 1.2,
            ...(won ? {
              background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : { color: 'rgba(248,250,252,0.6)' }),
          }}>
            {prizeName}
          </h2>

          {prizeDescription && (
            <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              {prizeDescription}
            </p>
          )}

          {!won && (
            <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: '0.875rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
              Not this time, {firstName} — keep an eye out for our next events.
            </p>
          )}
        </div>
      </div>

      {/* Collect prize card (win only) */}
      {won && (
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '1.25rem',
          border: '1.5px solid rgba(245,158,11,0.4)',
          background: 'rgba(245,158,11,0.05)',
          textAlign: 'center',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fcd34d', margin: '0 0 0.25rem' }}>
            Show this screen to our staff
          </p>
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
            to collect your prize at the event desk
          </p>
          <code style={{
            display: 'inline-block',
            padding: '0.3rem 0.875rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: 'rgba(248,250,252,0.4)',
            letterSpacing: '0.12em',
          }}>
            REF: {registrationId.slice(0, 8).toUpperCase()}
          </code>
        </div>
      )}

      {/* LinkedIn */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(248,250,252,0.5)', margin: '0 0 0.875rem', fontWeight: 500 }}>
          Stay connected
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <a href={linkedinFollowUrl} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.7rem',
            background: '#0a66c2', borderRadius: '0.75rem',
            color: '#fff', fontWeight: 600, fontSize: '0.82rem',
            textDecoration: 'none',
          }}>
            <LinkedInIcon /> Follow
          </a>
          <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.7rem',
            background: 'rgba(10,102,194,0.15)',
            border: '1px solid rgba(10,102,194,0.4)',
            borderRadius: '0.75rem',
            color: '#60a5fa', fontWeight: 600, fontSize: '0.82rem',
            textDecoration: 'none',
          }}>
            <LinkedInIcon /> Share
          </a>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(248,250,252,0.25)', fontSize: '0.75rem', margin: 0 }}>
        A confirmation email has been sent to you
      </p>
    </div>
  )
}
