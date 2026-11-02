import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar } from '../ui/Avatar.tsx'
import { LawNote } from '../ui/LawNote.tsx'
import { useLawGame } from '../store/useLawGame.ts'

const CHAR_MS = 24
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The case file as a short film, read by both players together before anyone hides anything. */
export function Briefing() {
  const finishBriefing = useLawGame((s) => s.finishBriefing)
  const theCase = useLawGame((s) => s.theCase)
  const [i, setI] = useState(0)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(`/audio/voiceover/${theCase.scene}.mp3`)
    audioRef.current = audio
    audio.volume = 0.85

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Delayed by browser autoplay policy until player interacts
      })
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
  }, [theCase.scene])

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {})
      setMuted(false)
    } else {
      const nextMuted = !audioRef.current.muted
      audioRef.current.muted = nextMuted
      setMuted(nextMuted)
    }
  }, [])

  const ensurePlaying = useCallback(() => {
    if (audioRef.current && audioRef.current.paused && !muted) {
      audioRef.current.play().catch(() => {})
    }
  }, [muted])

  const handleFinish = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    finishBriefing()
  }, [finishBriefing])

  // Keyed by beat: each one starts typing from zero without any reset logic.
  return (
    <BeatScene
      key={i}
      index={i}
      onNext={() => {
        ensurePlaying()
        setI((n) => n + 1)
      }}
      onFinish={handleFinish}
      muted={muted}
      onToggleMute={toggleMute}
      ensureAudio={ensurePlaying}
    />
  )
}

function BeatScene({
  index,
  onNext,
  onFinish,
  muted,
  onToggleMute,
  ensureAudio,
}: {
  index: number
  onNext: () => void
  onFinish: () => void
  muted: boolean
  onToggleMute: (e?: React.MouseEvent) => void
  ensureAudio: () => void
}) {
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
    ensureAudio()
    if (!done) setTyped(beat.text.length)
    else if (last) onFinish()
    else onNext()
  }, [done, last, beat, onNext, onFinish, ensureAudio])

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
          <button
            type="button"
            className="lg-btn small ghost"
            onClick={onToggleMute}
            title={muted ? 'Unmute voiceover' : 'Mute voiceover'}
            aria-label={muted ? 'Unmute voiceover' : 'Mute voiceover'}
          >
            {muted ? '🔇 Voice' : '🔊 Voice'}
          </button>
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
