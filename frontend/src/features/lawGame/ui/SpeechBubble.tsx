import { motion } from 'motion/react'
import { Avatar } from './Avatar.tsx'
import type { Speech } from './useSpeech.ts'

export function SpeechBubble({ speech }: { speech: Speech }) {
  return (
    <motion.div
      className={`lg-speech ${speech.announcement ? 'announce' : ''}`}
      role="status"
      initial={{ opacity: 0, transform: 'translateY(12px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      exit={{ opacity: 0, transform: 'translateY(12px)' }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      {speech.suspect ? <Avatar s={speech.suspect} /> : !speech.announcement && <span aria-hidden style={{ fontSize: '1.6rem' }}>🗣️</span>}
      <div>
        <b>{speech.name}</b>
        <q>{speech.text}</q>
        {speech.law && (
          <span className="lg-speech-law">
            {speech.law.act}, {speech.law.section}: {speech.law.title}
          </span>
        )}
      </div>
    </motion.div>
  )
}
