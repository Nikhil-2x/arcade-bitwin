import { lazy, Suspense } from 'react'

// Kept apart from the game itself: the level screen needs neither three.js nor a model.
const LevelSelect = lazy(() => import('../features/lawGame/screens/LevelSelect.tsx'))

export default function LawLevelsRoute() {
  return (
    <Suspense fallback={null}>
      <LevelSelect />
    </Suspense>
  )
}
