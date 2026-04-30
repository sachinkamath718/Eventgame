'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setLoading(false) }
  }

  const F: React.CSSProperties = {
    width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem',
    border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
    color: '#f8fafc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a 0%,#1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎯</div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.75rem', background: 'linear-gradient(135deg,#a78bfa,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Lucky Draw
          </h1>
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: '0.9rem', margin: '0.4rem 0 0' }}>Admin Panel</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '2rem', backdropFilter: 'blur(12px)' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              🔒 {error}
            </div>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(248,250,252,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                style={F}
                value={username}
                placeholder="Enter username"
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(248,250,252,0.5)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                style={F}
                value={password}
                placeholder="Enter password"
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{ marginTop: '0.5rem', padding: '1rem', background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: '0.875rem', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              {loading ? '⏳ Logging in…' : 'Login →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
