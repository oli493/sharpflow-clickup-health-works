import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE, d } from '../lib/motion'

export default function IntroLoader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDone(true), d(1.5) * 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: d(0.6), ease: EASE } }}
          className="fixed inset-0 z-[90] grid place-items-center bg-ink"
        >
          <div className="flex flex-col items-center">
            <motion.svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              initial="hidden"
              animate="show"
            >
              <motion.path
                d="M5 7h9.5a3.5 3.5 0 0 1 0 7H9"
                stroke="#E01072"
                strokeWidth="2.1"
                strokeLinecap="round"
                variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }}
                transition={{ duration: d(0.8), ease: EASE }}
              />
              <motion.path
                d="M19 17H9.5a3.5 3.5 0 0 1 0-7H15"
                stroke="#5FBA95"
                strokeWidth="2.1"
                strokeLinecap="round"
                variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }}
                transition={{ duration: d(0.8), ease: EASE, delay: d(0.35) }}
              />
            </motion.svg>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: d(0.9), duration: d(0.5) }}
              className="mt-5 font-display text-sm font-medium tracking-tight text-txt-primary"
            >
              Sharpflow <span className="text-txt-faint">ClickUp Health</span>
            </motion.div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: d(0.4), duration: d(1.0), ease: EASE }}
              className="mt-4 h-[2px] w-40 origin-left rounded-full bg-gradient-to-r from-brand-glow to-magenta"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
