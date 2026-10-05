import { Suspense, useMemo } from 'react'
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

  if (!supported) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.8]}
        camera={camera}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
