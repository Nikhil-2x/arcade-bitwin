import { createBrowserRouter, Navigate } from 'react-router'
import GameLayout from '../layouts/GameLayout.tsx'
import EndingPage from '../pages/EndingPage.tsx'
import IntroPage from '../pages/IntroPage.tsx'
import LevelSelectPage from '../pages/LevelSelectPage.tsx'
import MenuPage from '../pages/MenuPage.tsx'
import PlayPage from '../pages/PlayPage.tsx'
import ResultsPage from '../pages/ResultsPage.tsx'
import RoomPage from '../pages/RoomPage.tsx'
import { PATHS } from '../routes/paths.ts'
import { LAW_PATHS } from '../features/lawGame/paths.ts'
import ArcadeHubPage from '../pages/ArcadeHubPage.tsx'
import LawGameRoute from '../pages/LawGameRoute.tsx'

export const router = createBrowserRouter([
  // Standalone pages: outside GameLayout so the Phaser game is not created for them.
  { path: LAW_PATHS.arcade, element: <ArcadeHubPage /> },
  { path: LAW_PATHS.law, element: <LawGameRoute /> },
  {
    path: PATHS.intro,
    element: <GameLayout />,
    children: [
      { index: true, element: <IntroPage /> },
      { path: PATHS.menu, element: <MenuPage /> },
      { path: PATHS.room, element: <RoomPage /> },
      { path: PATHS.levels, element: <LevelSelectPage /> },
      { path: PATHS.play, element: <PlayPage /> },
      { path: PATHS.ending, element: <EndingPage /> },
      { path: PATHS.results, element: <ResultsPage /> },
      { path: '*', element: <Navigate to={PATHS.intro} replace /> },
    ],
  },
])
