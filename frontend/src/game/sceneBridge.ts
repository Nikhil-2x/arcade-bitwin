import Phaser from 'phaser'

/** Every scene that fills the screen. Overlays (Prompt, LevelHud) sit on top of one of these. */
export type SceneKey =
  | 'Boot'
  | 'Trailer'
  | 'Menu'
  | 'LevelSelect'
  | 'Prologue'
  | 'Brief'
  | 'Level'
  | 'RoundEnd'
  | 'LevelResult'
  | 'Ending'
  | 'Results'
  | 'Room'

const OVERLAYS = new Set(['Prompt', 'LevelHud'])

type Listener = (key: SceneKey) => void

let game: Phaser.Game | null = null
let active: SceneKey = 'Boot'
let entry: SceneKey | null = null
const listeners = new Set<Listener>()

/**
 * The seam between Phaser and the router. Scenes keep calling `this.scene.start()` as before;
 * the bridge reports each full-screen scene that starts (so the URL can follow), and lets a route
 * ask for a scene (so back/forward and deep links move the game).
 */
export const SceneBridge = {
  /** Watch every scene once Phaser has built them. Boot is already running by then, which is the default. */
  attach(g: Phaser.Game) {
    game = g
    active = 'Boot'
    g.events.once(Phaser.Core.Events.READY, () => {
      for (const scene of g.scene.getScenes(false)) {
        const key = scene.sys.settings.key
        if (OVERLAYS.has(key)) continue
        scene.sys.events.on(Phaser.Scenes.Events.START, () => {
          active = key as SceneKey
          listeners.forEach((l) => l(active))
        })
      }
    })
    g.events.once(Phaser.Core.Events.DESTROY, () => {
      game = null
      active = 'Boot'
      entry = null
    })
  },

  get active() {
    return active
  },

  /** Switch the game to a scene. While Boot is still loading, it is remembered as the entry instead. */
  show(key: SceneKey) {
    if (key === active) return
    if (!game || active === 'Boot') {
      entry = key
      return
    }
    for (const s of game.scene.getScenes(false)) {
      if (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping()) game.scene.stop(s.sys.settings.key)
    }
    game.scene.start(key)
  },

  /** Run a scene on top of whatever is showing (the Prompt card). */
  overlay(key: string, data: object) {
    game?.scene.start(key, data)
  },

  /** Boot asks once where to go after its gate: the scene the URL asked for, if any. */
  takeEntry(): SceneKey | null {
    const key = entry
    entry = null
    return key
  },

  subscribe(l: Listener) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
}
