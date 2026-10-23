import { Outlet } from 'react-router'
import CrtFeed from '../components/CrtFeed.tsx'
import FlashlightCursor from '../components/FlashlightCursor.tsx'
import RotateNotice from '../components/RotateNotice.tsx'
import GameCanvas from '../game/GameCanvas.tsx'
import { useSceneSync } from '../hooks/useSceneSync.ts'

/**
 * The stage every route shares: one Phaser canvas plus the DOM layers Phaser can't do cheaply.
 * Pages render into the Outlet and only tell the game which scene they stand for.
 */
export default function GameLayout() {
  useSceneSync()
  return (
    <div className="stage">
      <GameCanvas />
      <CrtFeed />
      <FlashlightCursor />
      <RotateNotice />
      <Outlet />
    </div>
  )
}
