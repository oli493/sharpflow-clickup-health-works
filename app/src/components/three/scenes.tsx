import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float, Line, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { demoMode } from '../../lib/motion'

/* ------------------------------- Health Orb ------------------------------- */

export function HealthOrb() {
  const group = useRef<THREE.Group>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.16
      const px = state.pointer.x
      const py = state.pointer.y
      group.current.rotation.x += (py * 0.5 - group.current.rotation.x) * 0.05
      group.current.rotation.z += (-px * 0.4 - group.current.rotation.z) * 0.05
    }
    if (ringA.current) ringA.current.rotation.z += delta * 0.4
    if (ringB.current) ringB.current.rotation.x -= delta * 0.28
  })

  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 6]} intensity={2.4} color="#5FBA95" />
      <directionalLight position={[-6, -2, -4]} intensity={1.5} color="#E01072" />
      <Float speed={1.3} rotationIntensity={0.35} floatIntensity={0.8}>
        <group ref={group} scale={1.02}>
          <mesh>
            <sphereGeometry args={[1.85, 64, 64]} />
            <MeshDistortMaterial
              color="#173435"
              emissive="#24574E"
              emissiveIntensity={0.55}
              roughness={0.18}
              metalness={0.85}
              distort={0.38}
              speed={1.5}
            />
          </mesh>
          <mesh scale={1.015}>
            <sphereGeometry args={[1.85, 28, 28]} />
            <meshBasicMaterial color="#5FBA95" wireframe transparent opacity={0.14} />
          </mesh>
          <mesh ref={ringA}>
            <torusGeometry args={[2.45, 0.014, 12, 180]} />
            <meshBasicMaterial color="#E01072" transparent opacity={0.9} />
          </mesh>
          <mesh ref={ringB} rotation={[1.15, 0.5, 0.2]}>
            <torusGeometry args={[2.85, 0.011, 12, 180]} />
            <meshBasicMaterial color="#5FBA95" transparent opacity={0.7} />
          </mesh>
        </group>
      </Float>
    </group>
  )
}

/* ------------------------------- Score Gauge ------------------------------ */

export function ScoreGauge({ score, color }: { score: number; color: string }) {
  const outer = useRef<THREE.Mesh>(null)
  const prog = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const frac = Math.max(0, Math.min(1, score / 100))
  const speed = demoMode ? 1 / 2.6 : 1 / 1.6

  useFrame((_, delta) => {
    if (outer.current) outer.current.rotation.z += delta * 0.12
    if (prog.current) {
      const geo = prog.current.geometry as THREE.TorusGeometry
      t.current = Math.min(1, t.current + delta * speed)
      const eased = 1 - Math.pow(1 - t.current, 3)
      const full = geo.index ? geo.index.count : 0
      geo.setDrawRange(0, Math.max(6, Math.floor(full * frac * eased)))
    }
  })

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 6]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-5, -3, -4]} intensity={1} color={color} />
      <group rotation={[0, 0, Math.PI / 2]} scale={[-1, 1, 1]}>
        <mesh>
          <torusGeometry args={[1.62, 0.115, 20, 220]} />
          <meshStandardMaterial color="#E7E5DE" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh ref={prog}>
          <torusGeometry args={[1.62, 0.135, 24, 220]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.9}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>
      </group>
      <mesh ref={outer}>
        <torusGeometry args={[2.05, 0.006, 8, 200]} />
        <meshBasicMaterial color="#5FBA95" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/* ---------------------------- Topology (nodes) ---------------------------- */

type Node = {
  pos: [number, number, number]
  size: number
  color: string
  kind: 'hub' | 'space' | 'list'
  name?: string
}

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export interface TopologySpace {
  name: string
  health: number
  lists: { name: string; health: number; tasks?: number }[]
}

function buildGraph(spaces: TopologySpace[]) {
  const nodes: Node[] = [{ pos: [0, 0, 0], size: 0.34, color: '#E01072', kind: 'hub' }]
  const links: { a: THREE.Vector3; b: THREE.Vector3; strong: boolean }[] = []
  const hub = new THREE.Vector3(0, 0, 0)
  const spaceCount = Math.max(1, spaces.length)

  spaces.forEach((space, i) => {
    const angle = (i / spaceCount) * Math.PI * 2
    const radius = 2.5
    const y = Math.sin(i * 1.7) * 0.7
    const sp = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    const color = space.health >= 0.75 ? '#7DE2B0' : space.health >= 0.55 ? '#FFD166' : '#FF9F45'
    nodes.push({ pos: [sp.x, sp.y, sp.z], size: 0.2, color, kind: 'space', name: space.name })
    links.push({ a: hub, b: sp, strong: true })

    const listCount = Math.max(1, space.lists.length)
    space.lists.forEach((list, l) => {
      const a2 = (l / listCount) * Math.PI * 2 + seeded(i * 7 + l) * 0.8
      const r2 = 0.75 + seeded(i * 3 + l * 2) * 0.7
      const lp = new THREE.Vector3(
        sp.x + Math.cos(a2) * r2,
        sp.y + (seeded(i + l * 5) - 0.5) * 1.2,
        sp.z + Math.sin(a2) * r2,
      )
      const lh = list.health
      nodes.push({
        pos: [lp.x, lp.y, lp.z],
        size: 0.055 + lh * 0.06,
        color: lh >= 0.75 ? '#7DE2B0' : lh >= 0.5 ? '#FFD166' : '#FF5C6C',
        kind: 'list',
        name: space.name,
      })
      links.push({ a: sp, b: lp, strong: false })
    })
  })

  return { nodes, links }
}

export function TopologyGraph({ onSelect, spaces = [] }: { onSelect?: (name: string) => void; spaces?: TopologySpace[] }) {
  const group = useRef<THREE.Group>(null)
  const nodeRefs = useRef<THREE.Mesh[]>([])
  const linkRefs = useRef<any[]>([])
  const progress = useRef(0)
  const { nodes, links } = useMemo(() => buildGraph(spaces), [spaces])
  const speed = demoMode ? 1 / 2.4 : 1 / 1.3
  const { camera, raycaster, gl } = useThree()

  // Click-only raycasting: no per-move hover raycasts, which keeps the custom
  // cursor smooth over the report.
  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const targets = nodeRefs.current.filter(Boolean) as THREE.Mesh[]
      const hit = raycaster.intersectObjects(targets, false)[0]
      const name = (hit?.object.userData as { name?: string } | undefined)?.name
      if (name) onSelect?.(name)
    }
    el.addEventListener('pointerdown', onDown)
    return () => el.removeEventListener('pointerdown', onDown)
  }, [camera, raycaster, gl, onSelect])

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.14
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.16) * 0.14

    progress.current = Math.min(1, progress.current + delta * speed)
    const p = progress.current
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const local = Math.min(1, Math.max(0, (p - i * 0.012) / 0.45))
      const eased = 1 - Math.pow(1 - local, 3)
      mesh.scale.setScalar(eased)
    })
    linkRefs.current.forEach((line, i) => {
      if (!line?.material) return
      const local = Math.min(1, Math.max(0, (p - i * 0.008) / 0.5))
      line.material.transparent = true
      line.material.opacity = local * (links[i]?.strong ? 0.5 : 0.28)
    })
  })

  return (
    <group>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 6, 6]} intensity={2} color="#5FBA95" />
      <group ref={group}>
        {links.map((l, i) => (
          <Line
            key={i}
            ref={(el: any) => (linkRefs.current[i] = el)}
            points={[
              [l.a.x, l.a.y, l.a.z],
              [l.b.x, l.b.y, l.b.z],
            ]}
            color={l.strong ? '#24574E' : '#B9C6C0'}
            lineWidth={l.strong ? 1.1 : 0.6}
            transparent
            opacity={0}
          />
        ))}
        {nodes.map((n, i) => (
          <mesh
            key={i}
            ref={(el: any) => (nodeRefs.current[i] = el)}
            position={n.pos}
            scale={0.001}
            userData={{ name: n.name }}
          >
            <sphereGeometry args={[n.size, 20, 20]} />
            <meshStandardMaterial
              color={n.color}
              emissive={n.color}
              emissiveIntensity={n.kind === 'hub' ? 0.9 : 0.45}
              roughness={0.35}
              metalness={0.35}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
