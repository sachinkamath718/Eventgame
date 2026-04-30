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

// LinkedIn SVG icon
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
)

export default function ResultScreen({
  won, prizeName, prizeDescription, prizeImageUrl,
  isGrandPrize, linkedinCompanyUrl, linkedinShareText,
  participantName, registrationId,
}: Props) {
  const [emailSent, setEmailSent] = useState(false)

  // Send email automatically
  useEffect(() => {
    if (!emailSent) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      }).finally(() => setEmailSent(true))
    }
  }, [registrationId])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const defaultShareText = won
    ? `🎉 I just won "${prizeName}" at the lucky draw! ${shareUrl}`
    : `Just participated in an exciting lucky draw! 🎯 ${shareUrl}`
  const shareText = linkedinShareText || defaultShareText

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`
  const linkedinFollowUrl = linkedinCompanyUrl || 'https://www.linkedin.com/company/'

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
      {won && <Confetti />}

      {/* ── Result Card ── */}
      <div
        className={won ? 'prize-card-win animate-bounce-in' : 'prize-card-lose animate-slide-up'}
        style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.25rem' }}
      >
        {/* Icon / Image */}
        <div style={{ marginBottom: '1.25rem' }}>
          {prizeImageUrl ? (
            <img
              src={prizeImageUrl}
              alt={prizeName}
              style={{
                width: 120, height: 120, objectFit: 'contain',
                borderRadius: '1rem', margin: '0 auto',
                filter: won ? 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' : 'none',
              }}
            />
          ) : (
            <div style={{
              fontSize: isGrandPrize ? '5rem' : '4rem',
              lineHeight: 1,
              filter: won ? 'drop-shadow(0 0 12px rgba(245,158,11,0.7))' : 'none',
            }}>
              {isGrandPrize ? '🏆' : won ? '🎁' : '⭐'}
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{
          display: 'inline-block',
          padding: '0.3rem 1rem',
          borderRadius: 999,
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          background: won ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
          color: won ? '#fcd34d' : '#94a3b8',
          border: `1px solid ${won ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
        }}>
          {isGrandPrize ? '🏆 Grand Prize Winner' : won ? '🎉 You Won!' : '⭐ Better Luck Next Time'}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: '1.75rem',
          marginBottom: '0.5rem',
          ...(won ? {
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } : { color: 'rgba(248,250,252,0.7)' }),
        }}>
          {prizeName}
        </h2>

        {prizeDescription && (
          <p style={{ color: 'rgba(248,250,252,0.55)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {prizeDescription}
          </p>
        )}

        {!won && (
          <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Don&apos;t be discouraged, {participantName.split(' ')[0]}! Keep an eye out for our next events.
          </p>
        )}
      </div>

      {/* ── Show to Staff (win only) ── */}
      {won && (
        <div
          className="animate-slide-up-delay-1"
          style={{
            padding: '1.25rem',
            borderRadius: '1.25rem',
            border: '2px solid rgba(245,158,11,0.5)',
            background: 'rgba(245,158,11,0.06)',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
          // Pulse glow
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏅</div>
          <p style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#fcd34d',
            marginBottom: '0.25rem',
          }}>
            Show this screen to our staff
          </p>
          <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.8rem' }}>
            to collect your prize at the event desk
          </p>
          <div style={{
            marginTop: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: 'rgba(248,250,252,0.3)',
            letterSpacing: '0.1em',
          }}>
            REF: {registrationId.slice(0, 8).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── LinkedIn Section ── */}
      <div
        className="glass-card animate-slide-up-delay-2"
        style={{ padding: '1.25rem', marginBottom: '1.25rem' }}
      >
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '0.9rem',
          color: 'rgba(248,250,252,0.7)',
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          Stay connected with us
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Follow button — LinkedIn blue filled */}
          <a
            href={linkedinFollowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-linkedin-follow"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <LinkedInIcon />
            Follow on LinkedIn
          </a>

          {/* Share button — outlined */}
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-linkedin-share"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ShareIcon />
            Share on LinkedIn
          </a>
        </div>
      </div>

      {/* ── Email confirmation note ── */}
      <p style={{
        textAlign: 'center',
        color: 'rgba(248,250,252,0.3)',
        fontSize: '0.78rem',
        animation: 'fadeIn 1s 1s ease both',
      }}>
        📧 A confirmation email has been sent to you
      </p>
    </div>
  )
}
