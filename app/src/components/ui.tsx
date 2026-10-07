import { forwardRef, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { EASE, fadeUp, stagger } from '../lib/motion'
import { cn } from '../lib/format'

/* ---------------------------------- Logo ---------------------------------- */

export function Logo() {
  return <img src="/brand/logo-wordmark.png" alt="Sharpflow" className="h-[22px] w-auto" />
}

/* --------------------------------- Button --------------------------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'lg'
  icon?: ReactNode
  arrow?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, arrow, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        variant === 'primary' ? 'btn-primary' : 'btn-ghost',
        size === 'lg' && 'px-8 py-4 text-base',
        arrow && 'btn-arrow pr-2.5',
        className,
      )}
      {...rest}
    >
      {children}
      {icon}
    </button>
  )
})

/* --------------------------------- Panels --------------------------------- */

export function Panel({
  className,
  children,
  raised = false,
  hairline = true,
}: {
  className?: string
  children: ReactNode
  raised?: boolean
  hairline?: boolean
}) {
  return (
    <div
      className={cn(
        raised ? 'glass-raised' : 'glass',
        'relative overflow-hidden',
        hairline && 'hairline-top',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('eyebrow', className)}>{children}</div>
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('chip', className)}>{children}</span>
}

export function SectionHeading({
  index,
  title,
  hint,
  className,
}: {
  index: string
  title: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="font-mono text-[11px] text-brand-glow">{index}</span>
          <span className="h-px w-8 bg-line-strong" />
          <Eyebrow>{hint}</Eyebrow>
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl">
          {title}
        </h2>
      </div>
    </div>
  )
}

/* -------------------------------- Progress -------------------------------- */

export function ProgressBar({
  value,
  color = '#24574E',
  height = 6,
  className,
}: {
  value: number
  color?: string
  height?: number
  className?: string
}) {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-brand-ink/10', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 16px ${color}66`,
        }}
      />
    </div>
  )
}

/* ---------------------------------- Icons --------------------------------- */

export function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3l7 3v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12l2.2 2.2L15.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill="currentColor" />
    </svg>
  )
}

export function IconDownload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 18h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* -------------------------------- Motion ---------------------------------- */

export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 20, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 260, damping: 20, mass: 0.4 })

  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      animate="show"
      variants={stagger(0.06)}
    >
      {words.map((w, i) => (
        <motion.span key={i} variants={fadeUp} className="inline-block">
          {w}
          {i < words.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.span>
  )
}
