import type { LevelDef } from './types.ts'
import type { StartAlly } from '../../types.ts'
import { Grid } from './Grid.ts'

/**
 * Level 3: a city-wide power cut. The long hospital road has emergency lights, a Safe Zone and
 * a guard. The underpass is a dark vertical tunnel that cuts through every lane (shorter, riskier).
 */
export const level3: LevelDef = {
  id: 3,
  title: 'The Underpass',
  place: 'Late-night route',
  story:
    'The night before her final exam. A power cut hits the city. The usual road is closed and the only way home goes through an underpass. This is the hardest night, and everything she did in Levels 1 and 2 matters now.',
  tone: 'Dark, tense, emotional, with an uplifting finish.',
  time: 120,
  theme: 'underpass',
  persona: {
    name: 'The Silence',
    text: 'You are the silence of everyone who looked away. You do not need darkness alone. You need people to say "it is not my problem". Cut her off from her allies. Close the underpass. Make her feel there is no one left. But remember: you only win if nobody steps in.',
  },
  abilities: ['lightsOut', 'closeWay', 'decoy', 'crowd', 'fakeMsg', 'drain', 'flicker', 'isolate'],
  cardTimer: 4,
  hints: false,
  energyStart: 80,
  isolationScale: 1.7,
  script: [
    { at: 10, p: 0.2, kind: 'card', id: 's06' },
    { at: 24, p: 0.4, kind: 'code' },
    { at: 40, p: 0.6, kind: 'card', id: 's07' },
    { at: 60, p: 0.8, kind: 'card', id: 's08' },
  ],
  afterRound:
    'Allies, lit places and the right number change the ending. Safety should not depend on luck or on one person: it is built by lights, people and places that do not look away.',
  startAllies: (story) => {
    const a: StartAlly[] = []
    if (story.checkedIn) a.push({ id: 'meera', color: 'cyan', label: 'Meera' })
    if (story.helpedKavya) a.push({ id: 'kavya', color: 'yellow', label: 'Kavya' })
    if (story.networkScore >= 3 && a.length < 2) a.push({ id: 'neighbor', color: 'orange', label: 'Neighbor' })
    return a
  },
  map: (story) => {
    const g = new Grid()
    g.rect('.', 1, 14, 30, 2).rect('.', 1, 11, 30, 2).rect('.', 1, 8, 30, 2).rect('.', 1, 5, 30, 2)
    g.rect('.', 29, 13, 2, 1).rect('.', 1, 10, 2, 1).rect('.', 29, 7, 2, 1)
    g.rect('Z', 20, 8, 5, 2)
    g.rect('u', 14, 5, 2, 11) // the underpass: a dark tunnel through every lane
    if (story.helpedKavya) g.rect('u', 6, 13, 2, 1) // Kavya's bonus path
    const lit = story.reportedLight
    return {
      grid: g.rows(),
      spawn: [1, 15],
      goal: [1, 5, 2, 2],
      zones: [[20, 8, 5, 2]],
      dangerZones: [[14, 5, 2, 11]],
      crowd: 6,
      lamps: [
        { c: 3, r: 14, state: 'on' }, { c: 10, r: 14, state: 'off' }, { c: 24, r: 14, state: 'off' },
        { c: 27, r: 11, state: 'off' }, { c: 20, r: 11, state: 'on' }, { c: 8, r: 11, state: 'off' },
        { c: 4, r: 8, state: 'off' }, { c: 18, r: 8, state: 'on' }, { c: 26, r: 8, state: 'on' },
        { c: 27, r: 5, state: 'on' }, { c: 20, r: 5, state: lit ? 'on' : 'off', community: lit },
        { c: 9, r: 5, state: lit ? 'on' : 'off', community: lit }, { c: 3, r: 5, state: lit ? 'on' : 'off', community: lit },
      ],
      gates: [
        { id: 'tun1', tiles: [[14, 13], [15, 13]] },
        { id: 'tun2', tiles: [[14, 10], [15, 10]] },
        { id: 'tun3', tiles: [[14, 7], [15, 7]] },
        { id: 'LA', tiles: [[8, 14], [8, 15]] },
        { id: 'LB', tiles: [[23, 11], [23, 12]] },
        { id: 'LC', tiles: [[8, 8], [8, 9]] },
        { id: 'LD', tiles: [[24, 5], [24, 6]] },
        ...(story.helpedKavya ? [{ id: 'bonus', tiles: [[6, 13], [7, 13]] as [number, number][], shortcut: true }] : []),
      ],
      interacts: [{ id: 'guard', kind: 'ally', c: 22, r: 9, label: 'Hospital guard', color: 0x4fc3ff }],
      decor: [
        { type: 'hospital', c: 22, r: 7, label: 'HOSPITAL' },
        { type: 'house', c: 1, r: 3, label: 'HOME' },
      ],
    }
  },
}
