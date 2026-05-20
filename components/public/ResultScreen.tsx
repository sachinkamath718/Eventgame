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
  eventName?: string
}

const ZELIOT_LINKEDIN = 'https://www.linkedin.com/company/realzeliot/posts/?feedView=all'

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

export default function ResultScreen({
  won, prizeName, prizeDescription, prizeImageUrl,
  isGrandPrize, linkedinCompanyUrl, linkedinShareText,
  participantName, registrationId, eventName,
}: Props) {
  const [emailSent, setEmailSent] = useState(false)

  // ── Fire email immediately on mount (result just appeared) ────────────────
  useEffect(() => {
    if (!emailSent && registrationId) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      }).finally(() => setEmailSent(true))
    }
  }, [registrationId]) // eslint-disable-line

  const firstName = participantName.split(' ')[0] || 'there'

  // ── LinkedIn URLs ─────────────────────────────────────────────────────────
  // Follow: always goes to Zeliot's page (override any DB setting)
  const followUrl = linkedinCompanyUrl || ZELIOT_LINKEDIN

  // Share: build a highly engaging Zeliot-branded caption
  const defaultCaption = won
    ? `🎉 Thrilled to share that I just won "${prizeName}" at the Zeliot Lucky Draw! Huge shoutout to the amazing team at Zeliot for organizing such an engaging and innovative event. 🚀 \n\nIf you haven't checked out what they're building in the connected mobility space, you definitely should! 👇\n\n${ZELIOT_LINKEDIN}\n\n#Zeliot #Innovation #ConnectedMobility`
    : `🎯 Just had a blast participating in the Zeliot Lucky Draw! Even though I didn't snag the grand prize this time, I absolutely loved the gamified experience.\n\nKudos to the Zeliot team for creating such a fun event! 🚀\n\n${ZELIOT_LINKEDIN}\n\n#Zeliot #ConnectedMobility #Innovation`

  const shareCaption  = linkedinShareText || defaultCaption

  const handleShareClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareCaption)
      }
    } catch (err) {
      console.error('Failed to copy', err)
    }
    // Always open LinkedIn after attempting to copy
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')
  }

  return (
    <div style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {won && <Confetti />}

      {/* Main result card */}
      <div style={{
        borderRadius: '1.5rem', overflow: 'hidden',
        border: `1px solid ${won ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: won
          ? 'linear-gradient(160deg,rgba(245,158,11,0.08) 0%,rgba(239,68,68,0.05) 100%)'
          : 'rgba(255,255,255,0.03)',
      }}>
        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: won ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'rgba(255,255,255,0.08)',
        }} />

        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ marginBottom: '1.25rem' }}>
            {prizeImageUrl ? (
              <img src={prizeImageUrl} alt={prizeName} style={{
                width: 100, height: 100, objectFit: 'contain',
                borderRadius: '1rem', margin: '0 auto', display: 'block',
                filter: won ? 'drop-shadow(0 0 16px rgba(245,158,11,0.5))' : 'none',
              }} />
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
            display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: 999,
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: '0.875rem',
            background: won ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.12)',
            color: won ? '#fcd34d' : '#94a3b8',
            border: `1px solid ${won ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)'}`,
          }}>
            {isGrandPrize ? 'Grand Prize Winner' : won ? 'You Won' : 'Better Luck Next Time'}
          </div>

          {/* Prize name */}
          <h2 style={{
            fontWeight: 800, fontSize: '1.6rem', margin: '0 0 0.5rem', lineHeight: 1.2,
            ...(won ? {
              background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
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

      {/* Collect prize (winners only) */}
      {won && (
        <div style={{
          padding: '1.25rem 1.5rem', borderRadius: '1.25rem',
          border: '1.5px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.05)',
          textAlign: 'center',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fcd34d', margin: '0 0 0.25rem' }}>
            Show this screen to our staff
          </p>
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
            to collect your prize at the event desk
          </p>
          <code style={{
            display: 'inline-block', padding: '0.3rem 0.875rem',
            background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem',
            fontFamily: 'monospace', fontSize: '0.75rem',
            color: 'rgba(248,250,252,0.4)', letterSpacing: '0.12em',
          }}>
            REF: {registrationId.slice(0, 8).toUpperCase()}
          </code>
        </div>
      )}

      {/* LinkedIn section */}
      <div style={{
        padding: '1.25rem 1.5rem', borderRadius: '1.25rem',
        border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
      }}>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(248,250,252,0.5)', margin: '0 0 0.875rem', fontWeight: 500 }}>
          Stay connected with Zeliot
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {/* Follow — goes to Zeliot LinkedIn page */}
          <a href={followUrl} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.7rem',
            background: '#0a66c2', borderRadius: '0.75rem',
            color: '#fff', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none',
          }}>
            <LinkedInIcon /> Follow Zeliot
          </a>
          {/* Share — copies text to clipboard and opens LinkedIn */}
          <button onClick={handleShareClick} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.7rem',
            background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.4)',
            borderRadius: '0.75rem', color: '#60a5fa', fontWeight: 600, fontSize: '0.82rem', 
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <LinkedInIcon /> Share
          </button>
        </div>

        {/* Preview the share caption */}
        <div style={{
          marginTop: '0.875rem', padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: '0.625rem',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(248,250,252,0.35)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {shareCaption.length > 160 ? shareCaption.slice(0, 160) + '…' : shareCaption}
          </p>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(248,250,252,0.25)', fontSize: '0.75rem', margin: 0 }}>
        A confirmation email has been sent to you
      </p>
    </div>
  )
}
