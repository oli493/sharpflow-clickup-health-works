import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    document.body.classList.add('has-custom-cursor')

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ringPos = { ...pos }
    let hover = false
    let raf = 0

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      const t = e.target as HTMLElement
      hover = !!t.closest('a, button, [data-cursor="hover"], input, label')
    }

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.7
      ringPos.y += (pos.y - ringPos.y) * 0.7
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) scale(${hover ? 1.9 : 1})`
        ring.current.style.borderColor = hover ? 'rgba(224,16,114,1)' : 'rgba(224,16,114,0.6)'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <div
        ref={ring}
        className="fixed left-0 top-0 -ml-4 -mt-4 h-8 w-8 rounded-full border-2 transition-[border-color] duration-200"
        style={{ borderColor: 'rgba(224,16,114,0.6)' }}
      />
      <div
        ref={dot}
        className="fixed left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-magenta"
        style={{ boxShadow: '0 0 12px rgba(224,16,114,0.9)' }}
      />
    </div>
  )
}
