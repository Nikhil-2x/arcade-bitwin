import type { LevelDef } from './types.ts'
import { Grid } from './Grid.ts'

/**
 * Level 4: The Metro Crossing.
 * Midnight arrival at an outer transit terminal with construction detours,
 * an overbridge bypass, a 24/7 chemist safe haven, and transit security.
 */
export const level4: LevelDef = {
  id: 4,
  title: 'The Metro Crossing',
  place: 'Transit terminal and overbridge',
  story:
    'Past midnight after a university project deadline. The last train terminates at the outer ring road. Road repair detours block the main pedestrian walkway, forcing Priya through the outer depot lanes and the perimeter bridge.',
  tone: 'Desolate, watchful, high-stakes. Stay alert, verify routes, and use lit refuges.',
  time: 115,
  theme: 'underpass',
  persona: {
    name: 'The Hesitation',
    text: 'You are the doubt before taking action and the hesitation that leaves someone stranded. You convince bystanders that someone else will step up, and convince her to second-guess every lit haven. Dim the lamps, close the crossing, and let hesitation win.',
  },
  abilities: ['lightsOut', 'closeWay', 'decoy', 'crowd', 'fakeMsg', 'drain', 'flicker', 'isolate'],
  hints: false,
  energyStart: 75,
  isolationScale: 1.6,
  script: [
    { at: 12, p: 0.18, kind: 'card', id: 's09' },
    { at: 30, p: 0.38, kind: 'scam' },
    { at: 50, p: 0.58, kind: 'card', id: 's10' },
    { at: 72, p: 0.78, kind: 'card', id: 's11' },
  ],
  afterRound:
    'Transit hubs, 24/7 pharmacies, and staffed stations are critical safe havens. Memorize 139 for railway transit safety and 112 for all urgent emergencies. Always share your live trip before heading into low-visibility routes.',
  startAllies: () => [],
  map: () => {
    const g = new Grid()
    // Four main serpentine transit lanes
    g.rect('.', 1, 14, 30, 2).rect('.', 1, 11, 30, 2).rect('.', 1, 8, 30, 2).rect('.', 1, 5, 30, 2)
    // Turns between lanes
    g.rect('.', 29, 13, 2, 1).rect('.', 1, 10, 2, 1).rect('.', 29, 7, 2, 1)
    // Vertical overbridge bypass corridor
    g.rect('u', 18, 5, 2, 11)
    // Safe Zones: 24/7 Chemist on lane 1, Metro Security kiosk on lane 3
    g.rect('Z', 8, 14, 4, 2).rect('Z', 22, 8, 4, 2)
    // Shortcut footbridges
    g.rect('.', 12, 13, 2, 1).rect('.', 24, 10, 2, 1).rect('.', 8, 7, 2, 1)

    return {
      grid: g.rows(),
      spawn: [1, 15],
      goal: [1, 5, 2, 2],
      zones: [
        [8, 14, 4, 2],
        [22, 8, 4, 2],
      ],
      dangerZones: [[18, 5, 2, 11]],
      crowd: 8,
      lamps: [
        { c: 3, r: 14, state: 'on' },
        { c: 10, r: 14, state: 'on' },
        { c: 16, r: 14, state: 'off' },
        { c: 22, r: 14, state: 'broken' },
        { c: 28, r: 14, state: 'on' },
        { c: 27, r: 11, state: 'off' },
        { c: 20, r: 11, state: 'on' },
        { c: 14, r: 11, state: 'off' },
        { c: 6, r: 11, state: 'broken' },
        { c: 3, r: 11, state: 'on' },
        { c: 4, r: 8, state: 'off' },
        { c: 11, r: 8, state: 'on' },
        { c: 16, r: 8, state: 'off' },
        { c: 24, r: 8, state: 'on' },
        { c: 28, r: 8, state: 'on' },
        { c: 27, r: 5, state: 'off' },
        { c: 21, r: 5, state: 'on' },
        { c: 14, r: 5, state: 'broken' },
        { c: 7, r: 5, state: 'on' },
        { c: 3, r: 5, state: 'on' },
      ],
      gates: [
        { id: 'sc1', tiles: [[12, 13], [13, 13]], shortcut: true },
        { id: 'sc2', tiles: [[24, 10], [25, 10]], shortcut: true },
        { id: 'sc3', tiles: [[8, 7], [9, 7]], shortcut: true },
        { id: 'bp1', tiles: [[18, 13], [19, 13]] },
        { id: 'bp2', tiles: [[18, 10], [19, 10]] },
        { id: 'bp3', tiles: [[18, 7], [19, 7]] },
        { id: 'NA', tiles: [[17, 14], [17, 15]] },
        { id: 'NB', tiles: [[16, 11], [16, 12]] },
        { id: 'NC', tiles: [[13, 8], [13, 9]] },
        { id: 'ND', tiles: [[15, 5], [15, 6]] },
      ],
      interacts: [
        { id: 'chemist', kind: 'ally', c: 9, r: 14, label: 'Pharmacist Rao', color: 0x3ddc84 },
        { id: 'guard', kind: 'ally', c: 24, r: 9, label: 'Metro security', color: 0x4fc3ff },
        { id: 'sign1', kind: 'sign', c: 5, r: 15, label: 'Colony Road', dir: 0, fakeDir: 2, fake: false },
        { id: 'sign2', kind: 'sign', c: 26, r: 12, label: 'Overbridge', dir: 2, fakeDir: 0, fake: false },
        { id: 'trust', kind: 'trust', c: 15, r: 11, label: 'Need help?', auto: true },
      ],
      decor: [
        { type: 'bus_stop', c: 1, r: 13, label: 'TERMINAL' },
        { type: 'stall', c: 8, r: 13, label: '24/7 Chemist' },
        { type: 'barricade', c: 15, r: 13 },
        { type: 'scooter', c: 5, r: 14 },
        { type: 'cab', c: 26, r: 14 },
        { type: 'house', c: 1, r: 3, label: 'HOME' },
      ],
    }
  },
}

