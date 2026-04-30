'use client'

import { useEffect, useState } from 'react'
import SpinWheelGame from '@/components/games/SpinWheelGame'
import NumberMatchGame from '@/components/games/NumberMatchGame'
import AnimeMatchGame from '@/components/games/AnimeMatchGame'
import ResultScreen from '@/components/public/ResultScreen'

interface Prize {
  id: string; rank: number; name: string; description?: string
  image_url?: string; is_consolation: boolean; is_grand_prize: boolean
}

interface RegResult {
  registrationId: string; prizeName: string; prizeRank: number
  prizeImageUrl?: string; prizeDescription?: string; won: boolean
  name?: string
}

interface LuckyEvent {
  id: string; name: string; game_type: string
  ui_config?: Record<string, string>
  prizes?: Prize[]
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
  linkedin_company_url?: string
  linkedin_share_text?: string
}

type Stage = 'form' | 'game' | 'result'

export default function EventClient({ event }: { event: LuckyEvent }) {
  const [stage, setStage] = useState<Stage>('form')
  const [regResult, setRegResult] = useState<RegResult | null>(null)
  const [participantName, setParticipantName] = useState('')

  const ui = event.ui_config || {}

  // Listen for registration-complete custom event from RegisterForm
  useEffect(() => {
    function handleReg(e: CustomEvent<RegResult>) {
      setRegResult(e.detail)
      setParticipantName(e.detail.name || '')
      setStage('game')
    }
    window.addEventListener('registration-complete', handleReg as EventListener)
    return () => window.removeEventListener('registration-complete', handleReg as EventListener)
  }, [])

  const prizes = event.prizes || []

  // Stage indicator dots
  const stages: Stage[] = ['form', 'game', 'result']
  const stageLabels = ['Register', 'Play', 'Result']

  return (
    <main
      className="mesh-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '2rem 1rem',
        fontFamily: ui.fontFamily || 'var(--font-body)',
        color: ui.textColor || '#f8fafc',
      }}
    >
      {/* Logo */}
      {ui.logoUrl && (
        <img
          src={ui.logoUrl}
          alt="Logo"
          className="animate-fade-in"
          style={{ height: 56, objectFit: 'contain', marginBottom: '1.5rem' }}
        />
      )}

      {/* Header */}
      <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: 480 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            marginBottom: '0.5rem',
            color: ui.accentColor || '#f59e0b',
            textShadow: '0 0 30px rgba(245,158,11,0.4)',
          }}
        >
          {ui.heading || `🎉 ${event.name}`}
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(248,250,252,0.65)', lineHeight: 1.5 }}>
          {ui.subheading || 'Fill the form below to spin & win amazing prizes!'}
        </p>
      </div>

      {/* Stage progress */}
      <div className="animate-slide-up-delay-1" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {stages.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700,
              background: stage === s
                ? (ui.accentColor || '#f59e0b')
                : stages.indexOf(stage) > i
                ? 'rgba(34,197,94,0.4)'
                : 'rgba(255,255,255,0.1)',
              color: stage === s ? '#0a0a1a' : stages.indexOf(stage) > i ? '#4ade80' : 'rgba(255,255,255,0.4)',
              border: stage === s ? `2px solid ${ui.accentColor || '#f59e0b'}` : '2px solid transparent',
              transition: 'all 0.3s ease',
            }}>
              {stages.indexOf(stage) > i ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: '0.75rem',
              color: stage === s ? (ui.accentColor || '#f59e0b') : 'rgba(255,255,255,0.35)',
              fontWeight: stage === s ? 600 : 400,
              display: 'none',
            }}>
              {stageLabels[i]}
            </span>
            {i < stages.length - 1 && (
              <div style={{
                width: 40, height: 1,
                background: stages.indexOf(stage) > i ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.5s ease',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Stage: Form ── */}
      {stage === 'form' && (
        <div
          className="glass-card animate-slide-up-delay-2"
          style={{ width: '100%', maxWidth: 460, padding: '2rem' }}
        >
          {/* Dynamic import to avoid SSR issues */}
          <RegisterFormWrapper event={event} />
        </div>
      )}

      {/* ── Stage: Game ── */}
      {stage === 'game' && regResult && (
        <div
          className="glass-card animate-scale-in"
          style={{ width: '100%', maxWidth: 480, padding: '2rem', textAlign: 'center' }}
        >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            🎮 Time to Play!
          </h2>
          <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {event.game_type === 'spin_wheel' && 'Spin the wheel and see what you win!'}
            {event.game_type === 'number_match' && 'Reveal the cards — match all 3 to win!'}
            {event.game_type === 'anime_match' && 'Match all the pairs to claim your prize!'}
          </p>

          {event.game_type === 'spin_wheel' && (
            <SpinWheelGame
              prizes={prizes}
              targetRank={regResult.prizeRank}
              won={regResult.won}
              onDone={() => setStage('result')}
            />
          )}
          {event.game_type === 'number_match' && (
            <NumberMatchGame won={regResult.won} onDone={() => setStage('result')} />
          )}
          {event.game_type === 'anime_match' && (
            <AnimeMatchGame won={regResult.won} onDone={() => setStage('result')} />
          )}
        </div>
      )}

      {/* ── Stage: Result ── */}
      {stage === 'result' && regResult && (
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: 480 }}>
          <ResultScreen
            won={regResult.won}
            prizeName={regResult.prizeName}
            prizeDescription={regResult.prizeDescription}
            prizeImageUrl={regResult.prizeImageUrl}
            linkedinCompanyUrl={event.linkedin_company_url}
            linkedinShareText={event.linkedin_share_text}
            participantName={participantName}
            registrationId={regResult.registrationId}
          />
        </div>
      )}

      {/* Footer */}
      {ui.footerText && (
        <p style={{
          marginTop: '3rem',
          color: 'rgba(248,250,252,0.25)',
          fontSize: '0.75rem',
          textAlign: 'center',
        }}>
          {ui.footerText}
        </p>
      )}
    </main>
  )
}

// Wrapper to avoid circular imports
function RegisterFormWrapper({ event }: { event: LuckyEvent }) {
  const [Form, setForm] = useState<React.ComponentType<{ event: LuckyEvent }> | null>(null)
  useEffect(() => {
    import('@/components/public/RegisterForm').then(m => setForm(() => m.default))
  }, [])
  if (!Form) return <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(248,250,252,0.4)' }}>Loading…</div>
  return <Form event={event} />
}
