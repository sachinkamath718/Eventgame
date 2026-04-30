'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; life: number; maxLife: number
}

const CONFETTI_COLORS = ['#f59e0b','#ef4444','#a855f7','#3b82f6','#10b981','#fcd34d','#fb923c']

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!

    // Spawn burst of particles
    for (let i = 0; i < 120; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 10,
        life: 0,
        maxLife: 150 + Math.random() * 100,
      })
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.current = particles.current.filter(p => p.life < p.maxLife)
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08
        p.vx *= 0.99; p.life++
        const alpha = Math.max(0, 1 - p.life / p.maxLife)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.life * 0.05)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      })
      ctx.globalAlpha = 1
      if (particles.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setHidden(true)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (hidden) return null
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}
    />
  )
}
