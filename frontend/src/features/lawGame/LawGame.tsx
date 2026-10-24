import { useEffect } from 'react'
import { Link } from 'react-router'
import './law-game.css'
import { LAW_PATHS } from './paths.ts'
import { BifurcateScreen } from './screens/BifurcateScreen.tsx'
import { Briefing } from './screens/Briefing.tsx'
import { CharacterSelect } from './screens/CharacterSelect.tsx'
import { FinalResult } from './screens/FinalResult.tsx'
import { Handoff } from './screens/Handoff.tsx'
import { HideScreen } from './screens/HideScreen.tsx'
import { RoundResult } from './screens/RoundResult.tsx'
import { SearchScreen } from './screens/SearchScreen.tsx'
import { StatementScreen } from './screens/StatementScreen.tsx'
import { useLawGame } from './store/useLawGame.ts'
import './three/Classroom.tsx'

/** The whole law game: one screen per phase, driven by the store. Mount it anywhere. */
export default function LawGame() {
  const phase = useLawGame((s) => s.phase)
  const start = useLawGame((s) => s.start)

  // Each visit begins a fresh case. (The classroom model starts loading as this module is imported.)
  useEffect(() => start(1), [start])

  return (
    <div className="lg">
      {(phase === 'briefing' || phase === 'handoff-hide' || phase === 'handoff-search' || phase === 'select') && (
        <Link to={LAW_PATHS.arcade} className="lg-btn small ghost" style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
          Exit
        </Link>
      )}
      {phase === 'briefing' && <Briefing />}
      {(phase === 'handoff-hide' || phase === 'handoff-search') && <Handoff />}
      {phase === 'select' && <CharacterSelect />}
      {phase === 'hide' && <HideScreen />}
      {phase === 'statement' && <StatementScreen />}
      {phase === 'search' && <SearchScreen />}
      {phase === 'bifurcate' && <BifurcateScreen />}
      {phase === 'round-result' && <RoundResult />}
      {phase === 'final' && <FinalResult />}
    </div>
  )
}
