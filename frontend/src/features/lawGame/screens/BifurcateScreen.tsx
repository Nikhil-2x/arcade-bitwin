import { useCallback, useRef, useState } from 'react'
import { PLAYER_NAMES } from '../config.ts'
import { useLawGame } from '../store/useLawGame.ts'
import type { Evidence, Verdict } from '../types.ts'
import { Avatar } from '../ui/Avatar.tsx'
import { clock, useCountdown } from '../ui/useCountdown.ts'

type Bin = Verdict | 'tray'

/** Sort what was found into relevant and irrelevant, then use the hint to name the culprit. */
export function BifurcateScreen() {
  const { theCase, world, collected, hint, detective, submitSort, accuse } = useLawGame()
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const [focus, setFocus] = useState<Evidence | null>(null)
  const [over, setOver] = useState<Bin | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const submitted = hint !== null
  const sent = useRef(false)
  const used = useRef(0)

  const found = theCase.evidences.filter((e) => collected.includes(e.id))
  const missing = theCase.evidences.filter((e) => !collected.includes(e.id))
  const allSorted = found.every((e) => verdicts[e.id])

  const submit = useCallback(() => {
    if (sent.current) return
    sent.current = true
    submitSort(verdicts, used.current)
  }, [submitSort, verdicts])
  const { left } = useCountdown(theCase.timing.bifurcate, !submitted, submit, used)

  const place = (id: string, bin: Bin) =>
    setVerdicts((v) => {
      const next = { ...v }
      if (bin === 'tray') delete next[id]
      else next[id] = bin
      return next
    })

  const card = (e: Evidence) => (
    <div
      key={e.id}
      className="lg-ev"
      draggable={!submitted}
      tabIndex={0}
      onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)}
      onMouseEnter={() => setFocus(e)}
      onFocus={() => setFocus(e)}
    >
      <b>{e.name}</b>
      {!submitted && (
        <span className="acts">
          <button className="lg-btn small ghost" onClick={() => place(e.id, 'relevant')}>
            Relevant
          </button>
          <button className="lg-btn small ghost" onClick={() => place(e.id, 'irrelevant')}>
            Irrelevant
          </button>
        </span>
      )}
    </div>
  )

  const bin = (kind: Verdict, title: string, cls: string) => (
    <div
      className={`lg-bin ${cls} ${over === kind ? 'over' : ''}`}
      onDragOver={(ev) => {
        ev.preventDefault()
        setOver(kind)
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(ev) => {
        ev.preventDefault()
        setOver(null)
        const id = ev.dataTransfer.getData('text/plain')
        if (id && !submitted) place(id, kind)
      }}
    >
      <h3>{title}</h3>
      {found.filter((e) => verdicts[e.id] === kind).map(card)}
    </div>
  )

  return (
    <div className="lg-screen">
      <div className="lg-suspects">
        {theCase.suspects.map((s) => {
          const isHint = hint?.suspectId === s.id
          const body = s.id === world?.characterId ? world.statement : s.statement
          return (
            <div
              key={s.id}
              className={`lg-sus ${isHint ? 'hint' : ''} ${pick === s.id ? 'pick' : ''}`}
              role={submitted ? 'button' : undefined}
              tabIndex={submitted ? 0 : undefined}
              aria-pressed={submitted ? pick === s.id : undefined}
              onClick={submitted ? () => setPick(s.id) : undefined}
              onKeyDown={submitted ? (e) => (e.key === 'Enter' || e.key === ' ') && setPick(s.id) : undefined}
            >
              {isHint && <span className="lg-badge teal">Least likely culprit</span>}
              <Avatar s={s} />
              <div>
                <b>{s.name}</b>
                <small>{s.role}</small>
                <q>{body}</q>
              </div>
            </div>
          )
        })}
      </div>

      <div className="lg-board">
        <div className="lg-bins">
          <div className="lg-tray">
            <h3 style={{ flexBasis: '100%', fontSize: '0.9rem', color: 'var(--lg-dim)' }}>
              {PLAYER_NAMES[detective()]} · Evidence board {!submitted && <span className="lg-time" style={{ fontSize: '1rem', float: 'right' }}>{clock(left)}</span>}
            </h3>
            {found.filter((e) => !verdicts[e.id]).map(card)}
            {missing.map((e) => (
              <div key={e.id} className="lg-ev missing">
                <b>Not found</b>
                <small className="lg-dim">Counts as a miss</small>
              </div>
            ))}
          </div>
          {bin('relevant', 'Relevant to the case', 'rel')}
          {bin('irrelevant', 'Irrelevant', 'irr')}
        </div>

        <aside className="lg-info" aria-live="polite">
          {focus ? (
            <>
              <h3>{focus.name}</h3>
              <p>{focus.description}</p>
              <h4>How it may connect</h4>
              <p>{focus.connection}</p>
              <h4>If you find this at a scene</h4>
              <ul>
                {focus.precautions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <h4>Laws and sections</h4>
              {focus.laws.map((l) => (
                <div className="law" key={l.act + l.section}>
                  <b>{l.section}: {l.title}</b>
                  <small>{l.act}</small>
                  <p style={{ margin: '3px 0 0' }}>{l.summary}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              <h3>Hover over a clue</h3>
              <p className="lg-dim">
                Each clue shows how it may tie to the case, what the public should do around it, and which laws apply. Drag clues into the bins, or use the buttons.
              </p>
            </>
          )}
        </aside>
      </div>

      <div className="lg-bottom">
        <span className="lg-dim" style={{ fontSize: '0.88rem', maxWidth: '60ch' }}>
          {!submitted
            ? 'Sort every clue. Each mistake makes the suspect hint less trustworthy.'
            : hint && 'The highlighted suspect looks the least likely to have done it, but sorting errors can steer the hint wrong. Click the suspect you accuse.'}
        </span>
        {!submitted ? (
          <button className="lg-btn" disabled={!allSorted} onClick={submit}>
            Confirm sorting
          </button>
        ) : (
          <button className="lg-btn" disabled={!pick} onClick={() => pick && accuse(pick)}>
            Accuse {theCase.suspects.find((s) => s.id === pick)?.name.split(' ')[0] ?? ''}
          </button>
        )}
      </div>
    </div>
  )
}
