import { Navigate } from 'react-router'
import { GameState } from '../game/state/GameState.ts'
import { useGameScene } from '../hooks/useGameScene.ts'
import { PATHS } from '../routes/paths.ts'

const SCENES = ['Results'] as const

export default function ResultsPage() {
  const allowed = GameState.storyFinished
  useGameScene(SCENES, 'Results', allowed)
  if (!allowed) return <Navigate to={PATHS.menu} replace />
  return <title>Results | Circle of Allies</title>
}
