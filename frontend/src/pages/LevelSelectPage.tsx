import { useGameScene } from '../hooks/useGameScene.ts'

const SCENES = ['LevelSelect'] as const

export default function LevelSelectPage() {
  useGameScene(SCENES, 'LevelSelect')
  return <title>Choose a level | Circle of Allies</title>
}
