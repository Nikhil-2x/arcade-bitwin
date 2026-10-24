import { useState } from 'react'
import { PLAYER_NAMES } from '../config.ts'
import { useLawGame } from '../store/useLawGame.ts'
import { Avatar } from '../ui/Avatar.tsx'

export function CharacterSelect() {
  const { theCase, criminal, selectCharacter } = useLawGame()
  const [pick, setPick] = useState<string | null>(null)

  return (
    <div className="lg-screen">
      <div className="lg-head">
        <span className="lg-kicker">{PLAYER_NAMES[criminal()]} · Obstructor</span>
        <h1>Who are you tonight?</h1>
        <p className="lg-dim" style={{ margin: '6px 0 0' }}>
          You are the culprit. Choose the character you will play. The other three become NPCs and will tell the detective their own stories.
        </p>
      </div>
      <div className="lg-grid4">
        {theCase.suspects.map((s) => (
          <button key={s.id} className={`lg-card ${pick === s.id ? 'sel' : ''}`} onClick={() => setPick(s.id)} aria-pressed={pick === s.id}>
            <Avatar s={s} />
            <h3>{s.name}</h3>
            <span className="lg-badge amber">{s.role}</span>
            <p>{s.profile}</p>
          </button>
        ))}
      </div>
      <div className="lg-foot">
        <button className="lg-btn" disabled={!pick} onClick={() => pick && selectCharacter(pick)}>
          Enter the classroom
        </button>
      </div>
    </div>
  )
}
