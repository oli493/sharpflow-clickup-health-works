import type { Easing, Transition, Variants } from 'framer-motion'

const params =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

/** Recording-friendly pacing: append ?demo=1 to slow & space animations. */
export const demoMode = params.get('demo') === '1'
const pace = demoMode ? 1.8 : 1

export const EASE: Easing = [0.16, 1, 0.3, 1]
export const EASE_INOUT: Easing = [0.65, 0, 0.35, 1]

export const d = (seconds: number) => seconds * pace

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 1 }
export const springBouncy: Transition = { type: 'spring', stiffness: 320, damping: 18, mass: 0.8 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: d(0.7), ease: EASE } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: d(0.6), ease: EASE } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: d(0.6), ease: EASE } },
}

export const stagger = (each = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: d(each), delayChildren: d(delay) } },
})
