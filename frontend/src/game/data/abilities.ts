import type { AbilityDef, AbilityId } from '../types.ts'

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  lightsOut: {
    id: 'lightsOut', name: 'Lights Out', cost: 15, cooldown: 3, color: 0xf5e663,
    desc: 'Switch off a streetlight', counter: 'Report the fault or stay near an ally',
  },
  closeWay: {
    id: 'closeWay', name: 'Close the Way', cost: 25, cooldown: 10, color: 0xff7a45,
    desc: 'Block a path or gate for 8s', counter: 'Alternate route or a helpline call',
  },
  decoy: {
    id: 'decoy', name: 'Decoy Sign', cost: 25, cooldown: 8, color: 0xff5ca8,
    desc: 'A fake sign that points to a dead end', counter: 'Verify with the map or an ally',
  },
  crowd: {
    id: 'crowd', name: 'Crowd Flow', cost: 25, cooldown: 10, color: 0x4fc3ff,
    desc: 'Redirect foot traffic away', counter: 'Stay in a Safe Zone',
  },
  fakeMsg: {
    id: 'fakeMsg', name: 'Fake Message', cost: 40, cooldown: 12, color: 0x3ddc84,
    desc: 'Send a fake text or call', counter: 'Code Phrase, Ignore or Report',
  },
  drain: {
    id: 'drain', name: 'Drain', cost: 15, cooldown: 6, color: 0xb388ff,
    desc: 'Heavy app update: battery -5%', counter: 'A charge point',
  },
  flicker: {
    id: 'flicker', name: 'Flicker Bluff', cost: 0, cooldown: 0, color: 0xffffff, free: true,
    desc: 'Looks like a closure, but is not', counter: 'Move on and test the path',
  },
  isolate: {
    id: 'isolate', name: 'Isolate', cost: 35, cooldown: 14, color: 0xff4a4a,
    desc: 'Break every ally link for 8s', counter: 'Share Location or Code Phrase',
  },
}
