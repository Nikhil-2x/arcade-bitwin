import { useGameScene } from '../hooks/useGameScene.ts'

// Boot counts as the intro too: on a fresh load it picks trailer or menu itself.
const SCENES = ['Boot', 'Trailer'] as const

export default function IntroPage() {
  useGameScene(SCENES, 'Trailer')
  return <title>Circle of Allies</title>
}
