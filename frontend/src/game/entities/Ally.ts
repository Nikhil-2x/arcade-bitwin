import { Crewmate } from './Crewmate.ts'

export type AllyMode = 'follow' | 'walk' | 'return' | 'idle'

/** A person who helps Priya: a follower in her light, or someone still walking towards her. */
export interface Ally {
  id: string
  crew: Crewmate
  mode: AllyMode
  /** Seconds of help left (Infinity = for the whole round). */
  ttl: number
  path: [number, number][]
  repath: number
  home?: [number, number]
  /** Counts towards the network once it has reached Priya. */
  joined: boolean
  lastX: number
  lastY: number
  /** Stable number for this ally, so the second computer in a room can match it up. */
  uid?: number
  /** Name tag, for helpers that appear (recruited NPCs keep their own). */
  label?: string
}

export const NPC_COLORS: Record<string, string> = {
  salim: 'orange',
  aunty: 'lime',
  kavya: 'yellow',
  guard: 'blue',
  meera: 'cyan',
  neighbor: 'orange',
  patrol: 'blue',
  bystander: 'green',
  helper: 'white',
}
