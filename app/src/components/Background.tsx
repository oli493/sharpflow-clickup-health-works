import { useEffect, useRef } from 'react'

const GLOW = 1000

export default function Background() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const place = (x: number, y: number) => {
      el.style.transform = `translate3d(${x - GLOW / 2}px, ${y - GLOW / 2}px, 0)`
    }
    place(window.innerWidth / 2, window.innerHeight * 0.12)
    if (window.matchMedia('(pointer: coarse)').matches) return

    // Move the glow with a transform (compositor-only) instead of repainting a
    // full-viewport gradient every frame.
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => place(e.clientX, e.clientY))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#FBFAF6_0%,#F6F5F1_45%,#F3F5EE_100%)]" />

      {/* pastel mesh */}
      <div className="absolute -left-40 -top-48 h-[44rem] w-[44rem] animate-aurora rounded-full bg-mint/35 blur-[130px]" />
      <div
        className="absolute -right-44 top-16 h-[40rem] w-[40rem] animate-aurora rounded-full bg-[#F6BFD6]/50 blur-[140px]"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="absolute bottom-[-18rem] left-1/4 h-[38rem] w-[38rem] animate-aurora rounded-full bg-magenta/15 blur-[150px]"
        style={{ animationDelay: '-12s' }}
      />
      <div
        className="absolute right-1/4 top-1/3 h-[26rem] w-[26rem] animate-aurora rounded-full bg-[#CDE9DC]/60 blur-[130px]"
        style={{ animationDelay: '-3s' }}
      />

      {/* grid */}
      <div className="grid-noise absolute inset-0 opacity-[0.5] mask-fade-b" />

      {/* cursor glow (transform-driven) */}
      <div
        ref={glowRef}
        className="absolute left-0 top-0 opacity-70 will-change-transform"
        style={{
          width: GLOW,
          height: GLOW,
          background: 'radial-gradient(circle 460px, rgba(95,186,149,0.18), transparent 60%)',
        }}
      />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
