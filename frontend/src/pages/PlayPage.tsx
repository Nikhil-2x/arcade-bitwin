import { useCallback } from 'react'
import { Navigate, useParams } from 'react-router'
import { LEVELS } from '../game/data/levels/index.ts'
import { SceneBridge } from '../game/sceneBridge.ts'
import { GameState } from '../game/state/GameState.ts'
import { useGameScene } from '../hooks/useGameScene.ts'
import { parseLevelId, PATHS, PLAY_SCENES } from '../routes/paths.ts'

const NO_SCENES = [] as const

export default function PlayPage() {
  const level = parseLevelId(useParams().levelId)
  // already playing this level: stay on whichever step of it the game is at
  const playing = level !== null && GameState.steps[0]?.level === level && PLAY_SCENES.includes(SceneBridge.active)
  // otherwise start it the same way the level select does
  const start = useCallback(() => {
    GameState.startLevel(level!)
    return GameState.prologueDone ? 'Brief' : 'Prologue'
  }, [level])
  useGameScene(playing ? PLAY_SCENES : NO_SCENES, start, level !== null)

  if (level === null) return <Navigate to={PATHS.levels} replace />
  return <title>{`${LEVELS[level].title} | Circle of Allies`}</title>
}
