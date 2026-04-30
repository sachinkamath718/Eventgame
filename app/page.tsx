export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-7xl mb-6">🎰</div>
        <h1 className="text-4xl font-bold mb-4">Lucky Draw Platform</h1>
        <p className="text-white/60 mb-8">Scan the event QR code to participate!</p>
        <a href="/admin" className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all text-sm">
          Admin Panel →
        </a>
      </div>
    </main>
  )
}
