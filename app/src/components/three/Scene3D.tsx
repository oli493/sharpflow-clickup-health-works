import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'

function hasWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

interface SceneProps {
  children: ReactNode
  className?: string
  camera?: { position: [number, number, number]; fov?: number }
  fallback?: ReactNode
}

export default function Scene3D({
  children,
  className,
  camera = { position: [0, 0, 6], fov: 45 },
  fallback = null,
}: SceneProps) {
  const supported = useMemo(hasWebGL, [])
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)

  // Only render the scene while it's on screen — stops the 3D canvases from
  // burning frames when they're scrolled out of view.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!supported) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <div ref={ref} className={className}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={inView ? 'always' : 'never'}
        camera={camera}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
