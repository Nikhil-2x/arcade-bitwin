import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '../ui/Avatar.tsx'
import { LawNote } from '../ui/LawNote.tsx'
import { useLawGame } from '../store/useLawGame.ts'

const CHAR_MS = 24
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The case file as a short film, read by both players together before anyone hides anything. */
export function Briefing() {
  const finishBriefing = useLawGame((s) => s.finishBriefing)
  const [i, setI] = useState(0)
  // Keyed by beat: each one starts typing from zero without any reset logic.
  return <BeatScene key={i} index={i} onNext={() => setI((n) => n + 1)} onFinish={finishBriefing} />
}

function BeatScene({ index, onNext, onFinish }: { index: number; onNext: () => void; onFinish: () => void }) {
  const theCase = useLawGame((s) => s.theCase)
  const beat = theCase.beats[index]
  const last = index === theCase.beats.length - 1
  const [typed, setTyped] = useState(() => (reduced() ? beat.text.length : 0))
  const done = typed >= beat.text.length

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setTyped((t) => t + 1), CHAR_MS)
    return () => window.clearInterval(id)
  }, [done])

  const advance = useCallback(() => {
    if (!done) setTyped(beat.text.length)
    else if (last) onFinish()
    else onNext()
  }, [done, last, beat, onNext, onFinish])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [advance])

  return (
    <div className="lg-screen lg-cine" onClick={advance}>
      <div className={`lg-cine-bg ${beat.mood}`} />
      <div className="lg-cine-grain" />
      <div className="lg-bar top" />
      <div className="lg-bar bot" />

      <div className="lg-cine-body">
        <span className="lg-kicker">
          {index === 0 ? `${theCase.place} · ` : ''}
          {beat.kicker}
        </span>
        <h2>{beat.title}</h2>
        <p aria-live="polite">
          {beat.text.slice(0, typed)}
          {!done && <span className="lg-caret" />}
        </p>
        {done && beat.lineup && (
          <div className="lg-lineup">
            {theCase.suspects.map((s) => (
              <figure key={s.id}>
                <Avatar s={s} />
                <figcaption>
                  <b>{s.name.split(' ')[0]}</b>
                  <br />
                  <span className="lg-dim">{s.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {done && beat.law && <LawNote law={beat.law} />}
      </div>

      <div className="lg-cine-foot" onClick={(e) => e.stopPropagation()}>
        <div className="lg-dots" aria-hidden>
          {theCase.beats.map((b, n) => (
            <i key={b.title} className={n <= index ? 'on' : ''} />
          ))}
        </div>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="lg-dim" style={{ fontSize: '0.8rem' }}>
            Both players read together
          </span>
          <button className="lg-btn small ghost" onClick={onFinish}>
            Skip
          </button>
          <button className="lg-btn small" onClick={advance}>
            {done ? (last ? 'Begin' : 'Next') : 'Show all'}
          </button>
        </span>
      </div>
    </div>
  )
}
