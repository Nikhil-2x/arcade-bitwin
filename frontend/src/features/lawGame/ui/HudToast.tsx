import { motion } from 'motion/react'

/** A note over the game. The centring lives in the same transform that moves it, so that one can't undo the other. */
export function HudToast({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="lg-toast"
      initial={{ opacity: 0, transform: 'translateX(-50%) translateY(12px)' }}
      animate={{ opacity: 1, transform: 'translateX(-50%) translateY(0px)' }}
      exit={{ opacity: 0, transform: 'translateX(-50%) translateY(12px)' }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  )
}
