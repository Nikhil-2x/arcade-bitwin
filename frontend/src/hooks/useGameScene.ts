import { useEffect } from 'react'
import { SceneBridge, type SceneKey } from '../game/sceneBridge.ts'

/**
 * URL → game. A page names the scenes it covers; if the game is showing something else
 * (the user pressed back/forward or opened a link), it switches to `enter`.
 * When the game itself moved here, the scene already matches and nothing happens.
 */
export function useGameScene(owns: readonly SceneKey[], enter: SceneKey | (() => SceneKey), enabled = true) {
  useEffect(() => {
    if (!enabled || owns.includes(SceneBridge.active)) return
    SceneBridge.show(typeof enter === 'function' ? enter() : enter)
  }, [owns, enter, enabled])
}
