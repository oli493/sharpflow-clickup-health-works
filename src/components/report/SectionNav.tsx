import { motion } from 'framer-motion'
import { useScrollSpy } from '../../lib/useScrollSpy'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'categories', label: 'Categories' },
  { id: 'structure', label: 'Structure' },
  { id: 'findings', label: 'Findings' },
  { id: 'intelligence', label: 'Intelligence' },
]

export default function SectionNav() {
  const active = useScrollSpy(
    sections.map((s) => s.id),
    180,
  )

  return (
    <div className="sticky top-[68px] z-30 mb-8 border-y border-line bg-ink/70 backdrop-blur-xl">
      <div className="flex gap-1 overflow-x-auto py-2.5">
        {sections.map((s) => {
          const on = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`relative whitespace-nowrap rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                on ? 'text-magenta' : 'text-txt-faint hover:text-txt-primary'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="section-pill"
                  className="absolute inset-0 rounded-full bg-magenta/10"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
