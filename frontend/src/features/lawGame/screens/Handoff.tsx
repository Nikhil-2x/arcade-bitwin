import { PLAYER_NAMES } from '../config.ts'
import { useLawGame } from '../store/useLawGame.ts'

/** A blank screen between turns, so the player who is not up never sees the other's work. */
export function Handoff() {
  const { phase, round, criminal, detective, confirmHandoff } = useLawGame()
  const hiding = phase === 'handoff-hide'
  const c = PLAYER_NAMES[criminal()]
  const d = PLAYER_NAMES[detective()]

  return (
    <div className="lg-screen lg-handoff">
      <div className="lg-center">
        <span className="lg-kicker">Round {round + 1} of 2</span>
        <div className="lg-eyes" aria-hidden>
          {'👀'}
        </div>
        {hiding ? (
          <>
            <h1>{d}, look away</h1>
            <p>
              <b>{c}</b> is the <span className="lg-badge red">Obstructor</span> this round. Pick a suspect, then hide the evidence and write an alibi. {d} is the Investigating Officer and must not watch.
            </p>
            <button className="lg-btn" onClick={confirmHandoff} style={{ marginTop: 20 }}>
              {c}: I'm ready
            </button>
          </>
        ) : (
          <>
            <h1>{c}, look away</h1>
            <p>
              The room is set. <b>{d}</b> is the <span className="lg-badge teal">Detective</span> now: find every piece of evidence, sort it, and name the culprit.
            </p>
            <button className="lg-btn" onClick={confirmHandoff} style={{ marginTop: 20 }}>
              {d}: enter the scene
            </button>
          </>
        )}
      </div>
    </div>
  )
}
