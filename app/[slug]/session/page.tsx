'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

function SessionContent({ slug }: { slug: string }) {
  const params = useSearchParams()
  const regId = params.get('regId')!
  const [status, setStatus] = useState<'waiting' | 'won' | 'lost'>('waiting')
  const [prizeName, setPrizeName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to realtime updates on this registration
    const channel = supabase
      .channel(`registration:${regId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `id=eq.${regId}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>
          if (updated.game_result === 'won') {
            setStatus('won')
            setPrizeName(updated.prize_name as string || 'Grand Prize')
          } else if (updated.game_result === 'lost') {
            setStatus('lost')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [regId])

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] flex flex-col items-center justify-center p-6 text-white">
      <AnimatePresence mode="wait">
        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            {/* Animated spinner */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-yellow-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-yellow-400/40 animate-spin" />
              <div className="absolute inset-4 rounded-full bg-yellow-400/10 flex items-center justify-center text-4xl">
                🎁
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-3">You&apos;re in the Grand Prize Draw!</h1>
            <p className="text-white/60 text-lg mb-8">The host is selecting a winner live — stay on this screen!</p>

            {/* Live dots */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-green-400 text-sm font-medium">LIVE SESSION ACTIVE</span>
            </div>
          </motion.div>
        )}

        {status === 'won' && (
          <motion.div
            key="won"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 1 }}
            className="text-center"
          >
            <div className="text-8xl mb-6">🏆</div>
            <h1 className="text-5xl font-bold text-yellow-400 mb-4">YOU WON!</h1>
            <p className="text-2xl mb-2">Grand Prize:</p>
            <p className="text-3xl font-bold text-yellow-300 mb-8">{prizeName}</p>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl p-4 font-bold text-lg shadow-xl">
              📱 Show this screen to our team to collect your prize!
            </div>
          </motion.div>
        )}

        {status === 'lost' && (
          <motion.div
            key="lost"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-8xl mb-6">💫</div>
            <h1 className="text-4xl font-bold mb-4">Better Luck Next Time!</h1>
            <p className="text-white/60 text-lg">Thanks for participating in the Grand Prize Draw!</p>
            <p className="text-white/40 text-sm mt-4">A confirmation email has been sent to your inbox.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null)
  params.then(p => setSlug(p.slug))
  if (!slug) return null
  return (
    <Suspense>
      <SessionContent slug={slug} />
    </Suspense>
  )
}
