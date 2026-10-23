import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { SceneBridge } from '../game/sceneBridge.ts'
import { pathForScene } from '../routes/paths.ts'

/** Game → URL. Each scene change the game makes on its own becomes a history entry. */
export function useSceneSync() {
  const navigate = useNavigate()
  useEffect(
    () =>
      SceneBridge.subscribe((key) => {
        const path = pathForScene(key)
        if (path && path !== location.pathname) void navigate(path)
      }),
    [navigate],
  )
}
