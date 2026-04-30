'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

const LINKEDIN_COMPANY = 'your-company-name' // Update this

function ResultContent() {
  const params = useSearchParams()
  const won = params.get('won') === 'true'
  const prizeName = decodeURIComponent(params.get('prize') || 'Better Luck Next Time')
  const prizeImg = decodeURIComponent(params.get('prizeImg') || '')

  const shareText = won
    ? `🎉 I just won ${prizeName} at the Lucky Draw! Amazing experience!`
    : `🎮 Just played the Lucky Draw game! What a fun experience!`

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(shareText)}`

  const linkedInFollowUrl = `https://www.linkedin.com/company/${LINKEDIN_COMPANY}/`

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="text-center"
      >
        {won ? (
          <>
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-yellow-400 mb-2">Congratulations!</h1>
            <p className="text-xl text-white/80 mb-4">You've won</p>
            <div className="bg-white/10 backdrop-blur border border-yellow-400/40 rounded-2xl p-6 mb-8 shadow-xl shadow-yellow-400/20">
              {prizeImg && <img src={prizeImg} alt={prizeName} className="h-32 mx-auto mb-4 object-contain rounded-xl" />}
              <h2 className="text-3xl font-bold text-yellow-400">{prizeName}</h2>
            </div>
          </>
        ) : (
          <>
            <div className="text-8xl mb-4">🎮</div>
            <h1 className="text-4xl font-bold text-white mb-2">Better Luck Next Time!</h1>
            <p className="text-lg text-white/60 mb-8">Don't give up — you'll win next time!</p>
          </>
        )}

        {/* Show to staff card */}
        {won && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-2xl p-4 mb-8 font-bold text-center shadow-lg">
            📱 Show this screen to our team to collect your prize!
          </div>
        )}

        {/* LinkedIn actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto mb-6">
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0077b5] hover:bg-[#006399] rounded-xl font-semibold transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </a>

          <a
            href={linkedInFollowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#0077b5] text-[#0077b5] hover:bg-[#0077b5] hover:text-white rounded-xl font-semibold transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Follow us on LinkedIn
          </a>
        </div>

        <p className="text-white/40 text-sm">A confirmation email has been sent to your inbox</p>
      </motion.div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
