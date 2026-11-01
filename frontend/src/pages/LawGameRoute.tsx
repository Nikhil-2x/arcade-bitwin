import { lazy, Suspense } from 'react'

// The law game pulls in three.js and its 3D models, so it loads only when a level is opened.
const LawGamePage = lazy(() => import('./LawGamePage.tsx'))

export default function LawGameRoute() {
  return (
    <Suspense fallback={null}>
      <LawGamePage />
    </Suspense>
  )
}
