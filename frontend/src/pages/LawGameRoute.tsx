import { lazy, Suspense } from 'react'

// The law game pulls in three.js and a 30 MB model, so it loads only when its route is opened.
const LawGamePage = lazy(() => import('./LawGamePage.tsx'))

export default function LawGameRoute() {
  return (
    <Suspense fallback={null}>
      <LawGamePage />
    </Suspense>
  )
}
