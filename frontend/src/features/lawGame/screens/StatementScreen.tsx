import { useState } from 'react'
import { MIN_STATEMENT_WORDS } from '../engine/statement.ts'
import { useLawGame } from '../store/useLawGame.ts'
import { Avatar } from '../ui/Avatar.tsx'
import { LawNote } from '../ui/LawNote.tsx'
import { clock, useCountdown } from '../ui/useCountdown.ts'

const FALSE_INFO = {
  act: 'Bharatiya Nyaya Sanhita, 2023',
  section: 'Section 212',
  title: 'Furnishing false information',
  summary: 'Giving false information to a public servant, such as a police officer, when legally bound to give true information is an offence.',
}

export function StatementScreen() {
  const { theCase, world, finishStatement } = useLawGame()
  const [text, setText] = useState('')
  const me = theCase.suspects.find((s) => s.id === world?.characterId)
  const npcs = theCase.suspects.filter((s) => s.id !== world?.characterId)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const ready = words >= MIN_STATEMENT_WORDS

  const submit = () => finishStatement(text)
  const { left } = useCountdown(theCase.timing.statement, true, submit)

  if (!me) return null
  return (
    <div className="lg-screen">
      <div className="lg-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <span className="lg-kicker">Alibi</span>
          <h1>Say it like you mean it</h1>
          <p className="lg-dim" style={{ margin: '6px 0 0' }}>
            These are the statements the three NPCs will give the detective. Type {me.name.split(' ')[0]}'s statement so it is just as believable.
          </p>
        </div>
        <span className={`lg-pill lg-time ${left <= 10 ? 'low' : ''}`}>{clock(left)}</span>
      </div>

      <div className="lg-split">
        <div className="lg-stack">
          {npcs.map((s) => (
            <div key={s.id} className="lg-card lg-npc">
              <Avatar s={s} />
              <div>
                <b>{s.name}</b> <span className="lg-dim">· {s.role}</span>
                <q>{s.statement}</q>
              </div>
            </div>
          ))}
        </div>

        <div className="lg-stack">
          <div className="lg-card lg-npc" style={{ borderColor: 'var(--lg-amber)' }}>
            <Avatar s={me} />
            <div>
              <b>{me.name}</b> <span className="lg-badge red">You</span>
              <p style={{ margin: '4px 0 0' }}>Where were you between 4:30 and 7:15 PM? Name a place, a time and someone who saw you.</p>
            </div>
          </div>
          <textarea
            className="lg-type"
            autoFocus
            value={text}
            maxLength={320}
            placeholder="I was in the…"
            onChange={(e) => setText(e.target.value)}
            // Typed from scratch: pasting a ready-made alibi would skip the point of the round.
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            aria-label="Your statement"
          />
          <span className={ready ? 'lg-badge teal' : 'lg-badge amber'} style={{ alignSelf: 'flex-start' }}>
            {words} words {ready ? '' : `· at least ${MIN_STATEMENT_WORDS}`}
          </span>
          <LawNote law={FALSE_INFO} label="Reality check">
            In this game you are playing the culprit. In real life, lying to the police about where you were is an offence of its own.
          </LawNote>
        </div>
      </div>

      <div className="lg-foot">
        <button className="lg-btn" disabled={!ready} onClick={submit}>
          Lock the room and hand over
        </button>
      </div>
    </div>
  )
}
