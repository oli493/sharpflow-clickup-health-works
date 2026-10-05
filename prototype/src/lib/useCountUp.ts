import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 1600, start = true) {
  const [value, setValue] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration, start])

  return value
}
