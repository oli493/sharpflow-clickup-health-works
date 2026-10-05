import type { ReactNode } from 'react'
import Scene3D from './Scene3D'
import { HealthOrb, ScoreGauge, TopologyGraph } from './scenes'

export function OrbView({ className, fallback }: { className?: string; fallback?: ReactNode }) {
  return (
    <Scene3D className={className} camera={{ position: [0, 0, 8.4], fov: 42 }} fallback={fallback}>
      <HealthOrb />
    </Scene3D>
  )
}

export function GaugeView({
  score,
  color,
  className,
  fallback,
}: {
  score: number
  color: string
  className?: string
  fallback?: ReactNode
}) {
  return (
    <Scene3D className={className} camera={{ position: [0, 0, 6.2], fov: 44 }} fallback={fallback}>
      <ScoreGauge score={score} color={color} />
    </Scene3D>
  )
}

export function TopologyView({
  className,
  fallback,
  onSelect,
}: {
  className?: string
  fallback?: ReactNode
  onSelect?: (name: string) => void
}) {
  return (
    <Scene3D className={className} camera={{ position: [0, 1.2, 7], fov: 46 }} fallback={fallback}>
      <TopologyGraph onSelect={onSelect} />
    </Scene3D>
  )
}
