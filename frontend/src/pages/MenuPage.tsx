import { useGameScene } from '../hooks/useGameScene.ts'

const SCENES = ['Menu'] as const

export default function MenuPage() {
  useGameScene(SCENES, 'Menu')
  return <title>Menu | Circle of Allies</title>
}
