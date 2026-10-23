import type { LevelDef } from './types.ts'
import { Grid } from './Grid.ts'

/** Level 2: a noisy festival market, signs and strangers you have to verify. */
export const level2: LevelDef = {
  id: 2,
  title: 'Market Night',
  place: 'Bus station and festival market',
  story:
    'Next evening. Priya missed her connecting bus after a study group and has to cross a festival market to reach the station. The crowd is big but noisy, and no one is looking at her.',
  tone: 'Chaotic, loud, confusing. This level teaches verification and trust.',
  time: 105,
  theme: 'market',
  persona: {
    name: 'The Noise',
    text: 'You are rumor, confusion and the crowd that does not notice. You never touch her. You just make everything unclear: a sign pointing the wrong way, a message from "a friend", a crowd that moves away at the wrong time. If she trusts the wrong thing, you win.',
  },
  abilities: ['decoy', 'crowd', 'fakeMsg', 'drain', 'flicker'],
  hints: false,
  energyStart: 70,
  isolationScale: 1.5,
  script: [
    { at: 12, p: 0.12, kind: 'card', id: 's03' },
    { at: 30, p: 0.3, kind: 'scam' },
    { at: 46, p: 0.5, kind: 'card', id: 's04' },
    { at: 74, p: 0.72, kind: 'card', id: 's05' },
  ],
  afterRound:
    'Never share an OTP. Verify cab and driver details. Public, lit, staffed places are the safest places to ask for help. Report cyber harassment on 1930 or cybercrime.gov.in.',
  // nobody walks with her from the start: company has to be earned during the level
  startAllies: () => [],
  map: () => {
    const g = new Grid()
    g.rect('m', 1, 14, 30, 2).rect('m', 1, 10, 30, 3).rect('m', 1, 6, 30, 3).rect('m', 1, 3, 30, 2)
    g.rect('m', 29, 13, 2, 1).rect('m', 1, 9, 2, 1).rect('m', 29, 5, 2, 1)
    g.rect('m', 22, 13, 2, 1).rect('m', 8, 5, 2, 1)
    // market stalls inside the lanes
    g.rect('#', 8, 11, 2, 1).rect('#', 18, 11, 2, 1).rect('#', 12, 7, 2, 1).rect('#', 22, 7, 2, 1)
    g.rect('#', 16, 14, 1, 1)
    g.rect('Z', 3, 10, 4, 1).rect('Z', 26, 3, 4, 2)
    return {
      grid: g.rows(),
      spawn: [1, 15],
      goal: [1, 3, 2, 2],
      zones: [[3, 10, 4, 1], [26, 3, 4, 2]],
      crowd: 14,
      lamps: [
        { c: 4, r: 14, state: 'on' }, { c: 12, r: 14, state: 'on' }, { c: 20, r: 14, state: 'off' },
        { c: 27, r: 14, state: 'on' }, { c: 26, r: 10, state: 'on' }, { c: 16, r: 10, state: 'broken' },
        { c: 8, r: 10, state: 'on' }, { c: 4, r: 6, state: 'off' }, { c: 11, r: 6, state: 'on' },
        { c: 19, r: 6, state: 'on' }, { c: 27, r: 6, state: 'off' }, { c: 25, r: 3, state: 'on' },
        { c: 16, r: 3, state: 'off' }, { c: 6, r: 3, state: 'on' },
      ],
      gates: [
        { id: 'a1', tiles: [[22, 13], [23, 13]], shortcut: true },
        { id: 'a3', tiles: [[8, 5], [9, 5]], shortcut: true },
        { id: 'MA', tiles: [[24, 14], [24, 15]] },
        { id: 'MB', tiles: [[14, 10], [14, 11], [14, 12]] },
        { id: 'MC', tiles: [[16, 6], [16, 7], [16, 8]] },
      ],
      interacts: [
        { id: 'sign1', kind: 'sign', c: 4, r: 15, label: 'Station', dir: 0, fakeDir: 2, fake: false },
        { id: 'sign2', kind: 'sign', c: 7, r: 14, label: 'Station', dir: 0, fakeDir: 2, fake: true },
        { id: 'sign3', kind: 'sign', c: 27, r: 8, label: 'Station', dir: 0, fakeDir: 2, fake: false },
        { id: 'sign4', kind: 'sign', c: 20, r: 4, label: 'Station', dir: 2, fakeDir: 0, fake: false },
        { id: 'trust', kind: 'trust', c: 16, r: 11, label: 'Lost?', auto: true },
        { id: 'kavya', kind: 'kavya', c: 6, r: 7, label: 'Kavya', color: 0xf5e663 },
        { id: 'cab', kind: 'cab', c: 5, r: 4, label: 'Cab', auto: true },
      ],
      decor: [
        { type: 'stall', c: 16, r: 13, label: 'Snacks' },
        { type: 'npc', c: 16, r: 12, color: 'green' },
        { type: 'npc', c: 17, r: 12, color: 'cyan', small: true },
        { type: 'npc', c: 15, r: 12, color: 'orange', small: true },
        { type: 'npc', c: 19, r: 12, color: 'yellow' },
        { type: 'npc', c: 12, r: 12, color: 'purple' },
        { type: 'stall', c: 4, r: 9, label: 'Phone Repair' },
        { type: 'stall', c: 27, r: 2, label: 'Chai' },
        { type: 'cab', c: 5, r: 3 },
        { type: 'house', c: 1, r: 2, label: 'STATION' },
      ],
    }
  },
}
