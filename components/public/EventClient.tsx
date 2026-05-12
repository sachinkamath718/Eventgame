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

interface FormField {
  formLabel: string; fieldKey: string; required: boolean
  fieldType: string; options: string; enabled?: boolean
}

interface RegResult {
  registrationId:    string
  prizeName:         string
  prizeRank:         number
  prizeImageUrl?:    string
  prizeDescription?: string
  won:               boolean
  name?:             string
  isGrandPrizeSession?: boolean
}

interface LuckyEvent {
  id: string; name: string; game_type: string
  form_fields?: FormField[]
  ui_config?: Record<string, string>
  prizes?: Prize[]
  designation_rules?: Array<{ designations: string[]; prize_rank: number; win_probability: number }>
  linkedin_company_url?: string
  linkedin_share_text?: string
}

type Stage = 'form' | 'game' | 'result'

export default function EventClient({ event }: { event: LuckyEvent }) {
  const [stage, setStage]         = useState<Stage>('form')
  const [regResult, setRegResult] = useState<RegResult | null>(null)
  const [participantName, setName] = useState('')

  const ui     = event.ui_config || {}
  const bg     = ui.bgColor && ui.bgColor2
    ? `linear-gradient(145deg,${ui.bgColor} 0%,${ui.bgColor2} 100%)`
    : 'linear-gradient(145deg,#0a0a1a 0%,#1e1b4b 100%)'
  const accent = ui.accentColor || '#f59e0b'
  const prizes = event.prizes || []

  useEffect(() => {
    function handleReg(e: CustomEvent<RegResult>) {
      setRegResult(e.detail)
      setName(e.detail.name || '')
      setStage('game')
    }
    window.addEventListener('registration-complete', handleReg as EventListener)
    return () => window.removeEventListener('registration-complete', handleReg as EventListener)
  }, [])

  const stages: Stage[]  = ['form', 'game', 'result']
  const stageIdx         = stages.indexOf(stage)
  const isGrandPrize     = !!(regResult?.isGrandPrizeSession)

  async function handleGameDone() {
    if (!regResult) { setStage('result'); return }
    try {
      const res  = await fetch(`/api/check-registration?id=${regResult.registrationId}`)
      const data = await res.json()
      if (data.registration) {
        const r = data.registration
        setRegResult(prev => prev ? {
          ...prev,
          prizeName:           r.prize_name         ?? prev.prizeName,
          prizeRank:           r.prize_rank_won      ?? prev.prizeRank,
          prizeImageUrl:       r.prize_image_url     ?? prev.prizeImageUrl,
          prizeDescription:    r.prize_description   ?? prev.prizeDescription,
          won:                 r.game_result === 'won',
          isGrandPrizeSession: r.is_grand_prize_winner ?? prev.isGrandPrizeSession,
        } : prev)
      }
    } catch { /* fall through with existing state */ }
    setStage('result')
  }

  return (
    <main style={{
      minHeight: '100vh', background: bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem 1rem 4rem',
      fontFamily: 'Inter, sans-serif', color: '#f8fafc',
    }}>

      {ui.logoUrl && (
        <img src={ui.logoUrl} alt="logo"
          style={{ height: 48, objectFit: 'contain', marginBottom: '1.5rem' }} />
      )}

      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: 480 }}>
        <h1 style={{
          fontWeight: 900, fontSize: 'clamp(1.6rem,5vw,2.4rem)',
          margin: '0 0 0.5rem', color: accent,
          textShadow: `0 0 32px ${accent}55`, letterSpacing: '-0.02em',
        }}>
          {ui.heading || event.name}
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'rgba(248,250,252,0.5)', margin: 0 }}>
          {ui.subheading || 'Register below and spin to win'}
        </p>
      </div>

      {/* Stage indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '2rem' }}>
        {['Register', 'Play', 'Result'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700,
                background: stageIdx === i ? accent : stageIdx > i ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)',
                color: stageIdx === i ? '#0a0a1a' : stageIdx > i ? '#4ade80' : 'rgba(255,255,255,0.35)',
                border: stageIdx === i ? `2px solid ${accent}` : '2px solid transparent',
                transition: 'all 0.3s',
              }}>
                {stageIdx > i ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: stageIdx === i ? 600 : 400,
                color: stageIdx === i ? accent : 'rgba(255,255,255,0.3)',
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{ width: 32, height: 1, background: stageIdx > i ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      {stage === 'form' && (
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '1.5rem', padding: '2rem',
          backdropFilter: 'blur(12px)',
        }}>
          <RegisterFormWrapper event={event} />
        </div>
      )}

      {/* Game */}
      {stage === 'game' && regResult && (
        <div style={{
          width: '100%', maxWidth: 480,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.5rem', padding: '2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', margin: '0 0 0.375rem' }}>
            Your Turn
          </h2>
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.82rem', margin: '0 0 1.5rem' }}>
            {event.game_type === 'spin_wheel'
              ? 'Spin the wheel to reveal your prize'
              : event.game_type === 'number_match'
              ? 'Pull the lever — match all 3 to win'
              : 'Match all pairs to claim your prize'}
          </p>

          {event.game_type === 'spin_wheel' && (
            <SpinWheelGame
              prizes={prizes}
              targetRank={regResult.prizeRank}
              won={regResult.won}
              onDone={handleGameDone}
              sessionMode={isGrandPrize}
              registrationId={regResult.registrationId}
            />
          )}
          {event.game_type === 'number_match' && (
            <NumberMatchGame won={regResult.won} onDone={handleGameDone} />
          )}
          {event.game_type === 'anime_match' && (
            <AnimeMatchGame won={regResult.won} onDone={handleGameDone} />
          )}
        </div>
      )}

      {/* Result */}
      {stage === 'result' && regResult && (
        <ResultScreen
          won={regResult.won}
          prizeName={regResult.prizeName}
          prizeDescription={regResult.prizeDescription}
          prizeImageUrl={regResult.prizeImageUrl}
          isGrandPrize={regResult.isGrandPrizeSession}
          linkedinCompanyUrl={event.linkedin_company_url}
          linkedinShareText={event.linkedin_share_text}
          participantName={participantName}
          registrationId={regResult.registrationId}
        />
      )}

      {ui.footerText && (
        <p style={{ marginTop: '3rem', color: 'rgba(248,250,252,0.2)', fontSize: '0.72rem', textAlign: 'center' }}>
          {ui.footerText}
        </p>
      )}
    </main>
  )
}

function RegisterFormWrapper({ event }: { event: LuckyEvent }) {
  const [Form, setForm] = useState<React.ComponentType<{ event: LuckyEvent }> | null>(null)
  useEffect(() => {
    import('@/components/public/RegisterForm').then(m => setForm(() => m.default))
  }, [])
  if (!Form) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(248,250,252,0.3)', fontSize: '0.875rem' }}>
      Loading…
    </div>
  )
  return <Form event={event} />
}
