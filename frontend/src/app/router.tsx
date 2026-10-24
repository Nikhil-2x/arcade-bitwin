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

export const router = createBrowserRouter([
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
