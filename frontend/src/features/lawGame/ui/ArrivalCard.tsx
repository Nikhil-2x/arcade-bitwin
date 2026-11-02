import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLawGame } from '../store/useLawGame.ts'

const SHOW_MS = 3600
const EASE = [0.23, 1, 0.32, 1] as const

/** The place name, on the way down from the drone. Only for worlds that have one, and once per screen. */
export function ArrivalCard({ started }: { started: boolean }) {
  const arrival = useLawGame((s) => s.theCase.copy.arrival)
  const [over, setOver] = useState(false)
  const visible = started && !over

  useEffect(() => {
    if (!started) return
    const id = window.setTimeout(() => setOver(true), SHOW_MS)
    return () => window.clearTimeout(id)
  }, [started])

  return (
    <AnimatePresence>
      {visible && arrival && (
        <motion.div className="lg-arrival" aria-live="polite" initial="hidden" animate="shown" exit={{ opacity: 0, transition: { duration: 0.3 } }} transition={{ staggerChildren: 0.08 }}>
          {[<h2 key="t">{arrival.title}</h2>, <p key="s">{arrival.subtitle}</p>].map((line) => (
            <motion.div
              key={line.key}
              variants={{ hidden: { opacity: 0, transform: 'translateY(10px)' }, shown: { opacity: 1, transform: 'translateY(0px)' } }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {line}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
