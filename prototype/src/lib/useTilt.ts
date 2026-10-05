import { useEffect, useRef, useState } from 'react'

interface Options {
  max?: number
  scale?: number
  perspective?: number
  glare?: boolean
}

/** Pointer-driven 3D tilt for cards. Returns a ref plus motion values. */
export function useTilt<T extends HTMLElement>({ max = 9, scale = 1.015, perspective = 900 }: Options = {}) {
  const ref = useRef<T>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: `perspective(900px)`,
  })
  const raf = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const rx = (0.5 - py) * 2 * max
      const ry = (px - 0.5) * 2 * max
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${px * 100}%`)
        el.style.setProperty('--my', `${py * 100}%`)
        setStyle({
          transform: `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          transition: 'transform 120ms ease-out',
        })
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf.current)
      setStyle({
        transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
        transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1)',
      })
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf.current)
    }
  }, [max, scale, perspective])

  return { ref, style }
}
