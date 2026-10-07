import { useEffect, useRef } from 'react'

interface Options {
  max?: number
  scale?: number
  perspective?: number
}

/**
 * Pointer-driven 3D tilt for cards. Drives the transform directly on the DOM
 * (no React state) so hovering never triggers a re-render — keeps the custom
 * cursor smooth. Returns just a ref to attach to the tilted element.
 */
export function useTilt<T extends HTMLElement>({ max = 9, scale = 1.015, perspective = 900 }: Options = {}) {
  const ref = useRef<T>(null)
  const raf = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    el.style.willChange = 'transform'

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width
        const py = (e.clientY - rect.top) / rect.height
        const rx = (0.5 - py) * 2 * max
        const ry = (px - 0.5) * 2 * max
        el.style.setProperty('--mx', `${px * 100}%`)
        el.style.setProperty('--my', `${py * 100}%`)
        el.style.transition = 'transform 120ms ease-out'
        el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf.current)
      el.style.transition = 'transform 500ms cubic-bezier(0.16,1,0.3,1)'
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf.current)
    }
  }, [max, scale, perspective])

  return { ref }
}
