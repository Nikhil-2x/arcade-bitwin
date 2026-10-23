import type { LevelDef } from './types.ts'
import { Grid } from './Grid.ts'

/** Level 1: four lanes in a serpentine, linked by dark alley shortcuts. */
export const level1: LevelDef = {
  id: 1,
  title: 'The Last Bus',
  place: 'Neighborhood lane',
  story:
    'Evening, after coaching class. The bus drops Priya at the colony gate, twelve minutes from home. Half the streetlights have been out for weeks.',
  tone: 'Quiet, tense, small-scale. This level teaches the basics.',
  time: 90,
  theme: 'lane',
  persona: {
    name: 'The Neglect',
    text: 'You are not a villain. You are every light nobody repaired and every gate nobody locked properly. You do not chase her. You just do not help. Switch off the lights. Close the lane. Watch what happens when a place is left alone.',
  },
  abilities: ['lightsOut', 'closeWay', 'drain'],
  cardTimer: 5,
  hints: true,
  energyStart: 60,
  isolationScale: 1.7,
  script: [
    { at: 14, p: 0.25, kind: 'card', id: 's01' },
    { at: 46, p: 0.65, kind: 'card', id: 's02' },
  ],
  afterRound:
    'Streetlights and nearby shops make a route safer. Reporting a fault can fix it for everyone. Verify helpline numbers in advance (112 for emergencies, 181 and 1091 for women-specific help).',
  startAllies: () => [],
  map: () => {
    const g = new Grid()
    g.rect('.', 1, 14, 30, 2).rect('.', 1, 11, 30, 2).rect('.', 1, 8, 30, 2).rect('.', 1, 5, 30, 2)
    // turns between lanes
    g.rect('.', 29, 13, 2, 1).rect('.', 1, 10, 2, 1).rect('.', 29, 7, 2, 1)
    // alley shortcuts
    g.rect('.', 22, 13, 2, 1).rect('.', 12, 10, 2, 1).rect('.', 24, 7, 2, 1)
    g.rect('Z', 13, 14, 4, 2)
    return {
      grid: g.rows(),
      spawn: [1, 15],
      goal: [1, 5, 2, 2],
      zones: [[13, 14, 4, 2]],
      lamps: [
        { c: 3, r: 14, state: 'on' }, { c: 9, r: 14, state: 'on' }, { c: 15, r: 14, state: 'on' },
        { c: 20, r: 14, state: 'broken' }, { c: 27, r: 14, state: 'off' },
        { c: 27, r: 11, state: 'off' }, { c: 21, r: 11, state: 'off' }, { c: 14, r: 11, state: 'broken' },
        { c: 8, r: 11, state: 'off' }, { c: 3, r: 11, state: 'on' },
        { c: 4, r: 8, state: 'off' }, { c: 11, r: 8, state: 'on' }, { c: 19, r: 8, state: 'off' },
        { c: 26, r: 8, state: 'on' },
        { c: 27, r: 5, state: 'off' }, { c: 20, r: 5, state: 'on' }, { c: 13, r: 5, state: 'off' },
        { c: 7, r: 5, state: 'on' }, { c: 3, r: 5, state: 'on' },
      ],
      gates: [
        { id: 'sc1', tiles: [[22, 13], [23, 13]], shortcut: true },
        { id: 'sc2', tiles: [[12, 10], [13, 10]], shortcut: true },
        { id: 'sc3', tiles: [[24, 7], [25, 7]], shortcut: true },
        { id: 'LA', tiles: [[18, 14], [18, 15]] },
        { id: 'LB', tiles: [[17, 11], [17, 12]] },
        { id: 'LC', tiles: [[18, 8], [18, 9]] },
        { id: 'LD', tiles: [[14, 5], [14, 6]] },
      ],
      interacts: [
        { id: 'salim', kind: 'ally', c: 15, r: 14, label: 'Mr. Salim', color: 0xff9f43 },
        { id: 'aunty', kind: 'ally', c: 26, r: 9, label: 'Neighbor aunty', color: 0xff7eb6 },
      ],
      decor: [
        { type: 'stall', c: 14, r: 13, label: 'Salim Tea' },
        { type: 'house', c: 1, r: 3, label: 'HOME' },
      ],
    }
  },
}
