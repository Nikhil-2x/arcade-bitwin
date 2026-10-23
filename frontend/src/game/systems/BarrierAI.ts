import { TILE } from '../config/constants.ts'
import type { LevelScene } from '../scenes/LevelScene.ts'
import type { AbilityId } from '../types.ts'

interface Choice {
  id: AbilityId
  x: number
  y: number
  weight: number
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

/**
 * Solo-mode Barrier. It thinks every few seconds (faster in later levels),
 * moves its ghost to a sensible target and then fires one ability.
 */
export class BarrierAI {
  private next = 4
  private pending: { id: AbilityId; t: number } | null = null

  private host: LevelScene

  constructor(host: LevelScene) {
    this.host = host
  }

  update(dt: number) {
    if (this.pending) {
      this.pending.t -= dt
      if (this.pending.t <= 0) {
        this.host.useAbility(this.pending.id)
        this.pending = null
      }
      return
    }
    this.next -= dt
    if (this.next > 0) return
    const pace = [3.4, 2.7, 2.1][this.host.def.id - 1]
    this.next = pace + Math.random() * 1.6
    this.think()
  }

  private think() {
    const h = this.host
    const { px, py } = h
    const choices: Choice[] = []
    const ok = (id: AbilityId) => h.barrier.blockedReason(id, h.now) === null
    const hidden = h.world.data.zones.some((z) => h.world.inRect(px, py, z))
    if (hidden && h.run.isolation < 10) return

    if (ok('lightsOut')) {
      const lamp = h.lamps
        .filter((l) => (l.state === 'on' || l.state === 'broken') && dist(l.x, l.y, px, py) < 420 && dist(l.x, l.y, px, py) > 50)
        .sort((a, b) => dist(a.x, a.y, px, py) - dist(b.x, b.y, px, py))[0]
      if (lamp) choices.push({ id: 'lightsOut', x: lamp.x, y: lamp.y, weight: 3 })
    }
    if (ok('closeWay')) {
      const gate = h.gates
        .filter((g) => h.now >= g.closedUntil && dist(g.x + g.w / 2, g.y + g.h / 2, px, py) > 110 && dist(g.x + g.w / 2, g.y + g.h / 2, px, py) < 380)
        .sort((a, b) => dist(a.x, a.y, px, py) - dist(b.x, b.y, px, py))[0]
      if (gate) choices.push({ id: 'closeWay', x: gate.x + gate.w / 2, y: gate.y + gate.h / 2, weight: 2.5 })
    }
    if (ok('drain') && !hidden && h.run.battery > 15) choices.push({ id: 'drain', x: px, y: py, weight: 1 })
    if (ok('decoy')) {
      const sign = h.signs.find((s) => !s.fake && !s.verified && dist(s.x, s.y, px, py) < 600)
      if (sign) choices.push({ id: 'decoy', x: sign.x, y: sign.y, weight: 2.2 })
      else choices.push({ id: 'decoy', x: px + TILE * 3, y: py, weight: 0.6 })
    }
    if (ok('crowd') && h.crowd.some((n) => dist(n.crew.x, n.crew.y, px, py) < 160)) choices.push({ id: 'crowd', x: px, y: py, weight: 2.2 })
    if (ok('fakeMsg') && !hidden) choices.push({ id: 'fakeMsg', x: px, y: py, weight: 1.2 })
    if (ok('flicker')) {
      const gate = h.gates.find((g) => dist(g.x + g.w / 2, g.y + g.h / 2, px, py) < 300)
      if (gate) choices.push({ id: 'flicker', x: gate.x + gate.w / 2, y: gate.y + gate.h / 2, weight: 1 })
    }
    if (ok('isolate') && h.followers().length) choices.push({ id: 'isolate', x: px, y: py, weight: 2.6 })
    if (!choices.length) return

    const total = choices.reduce((s, c) => s + c.weight, 0)
    let roll = Math.random() * total
    const pick = choices.find((c) => (roll -= c.weight) <= 0) ?? choices[0]
    h.aim = { x: pick.x, y: pick.y }
    this.pending = { id: pick.id, t: 0.8 }
  }
}
