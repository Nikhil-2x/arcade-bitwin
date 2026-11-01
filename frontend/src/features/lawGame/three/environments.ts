import type { ComponentType } from 'react'
import { REACH } from '../config.ts'
import type { SceneId } from '../types.ts'
import type { Speech } from '../ui/useSpeech.ts'
import type { RoomQueries } from './RoomQueries.ts'

export interface SpawnPoint {
  x: number
  z: number
  yaw: number
}

/** The heavy part of a world: importing it starts its model loading. */
export interface LoadedEnvironment {
  /** Solid things: everything in here can block, hide and hold evidence. */
  Scenery: ComponentType
  Lights: ComponentType
  /** Effects the game logic never touches. */
  Ambience?: ComponentType<{ q: RoomQueries; onSpeech?: (speech: Speech) => void }>
  scale: number
  createQueries: (root: import('three').Object3D) => RoomQueries
  spawn: (q: RoomQueries) => SpawnPoint
  /** Material of the surface the evidence starts on. */
  itemsRestOn: string
}

/** The light part: read before the world loads, to set up the canvas and the controls. */
interface EnvironmentMeta {
  load: () => Promise<{ default: LoadedEnvironment }>
  far: number
  background: string
  dpr: number | [number, number]
  /** Drop resolution when the frame rate falls. */
  adaptive: boolean
  reach: number
  /** How much further than `reach` an item can be placed. */
  placeExtra: number
}

export const ENVIRONMENTS: Record<SceneId, EnvironmentMeta> = {
  classroom: {
    load: () => import('./classroomEnvironment.ts'),
    far: 60,
    background: '#0b0d18',
    dpr: [1, 1.75],
    adaptive: false,
    reach: REACH,
    placeExtra: 0.6,
  },
  railway: {
    load: () => import('./railway/railwayEnvironment.ts'),
    far: 220,
    background: '#1a1838',
    dpr: [1, 1.5],
    adaptive: true,
    // Nothing placed may end up out of the detective's reach: the walkable area here has hard edges.
    reach: 3,
    placeExtra: 0,
  },
}

const loaded = new Map<SceneId, Promise<LoadedEnvironment>>()

/** One stable promise per world, safe to hand to React's `use`. */
export function loadEnvironment(scene: SceneId): Promise<LoadedEnvironment> {
  let p = loaded.get(scene)
  if (!p) {
    p = ENVIRONMENTS[scene].load().then((m) => m.default)
    loaded.set(scene, p)
  }
  return p
}
