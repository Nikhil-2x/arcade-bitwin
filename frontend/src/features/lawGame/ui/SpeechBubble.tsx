import { Avatar } from './Avatar.tsx'
import type { Speech } from './useSpeech.ts'

export function SpeechBubble({ speech }: { speech: Speech }) {
  return (
    <div className={`lg-speech ${speech.announcement ? 'announce' : ''}`} role="status">
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
    </div>
  )
}
