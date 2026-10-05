import { useEffect, useRef } from 'react'

export default function Background() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
      })
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

      {/* cursor glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(460px circle at var(--mx, 50%) var(--my, 12%), rgba(95,186,149,0.18), transparent 60%)',
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
