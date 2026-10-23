import { Navigate } from 'react-router'
import { GameState } from '../game/state/GameState.ts'
import { useGameScene } from '../hooks/useGameScene.ts'
import { PATHS } from '../routes/paths.ts'

const SCENES = ['Ending'] as const

export default function EndingPage() {
  const allowed = GameState.storyFinished
  useGameScene(SCENES, 'Ending', allowed)
  if (!allowed) return <Navigate to={PATHS.menu} replace />
  return <title>Ending | Circle of Allies</title>
}
