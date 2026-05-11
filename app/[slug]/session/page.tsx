'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

function SessionContent() {
  const params = useSearchParams()
  const regId  = params.get('regId')

  const [status, setStatus]       = useState<'waiting' | 'won' | 'lost'>('waiting')
  const [prizeName, setPrizeName] = useState('Grand Prize')
  const supabase = createClient()

  useEffect(() => {
    if (!regId) return

    const channel = supabase
      .channel(`registration:${regId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', schema: 'public',
          table: 'registrations', filter: `id=eq.${regId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>
          if (updated.game_result === 'won') {
            setStatus('won')
            setPrizeName((updated.prize_name as string) || 'Grand Prize')
          } else if (updated.game_result === 'lost') {
            setStatus('lost')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [regId, supabase])

  if (!regId) return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter,sans-serif',
    }}>
      Invalid session link.
    </main>
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', color: '#fff',
      fontFamily: 'Inter,sans-serif',
    }}>
      <AnimatePresence mode="wait">

        {/* Waiting */}
        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', maxWidth: 420 }}
          >
            {/* Pulsing gift icon */}
            <div style={{
              position: 'relative', width: 128, height: 128,
              margin: '0 auto 2rem',
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '3px solid rgba(250,204,21,0.2)',
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 8, borderRadius: '50%',
                border: '3px solid rgba(250,204,21,0.35)',
                animation: 'spin 3s linear infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 18, borderRadius: '50%',
                background: 'rgba(250,204,21,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.25rem',
              }}>🎁</div>
            </div>

            <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.2 }}>
              You&apos;re in the Grand Prize Draw!
            </h1>
            <p style={{ margin: '0 0 2rem', color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.5 }}>
              The host is selecting a winner live — stay on this screen!
            </p>

            {/* Live indicator */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: '999px', padding: '0.5rem 1rem',
            }}>
              {[0, 150, 300].map(delay => (
                <div key={delay} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
                  animation: `bounce 1s ${delay}ms infinite`,
                }} />
              ))}
              <span style={{ marginLeft: '0.25rem', color: '#4ade80', fontSize: '0.875rem', fontWeight: 600 }}>
                LIVE SESSION ACTIVE
              </span>
            </div>
          </motion.div>
        )}

        {/* Won */}
        {status === 'won' && (
          <motion.div
            key="won"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
            style={{ textAlign: 'center', maxWidth: 420 }}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>🏆</div>
            <h1 style={{
              margin: '0 0 1rem', fontSize: 'clamp(2.5rem,8vw,3.5rem)',
              fontWeight: 900, color: '#fbbf24', lineHeight: 1,
            }}>
              YOU WON!
            </h1>
            <p style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>
              Grand Prize:
            </p>
            <p style={{
              margin: '0 0 2rem', fontSize: '1.75rem', fontWeight: 800,
              color: '#fcd34d', lineHeight: 1.2,
            }}>
              {prizeName}
            </p>
            <div style={{
              background: 'linear-gradient(135deg,#d97706,#b45309)',
              borderRadius: '1.25rem', padding: '1.25rem 1.5rem',
              fontWeight: 700, fontSize: '1rem', color: '#fff',
              boxShadow: '0 8px 32px rgba(217,119,6,0.4)',
            }}>
              📱 Show this screen to our team to collect your prize!
            </div>
          </motion.div>
        )}

        {/* Lost */}
        {status === 'lost' && (
          <motion.div
            key="lost"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', maxWidth: 420 }}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>💫</div>
            <h1 style={{ margin: '0 0 1rem', fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2 }}>
              Better Luck Next Time!
            </h1>
            <p style={{ margin: '0 0 0.75rem', color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem' }}>
              Thanks for participating in the Grand Prize Draw!
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
              A confirmation email has been sent to your inbox.
            </p>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0);    animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50%       { transform: translateY(-5px); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
      `}</style>
    </main>
  )
}

export default function SessionPage({ params: _params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter,sans-serif',
      }}>Loading…</div>
    }>
      <SessionContent />
    </Suspense>
  )
}
