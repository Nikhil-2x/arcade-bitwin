import Phaser from 'phaser'
import { BALANCE, COLORS, FONT, H, HUD_H, BAR_Y, TILE, W } from '../config/constants.ts'
import { ABILITIES } from '../data/abilities.ts'
import { CODE_PHRASES, FAKE_PHRASES, RIDE_OPTIONS, SCAMS, TRUST_OPTIONS, cardById } from '../data/helplines.ts'
import { LEVELS } from '../data/levels/index.ts'
import type { LevelDef } from '../data/levels/index.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { NPC_COLORS } from '../entities/Ally.ts'
import type { Ally, AllyMode } from '../entities/Ally.ts'
import { Net, waitingPlate } from '../net/Net.ts'
import type { AllySnap, Audience, LevelFx, LevelSnap, SfxName } from '../net/protocol.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerRecord, Step, Story } from '../state/GameState.ts'
import { BarrierAI } from '../systems/BarrierAI.ts'
import { BarrierSystem } from '../systems/BarrierSystem.ts'
import { LightSystem } from '../systems/LightSystem.ts'
import { World } from '../systems/World.ts'
import { bakeWorld } from '../systems/WorldRenderer.ts'
import type { AbilityId, GateDef, InteractDef, LampDef, LampState } from '../types.ts'
import { Hud } from '../ui/Hud.ts'
import { hex, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'
import { shuffle } from '../utils/shuffle.ts'
import type { PromptConfig, PromptResult } from './PromptScene.ts'

const T = TILE
const FAST_FORWARD = import.meta.env.DEV ? Number(/ff=(\d+)/.exec(location.hash)?.[1] ?? 1) : 1
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)
/** How far Priya's own screen is zoomed in on two computers. */
const RUNNER_ZOOM = 2

/** One side's controls: this keyboard, the other computer's keys, or nothing. */
interface Pad {
  down(key: string): boolean
  /** Pressed since the last check (like Phaser's JustDown). */
  tap(key: string): boolean
}
const NO_PAD: Pad = { down: () => false, tap: () => false }
const keyPad = (keys: Record<string, Phaser.Input.Keyboard.Key>): Pad => ({
  down: (k) => keys[k].isDown,
  tap: (k) => Phaser.Input.Keyboard.JustDown(keys[k]),
})
/** Keys held and pressed on the other computer, as last reported. */
class NetPad implements Pad {
  held = new Set<string>()
  taps = new Set<string>()
  down(k: string) {
    return this.held.has(k)
  }
  tap(k: string) {
    return this.taps.delete(k)
  }
}

interface LampObj {
  def: LampDef
  x: number
  y: number
  state: LampState
  restore: LampState
  outUntil: number
  gfx: Phaser.GameObjects.Graphics
  glow: Phaser.GameObjects.Image
  phase: number
}
interface GateObj {
  def: GateDef
  x: number
  y: number
  w: number
  h: number
  closedUntil: number
  fakeUntil: number
  passed: boolean
  gfx: Phaser.GameObjects.Graphics
}
interface SignObj {
  id: string
  c: number
  r: number
  x: number
  y: number
  fake: boolean
  verified: boolean
  gfx: Phaser.GameObjects.Graphics
}
interface NpcObj {
  def: InteractDef
  crew: Crewmate
  used: boolean
  x: number
  y: number
}
interface CrowdObj {
  crew: Crewmate
  angle: number
  turnAt: number
}
type Focus =
  | { kind: 'report'; lamp: LampObj; label: string; need: number }
  | { kind: 'verify'; sign: SignObj; label: string; need: number }
  | { kind: 'npc'; npc: NpcObj; label: string; need: number }

export class LevelScene extends Phaser.Scene {
  constructor() {
    super('Level')
  }

  step!: Step
  def!: LevelDef
  world!: World
  story!: Story
  rec!: PlayerRecord
  priya!: Crewmate
  px = 0
  py = 0
  now = 0
  elapsed = 0
  lamps: LampObj[] = []
  gates: GateObj[] = []
  signs: SignObj[] = []
  npcs: NpcObj[] = []
  allies: Ally[] = []
  crowd: CrowdObj[] = []
  trail: [number, number][] = []
  barrier!: BarrierSystem
  light!: LightSystem
  hud!: Hud
  ghost!: Phaser.GameObjects.Image
  ring!: Phaser.GameObjects.Graphics
  cursor = { x: 640, y: 360 }
  aim = { x: 640, y: 360 }
  /** 'full' when one screen shows both sides (solo, one keyboard); on two computers, the side this one plays. */
  view: 'full' | 'runner' | 'barrier' = 'full'
  /** This computer runs the rules. False on a room's guest, which draws what the host sends. */
  authority = true
  private runnerPad: Pad = NO_PAD
  private barrierPad: Pad = NO_PAD
  private remotePad = new NetPad()
  /** Where the Runner on the other computer says Priya is. */
  private remoteRun: [number, number] | null = null
  private latest: LevelSnap | null = null
  private snapAge = 0
  private sendT = 0
  private nextUid = 1
  private priyaMoving = false
  private progFrac = -1
  private focusAt: [number, number] | null = null
  private callPlate?: Phaser.GameObjects.Container
  private gateLook = new Map<GateObj, string>()
  private ai?: BarrierAI
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private useHint!: Phaser.GameObjects.Text
  private progressGfx!: Phaser.GameObjects.Graphics
  private promptActive = false
  private hold = { id: '', t: 0 }
  private busy: { left: number; total: number; label: string; done: () => void; cancel: boolean } | null = null
  private stuckT = 0
  private ambientCool = 0
  private goalRect!: [number, number, number, number]
  private zoneCharged: number[] = []
  private eventsDone = new Set<number>()
  private pendingEvents: number[] = []
  private lastEventAt = -7

  run = this.freshRun()

  private freshRun() {
    return {
      battery: 100,
      isolation: 0,
      awareness: 0,
      wrong: 0,
      correct: 0,
      faults: 0,
      shares: BALANCE.shareLocationUses as number,
      alliesMade: 0,
      charged: false,
      isoSeconds: 0,
      delay: 0,
      frozen: 0,
      shrinkUntil: 0,
      flashlight: false,
      isolateUntil: 0,
      scatterUntil: 0,
      scatter: [640, 360] as [number, number],
      meeraSent: false,
      bystanderSent: false,
      scamEcho: false,
      cabDone: false,
      ended: false,
      shortcuts: 0,
      exploits: { lights: 0, gates: 0, decoys: 0, other: 0 },
    }
  }

  // ───────────────────────────── setup ─────────────────────────────

  init() {
    this.lamps = []
    this.gates = []
    this.signs = []
    this.npcs = []
    this.allies = []
    this.crowd = []
    this.trail = []
    this.eventsDone = new Set()
    this.pendingEvents = []
    this.lastEventAt = -7
    this.zoneCharged = []
    this.promptActive = false
    this.busy = null
    this.hold = { id: '', t: 0 }
    this.stuckT = 0
    this.ambientCool = 0
    this.now = 0
    this.elapsed = 0
    this.run = this.freshRun()
    this.remotePad = new NetPad()
    this.remoteRun = null
    this.latest = null
    this.snapAge = 0
    this.sendT = 0
    this.nextUid = 1
    this.progFrac = -1
    this.focusAt = null
    this.callPlate = undefined
    this.gateLook = new Map()
  }

  create() {
    this.step = GameState.step
    this.def = LEVELS[this.step.level]
    this.rec = GameState.runner()
    this.story = this.rec.story
    const me = Net.localPlayer
    this.view = me === null ? 'full' : me === this.step.runner ? 'runner' : 'barrier'
    this.authority = !Net.isGuest
    const data = this.def.map(this.story)
    this.world = new World(data)
    this.goalRect = data.goal
    this.run.battery = this.startBattery()
    this.zoneCharged = data.zones.map(() => 0)

    const labels = bakeWorld(this, this.world, this.def.theme, `bg_${this.def.id}`)
    this.add.image(0, 0, `bg_${this.def.id}`).setOrigin(0).setDepth(0)
    void labels

    this.buildLamps(data.lamps)
    this.buildGates(data.gates)
    this.buildNpcs(data.interacts, data.decor ?? [])
    this.buildCrowd(data.crowd ?? 0)

    const [sx, sy] = World.center(...data.spawn)
    this.px = sx
    this.py = sy
    this.priya = new Crewmate(this, sx, sy, 'pink').setDepth(5).setLabel('Priya', FONT)
    this.trail.push([sx, sy])

    const darkness = this.def.theme === 'underpass' ? 0.93 : this.def.theme === 'market' ? 0.84 : 0.88
    // Priya's own screen is darker: she only sees what her light and the lamps reach
    this.light = new LightSystem(this, this.view === 'runner' ? Math.min(0.97, darkness + 0.07) : darkness)

    const barrierIsAI = GameState.aiBarrier
    this.barrier = new BarrierSystem(this.def.abilities, this.def.energyStart + (this.story.fellForScam && this.step.level === 3 ? 20 : 0))
    const { runner, barrier } = this.step
    this.hud = new Hud(this.view === 'runner' ? this.hudLayer() : this, {
      runnerLabel: 'PRIYA  (Runner)',
      barrierLabel: this.def.persona.name.toUpperCase(),
      runnerTag: { text: barrierIsAI ? 'P1' : `P${runner + 1}`, color: GameState.playerColor(runner) },
      barrierTag: { text: barrierIsAI ? 'AI' : `P${barrier + 1}`, color: GameState.playerColor(barrier) },
      abilities: this.def.abilities,
      aiBarrier: barrierIsAI,
      view: this.view,
      onAbility: (id) => this.pressAbility(id),
    })
    this.ai = barrierIsAI ? new BarrierAI(this) : undefined

    this.ghost = this.add.image(640, 360, 'ghost').setScale(0.6).setDepth(15).setAlpha(0.9)
    this.ring = this.add.graphics().setDepth(14)
    this.progressGfx = this.add.graphics().setDepth(16)
    this.useHint = text(this, 0, 0, '', 15, '#ffffff').setOrigin(0.5, 1).setDepth(17)
    // the Barrier's cursor is theirs alone
    if (this.view === 'runner') {
      this.ghost.setVisible(false)
      this.ring.setVisible(false)
      this.followPriya()
    }

    this.setupInput()
    this.wireNet()
    this.cameras.main.fadeIn(350, 0, 0, 0)
    // a room's guest gets the opening messages and allies from the host
    if (!this.authority) return
    this.startAllies()
    this.toast(
      barrierIsAI
        ? `Level ${this.def.id}: ${this.def.title}`
        : `Level ${this.def.id}: Player ${runner + 1} is Priya, Player ${barrier + 1} is the Barrier`,
      GameState.playerColor(runner),
    )
    this.intel(`${this.def.persona.name} wakes. Energy ${this.barrier.energy.toFixed(0)}`)
  }

  /** Priya's screen on two computers: zoomed in and following her, with the HUD in its own unzoomed layer. */
  private followPriya() {
    const cam = this.cameras.main
    cam.setViewport(0, HUD_H, W, H - HUD_H)
    cam.setBounds(0, HUD_H, W, BAR_Y - HUD_H)
    cam.setZoom(RUNNER_ZOOM)
    cam.startFollow(this.priya, true, 0.12, 0.12)
  }

  private hudLayer() {
    this.scene.launch('LevelHud')
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('LevelHud'))
    return this.scene.get('LevelHud')
  }

  private startBattery() {
    if (this.def.id === 1) return 100
    const s = this.story
    let b = s.batteryCarry + (s.chargedLast ? 25 : 8)
    if (s.tookShortcut >= 2 && this.def.id === 2) b = Math.min(b, 60)
    if (s.batteryCarry < 30) b = s.batteryCarry
    return Math.max(5, Math.min(100, b))
  }

  private buildLamps(defs: LampDef[]) {
    for (const d of defs) {
      const x = d.c * T + T / 2
      const y = d.r * T + 8
      const gfx = this.add.graphics({ x, y }).setDepth(12)
      const glow = this.add.image(x, y + 8, 'light').setBlendMode(Phaser.BlendModes.ADD).setDepth(2).setTint(0xffd27a).setAlpha(0)
      const lamp: LampObj = { def: d, x, y, state: d.state, restore: d.state, outUntil: 0, gfx, glow, phase: Math.random() * 9 }
      this.lamps.push(lamp)
      this.drawLamp(lamp)
    }
  }

  private drawLamp(l: LampObj) {
    const color = { on: 0xffe08a, fixed: 0x9bffb0, broken: 0xffa94d, off: 0x4a4f6e, out: 0x2b2f4a }[l.state]
    l.gfx.clear()
    l.gfx.fillStyle(0x0a0c1c, 1).fillRect(-2, 4, 4, 14)
    l.gfx.fillStyle(color, 1).fillCircle(0, 0, 7)
    l.gfx.lineStyle(3, 0x0a0c1c, 1).strokeCircle(0, 0, 7)
    if (l.state === 'fixed') l.gfx.lineStyle(2, 0x3ddc84, 1).strokeCircle(0, 0, 11)
    if (l.state === 'broken') l.gfx.lineStyle(2, 0xff7a45, 1).strokeCircle(0, 0, 11)
  }

  private buildGates(defs: GateDef[]) {
    for (const d of defs) {
      const cs = d.tiles.map((t) => t[0])
      const rs = d.tiles.map((t) => t[1])
      const x = Math.min(...cs) * T
      const y = Math.min(...rs) * T
      const w = (Math.max(...cs) - Math.min(...cs) + 1) * T
      const h = (Math.max(...rs) - Math.min(...rs) + 1) * T
      const gfx = this.add.graphics().setDepth(11)
      const g: GateObj = { def: d, x, y, w, h, closedUntil: 0, fakeUntil: 0, passed: false, gfx }
      this.gates.push(g)
      this.drawGate(g)
    }
  }

  private drawGate(g: GateObj) {
    const closed = this.now < g.closedUntil
    const fake = this.now < g.fakeUntil
    g.gfx.clear()
    if (closed || fake) {
      const n = Math.max(2, Math.round(Math.max(g.w, g.h) / 20))
      for (let i = 0; i < n; i++) {
        g.gfx.fillStyle(i % 2 ? 0xffffff : 0xff7a00, 1)
        if (g.w >= g.h) g.gfx.fillRect(g.x + (g.w / n) * i, g.y + 6, g.w / n, g.h - 12)
        else g.gfx.fillRect(g.x + 6, g.y + (g.h / n) * i, g.w - 12, g.h / n)
      }
      g.gfx.lineStyle(4, 0x0a0c1c, 1).strokeRect(g.x + 3, g.y + 6, g.w - 6, g.h - 12)
    } else {
      g.gfx.lineStyle(2, g.def.shortcut ? 0xff9bd0 : 0x9eecff, 0.5).strokeRect(g.x + 4, g.y + 4, g.w - 8, g.h - 8)
    }
  }

  private buildNpcs(defs: InteractDef[], decor: { type: string; c: number; r: number; color?: string; small?: boolean }[]) {
    for (const d of defs) {
      if (d.kind === 'sign') {
        const x = d.c * T + T / 2
        const y = d.r * T + T / 2
        this.signs.push({ id: d.id, c: d.c, r: d.r, x, y, fake: !!d.fake, verified: false, gfx: this.add.graphics({ x, y }).setDepth(12) })
        continue
      }
      if (d.kind === 'ally' || d.kind === 'kavya') {
        const [x, y] = World.center(d.c, d.r)
        const crew = new Crewmate(this, x, y + 10, NPC_COLORS[d.id] ?? 'white').setDepth(5).setLabel(d.label, FONT)
        this.npcs.push({ def: d, crew, used: false, x, y })
      }
      if (d.kind === 'trust' || d.kind === 'cab') {
        const [x, y] = World.center(d.c, d.r)
        this.npcs.push({ def: d, crew: new Crewmate(this, -99, -99, 'white').setVisible(false), used: false, x, y })
      }
    }
    for (const d of decor) {
      if (d.type !== 'npc') continue
      const [x, y] = World.center(d.c, d.r)
      const c = new Crewmate(this, x, y + 10, d.color ?? 'white', d.small ? 0.62 : 0.8).setDepth(5)
      this.tweens.add({ targets: c, y: c.y - 2, yoyo: true, repeat: -1, duration: 700 + Math.random() * 400 })
    }
    this.signs.forEach((s) => this.drawSign(s))
  }

  private drawSign(s: SignObj) {
    const dir = this.world.dirTowardGoal(s.c, s.r, s.fake)
    s.gfx.clear()
    s.gfx.fillStyle(0x0a0c1c, 1).fillRect(-2, 6, 4, 14)
    s.gfx.fillStyle(s.verified ? (s.fake ? 0xff4a4a : 0x3ddc84) : 0x2b9348, 1).fillRoundedRect(-14, -14, 28, 22, 4)
    s.gfx.lineStyle(3, 0x0a0c1c, 1).strokeRoundedRect(-14, -14, 28, 22, 4)
    const a = (dir * Math.PI) / 2
    const ax = Math.cos(a)
    const ay = Math.sin(a)
    s.gfx.fillStyle(0xffffff, 1)
    s.gfx.fillTriangle(ax * 9 - 1, ay * 9 - 3, -ay * 6 - ax * 5 - 1, ax * 6 - ay * 5 - 3, ay * 6 - ax * 5 - 1, -ax * 6 - ay * 5 - 3)
  }

  private buildCrowd(n: number) {
    const tiles: [number, number][] = []
    this.world.grid.forEach((row, r) =>
      [...row].forEach((_, c) => {
        if (this.world.walkable(c, r) && dist(c * T, r * T, ...this.world.data.spawn.map((v) => v * T) as [number, number]) > 300) tiles.push([c, r])
      }),
    )
    const colors = ['red', 'blue', 'green', 'orange', 'yellow', 'purple', 'lime', 'brown', 'white', 'cyan']
    for (let i = 0; i < n; i++) {
      const [c, r] = Phaser.Utils.Array.GetRandom(tiles)
      const [x, y] = World.center(c, r)
      const crew = new Crewmate(this, x, y, colors[i % colors.length], 0.78).setDepth(5)
      this.crowd.push({ crew, angle: Math.random() * 6.28, turnAt: Math.random() * 2 })
    }
  }

  private setupInput() {
    const kb = this.input.keyboard!
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,F,E,Q,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT') as Record<string, Phaser.Input.Keyboard.Key>
    // one keyboard drives both sides; on two computers it drives only this computer's side
    const local = keyPad(this.keys)
    this.runnerPad = this.view === 'barrier' ? this.remotePad : local
    this.barrierPad = this.view === 'runner' ? NO_PAD : local
    if (!GameState.aiBarrier && this.view !== 'runner') {
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.y > HUD_H && p.y < BAR_Y) this.aim = { x: p.x, y: p.y }
      })
    }
  }

  private startAllies() {
    const starters = this.def.startAllies(this.story, this.story.lostLast)
    starters.forEach((a, i) => this.spawnHelper(a.id, a.color, a.label, Infinity, 36 + i * 24, false))
    if (starters.length) this.toast(`${starters.map((s) => s.label).join(' & ')} found you`, COLORS.green)
  }

  // ───────────────────────────── allies ─────────────────────────────

  followers() {
    return this.allies.filter((a) => a.mode === 'follow' && a.joined)
  }

  /** Followers that currently count (not cut off by Isolate). */
  activeFollowers() {
    return this.now < this.run.isolateUntil ? [] : this.followers()
  }

  private spawnHelper(id: string, color: string, label: string, ttl: number, radius = 90, pop = true, silent = false): Ally | null {
    if (this.followers().length >= BALANCE.maxAllies) {
      this.toast('Her circle is full', COLORS.yellow)
      return null
    }
    let x = this.px
    let y = this.py
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * 6.28
      const tx = this.px + Math.cos(a) * radius
      const ty = this.py + Math.sin(a) * radius
      if (this.world.walkable(World.tile(tx), World.tile(ty))) {
        x = tx
        y = ty
        break
      }
    }
    const crew = new Crewmate(this, x, y, color).setDepth(5).setLabel(label, FONT)
    if (pop) {
      crew.popIn()
      this.puff(x, y)
      this.sfx('pop')
    }
    const a: Ally = { id, crew, mode: 'follow', ttl, path: [], repath: 0, joined: true, lastX: x, lastY: y }
    this.addAlly(a, label)
    this.onJoin(a, silent)
    return a
  }

  /** Someone who walks across the map to reach Priya before joining. */
  private sendWalker(id: string, color: string, label: string, ttl: number, from: [number, number]) {
    const crew = new Crewmate(this, from[0], from[1], color).setDepth(5).setLabel(label, FONT)
    crew.popIn()
    const a: Ally = { id, crew, mode: 'walk', ttl, path: [], repath: 0, joined: false, lastX: from[0], lastY: from[1] }
    this.addAlly(a, label)
    this.puff(from[0], from[1])
  }

  private onJoin(a: Ally, silent = false) {
    a.joined = true
    a.mode = 'follow'
    this.story.networkScore++
    this.run.alliesMade++
    this.rec.allies++
    if (this.def.id === 3) this.rec.l3Allies++
    if (silent) return
    const locked = this.barrier.lockStrongest(this.now, BALANCE.abilityLockTime)
    this.toast(`${a.crew.color === 'white' ? 'A helper' : 'An ally'} joined her circle${locked ? `: ${ABILITIES[locked].name} locked` : ''}`, COLORS.green)
    this.intel('An ally joined Priya')
    this.sfx('good')
  }

  private addAlly(a: Ally, label?: string) {
    a.uid = this.nextUid++
    a.label = label
    this.allies.push(a)
  }

  /** Burst of dots. A Barrier ability's burst would give away their cursor, so Priya's screen skips it. */
  private puff(x: number, y: number, tint = 0x9eecff, barrier = false) {
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'puff', x, y, tint, barrier } })
    if (!(barrier && this.view === 'runner')) this.spawnPuff(x, y, tint)
  }

  private spawnPuff(x: number, y: number, tint: number) {
    const p = this.add.particles(x, y, 'dot', {
      speed: { min: 40, max: 130 },
      lifespan: 520,
      scale: { start: 0.7, end: 0 },
      tint,
      emitting: false,
    }).setDepth(9)
    p.explode(12)
    this.time.delayedCall(700, () => p.destroy())
  }

  private farTile(minTiles: number, maxTiles: number): [number, number] {
    for (let i = 0; i < 40; i++) {
      const c = Phaser.Math.Between(1, 30)
      const r = Phaser.Math.Between(3, 15)
      if (!this.world.walkable(c, r)) continue
      const [x, y] = World.center(c, r)
      const len = this.world.path(x, y, this.px, this.py).length
      if (len >= minTiles && len <= maxTiles) return [x, y]
    }
    return World.center(this.goalRect[0], this.goalRect[1])
  }

  private updateAllies(dt: number) {
    const isolated = this.now < this.run.isolateUntil
    let slot = 0
    for (const a of [...this.allies]) {
      const c = a.crew
      let moving = false
      if (a.mode === 'walk') {
        a.repath -= dt
        if (a.repath <= 0) {
          a.path = this.world.path(c.x, c.y, this.px, this.py)
          a.repath = 0.8
        }
        const next = a.path[1] ?? a.path[0]
        if (next) moving = this.stepToward(a, next[0], next[1], 150 * dt)
        if (dist(c.x, c.y, this.px, this.py) < 70) this.onJoin(a)
      } else if (a.mode === 'return') {
        const next = a.path[0]
        if (next) moving = this.stepToward(a, next[0], next[1], 110 * dt)
        if (!next || dist(c.x, c.y, next[0], next[1]) < 6) a.path.shift()
        if (!a.path.length) a.mode = 'idle'
      } else if (a.mode === 'follow') {
        if (!isolated) {
          const target = this.trail[Math.max(0, this.trail.length - 1 - (slot + 1) * 5)]
          moving = this.stepToward(a, target[0], target[1] + 6, 170 * dt)
          if (dist(c.x, c.y, this.px, this.py) > 420) c.setPosition(target[0], target[1])
        }
        slot++
        a.ttl -= dt
        if (a.ttl <= 0) {
          if (a.home) {
            a.mode = 'return'
            a.path = this.world.path(c.x, c.y, a.home[0], a.home[1])
            this.toast(`${c.color === 'orange' ? 'Mr. Salim' : 'Your ally'} heads back`, COLORS.white)
          } else {
            this.allies = this.allies.filter((x) => x !== a)
            c.popOut(() => c.destroy())
          }
        }
      }
      c.setDepth(5 + c.y / 1000)
      c.animate(dt, moving, c.x - a.lastX)
      a.lastX = c.x
      a.lastY = c.y
    }
  }

  private stepToward(a: Ally, tx: number, ty: number, maxStep: number) {
    const c = a.crew
    const d = dist(c.x, c.y, tx, ty)
    if (d < 3) return false
    const s = Math.min(maxStep, d)
    c.x += ((tx - c.x) / d) * s
    c.y += ((ty - c.y) / d) * s
    return s > 0.4
  }

  // ───────────────────────────── main loop ─────────────────────────────

  update(_t: number, delta: number) {
    if (this.run.ended) return
    const dt = Math.min(0.05, delta / 1000)
    if (!this.authority) {
      this.mirror(dt)
      return this.render()
    }
    // dev only (#ff=N): run N logic ticks per frame to fast-forward a round
    for (let i = 0; i < FAST_FORWARD && !this.run.ended; i++) this.tick(dt)
    this.remotePad.taps.clear()
    this.render()
    this.broadcast(dt)
  }

  private tick(dt: number) {
    this.now += dt
    this.elapsed += dt
    const r = this.run

    r.battery = Math.max(0, r.battery - (BALANCE.batteryDrain + (r.flashlight ? BALANCE.flashlightDrain : 0)) * dt)
    if (r.battery <= 0 && r.flashlight) r.flashlight = false
    this.barrier.update(dt)

    this.updateLamps()
    this.updateGates()
    this.runEvents()
    this.movePriya(dt)
    this.handleActions(dt)
    this.updateAllies(dt)
    this.updateCrowd(dt)
    this.updateRunnerEffects(dt)
    this.updateBarrierInput(dt)
    this.ai?.update(dt)
    this.checkEnd()
  }

  private movePriya(dt: number) {
    const k = this.runnerPad
    const solo = GameState.aiBarrier
    let dx = (k.down('D') || (solo && k.down('RIGHT')) ? 1 : 0) - (k.down('A') || (solo && k.down('LEFT')) ? 1 : 0)
    let dy = (k.down('S') || (solo && k.down('DOWN')) ? 1 : 0) - (k.down('W') || (solo && k.down('UP')) ? 1 : 0)
    const wantsMove = dx !== 0 || dy !== 0
    const frozen = this.run.frozen > 0 || (this.busy && !this.busy.cancel) || this.promptActive
    if (this.run.frozen > 0) this.run.frozen -= dt
    if (frozen) dx = dy = 0
    if (dx && dy) {
      dx *= Math.SQRT1_2
      dy *= Math.SQRT1_2
    }
    const speed = BALANCE.playerSpeed * (this.run.battery <= 0 ? 0.92 : 1)
    let [nx, ny] = this.world.move(this.px, this.py, dx * speed * dt, dy * speed * dt)
    // a Runner on the other computer walks Priya there without lag; this side checks it is a real step
    if (this.view === 'barrier' && this.remoteRun && !frozen) {
      const [rx, ry] = this.remoteRun
      if (this.world.walkable(World.tile(rx), World.tile(ry)) && dist(rx, ry, this.px, this.py) < 60) [nx, ny] = [rx, ry]
    }
    const moved = dist(nx, ny, this.px, this.py)
    // time lost to closed gates counts as delay for the Barrier
    if (wantsMove && !frozen && moved < 0.2) {
      this.stuckT += dt
      if (this.stuckT > 0.4) this.run.delay += dt
    } else this.stuckT = 0
    if (frozen && this.run.frozen > 0) this.run.delay += dt
    this.vxSmooth = Phaser.Math.Linear(this.vxSmooth, dx * speed, 0.4)
    this.px = nx
    this.py = ny
    this.priya.setPosition(nx, ny).setDepth(5 + ny / 1000)
    this.priyaMoving = moved > 0.3
    this.priya.animate(dt, this.priyaMoving, this.vxSmooth)

    const last = this.trail[this.trail.length - 1]
    if (dist(last[0], last[1], nx, ny) > 7) {
      this.trail.push([nx, ny])
      if (this.trail.length > 300) this.trail.shift()
    }
    if (this.busy?.cancel && wantsMove) this.busy = null
  }

  private vxSmooth = 0

  private handleActions(dt: number) {
    const k = this.runnerPad
    if (k.tap('F') && this.run.battery > 0) {
      this.run.flashlight = !this.run.flashlight
      this.sfx('click')
    }
    if (k.tap('E')) this.shareLocation()
    if (k.tap('Q')) this.callExtraAlly()
    this.progFrac = -1
    this.focusAt = null

    this.progressGfx.clear()
    if (this.busy) {
      this.busy.left -= dt
      this.drawProgress(1 - this.busy.left / this.busy.total, this.busy.label)
      if (this.busy.left <= 0) {
        const done = this.busy.done
        this.busy = null
        done()
      }
      this.useHint.setText('')
      return
    }

    const focus = this.findFocus()
    if (!focus) {
      this.useHint.setText('')
      this.hold = { id: '', t: 0 }
      return
    }
    this.useHint.setText(`[SPACE] ${focus.label}`).setPosition(this.px, this.py - 52)
    this.focusAt = focus.kind === 'report' ? [focus.lamp.x, focus.lamp.y + 10] : focus.kind === 'verify' ? [focus.sign.x, focus.sign.y] : [focus.npc.x, focus.npc.y]
    const id = focus.kind === 'report' ? `l${focus.lamp.x}` : focus.kind === 'verify' ? focus.sign.id : focus.npc.def.id
    if (focus.kind === 'npc') {
      if (k.tap('SPACE')) this.useNpc(focus.npc)
      return
    }
    if (k.down('SPACE')) {
      if (this.hold.id !== id) this.hold = { id, t: 0 }
      this.hold.t += dt
      this.drawProgress(this.hold.t / focus.need, focus.kind === 'report' ? 'Reporting' : 'Checking map')
      if (this.hold.t >= focus.need) {
        this.hold = { id: '', t: 0 }
        if (focus.kind === 'report') this.reportLamp(focus.lamp)
        else this.verifySign(focus.sign)
      }
    } else this.hold = { id, t: 0 }
  }

  private drawProgress(frac: number, label: string) {
    this.progFrac = frac
    const g = this.progressGfx
    const x = this.px
    const y = this.py - 64
    g.fillStyle(0x000000, 0.7).fillRoundedRect(x - 40, y - 8, 80, 14, 7)
    g.fillStyle(COLORS.green, 1).fillRoundedRect(x - 38, y - 6, Math.max(2, 76 * Math.min(1, frac)), 10, 5)
    g.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(x - 40, y - 8, 80, 14, 7)
    void label
  }

  private findFocus(): Focus | null {
    const R = 54
    let best: Focus | null = null
    let bd = 1e9
    const consider = (f: Focus, d: number) => {
      if (d < R && d < bd) {
        best = f
        bd = d
      }
    }
    for (const l of this.lamps)
      if (l.state === 'broken') consider({ kind: 'report', lamp: l, label: 'Hold to report the broken light', need: BALANCE.reportTime }, dist(l.x, l.y + 10, this.px, this.py))
    for (const s of this.signs)
      if (!s.verified) consider({ kind: 'verify', sign: s, label: 'Hold to check the map', need: 1.4 }, dist(s.x, s.y, this.px, this.py))
    for (const n of this.npcs) {
      if (n.used || (n.def.kind !== 'ally' && n.def.kind !== 'kavya')) continue
      consider({ kind: 'npc', npc: n, label: n.def.kind === 'kavya' ? 'Help Kavya (costs time)' : `Ask ${n.def.label} to walk with you`, need: 0 }, dist(n.x, n.y, this.px, this.py))
    }
    return best
  }

  private reportLamp(l: LampObj) {
    l.state = 'fixed'
    l.restore = 'fixed'
    this.drawLamp(l)
    this.run.faults++
    this.rec.faults++
    this.run.awareness += 15
    if (this.def.id === 1) this.story.reportedLight = true
    this.toast('Fault reported: the light stays on for the round (+15 aware)', COLORS.green)
    this.intel('Priya reported a broken light')
    this.sfx('good')
    this.puff(l.x, l.y + 6, 0xffe08a)
  }

  private verifySign(s: SignObj) {
    this.run.battery = Math.max(0, this.run.battery - 2)
    s.verified = true
    if (s.fake) {
      s.fake = false
      this.toast('The map says: that sign was FAKE. Fixed!', COLORS.red)
      this.run.awareness += 10
    } else this.toast('The map confirms this sign is real', COLORS.green)
    this.drawSign(s)
    this.sfx('good')
    this.intel('Priya checked a sign on the map')
  }

  private useNpc(n: NpcObj) {
    n.used = true
    if (n.def.kind === 'kavya') {
      this.busy = {
        left: 6, total: 6, label: 'Helping Kavya', cancel: false,
        done: () => {
          this.story.helpedKavya = true
          this.run.awareness += 20
          this.toast('Kavya is okay. She walks with you!', COLORS.yellow)
          const a: Ally = { id: 'kavya', crew: n.crew, mode: 'follow', ttl: Infinity, path: [], repath: 0, joined: false, lastX: n.crew.x, lastY: n.crew.y }
          n.crew.setLabel('Kavya', FONT)
          this.addAlly(a, 'Kavya')
          this.onJoin(a)
        },
      }
      Sfx.click()
      return
    }
    if (this.followers().length >= BALANCE.maxAllies) {
      n.used = false
      return this.toast('Her circle is full', COLORS.yellow)
    }
    const a: Ally = { id: n.def.id, crew: n.crew, mode: 'follow', ttl: BALANCE.helperAllyTime, path: [], repath: 0, home: [n.x, n.y], joined: false, lastX: n.crew.x, lastY: n.crew.y }
    this.addAlly(a)
    this.run.awareness += 10
    this.onJoin(a)
  }

  private shareLocation() {
    const r = this.run
    if (r.battery <= 0) return this.toast('Phone is dead: cannot share location', COLORS.red)
    if (r.shares <= 0) return this.toast('No Share Location uses left', COLORS.red)
    r.shares--
    r.battery = Math.max(0, r.battery - BALANCE.shareLocationCost)
    r.isolateUntil = 0
    this.toast('Location shared: your circle knows where you are', COLORS.cyan)
    this.intel('Priya shared her location')
    this.sfx('phone')
  }

  private callExtraAlly() {
    const r = this.run
    if (r.awareness < BALANCE.callAllyCost) return this.toast(`Need ${BALANCE.callAllyCost} awareness points to call an ally`, COLORS.yellow)
    if (this.followers().length >= BALANCE.maxAllies) return this.toast('Her circle is full', COLORS.yellow)
    r.awareness -= BALANCE.callAllyCost
    this.spawnHelper('helper', 'white', 'Helper', BALANCE.helperAllyTime)
  }

  // ───────────────────────────── world updates ─────────────────────────────

  private updateLamps() {
    for (const l of this.lamps) {
      if (l.state === 'out' && this.now >= l.outUntil) {
        l.state = l.restore
        this.drawLamp(l)
      }
    }
  }

  private lampRadius(l: LampObj) {
    if (l.state === 'on' || l.state === 'fixed') return l.def.community ? 135 : 118
    if (l.state === 'broken') {
      const f = Math.sin(this.now * 17 + l.phase) * Math.sin(this.now * 5.3 + l.phase)
      return f > 0.25 ? 100 : f > -0.2 ? 38 : 0
    }
    return 0
  }

  private updateGates() {
    for (const g of this.gates) {
      const wasClosed = this.world.closed.has(g.def.id)
      const closed = this.now < g.closedUntil
      if (closed !== wasClosed) {
        if (closed) this.world.closed.add(g.def.id)
        else this.world.closed.delete(g.def.id)
        this.drawGate(g)
      } else if (g.fakeUntil > 0 && this.now >= g.fakeUntil) {
        g.fakeUntil = 0
        this.drawGate(g)
      }
      if (g.def.shortcut && !g.passed && this.world.inRect(this.px, this.py, [g.x / T, g.y / T, g.w / T, g.h / T])) {
        g.passed = true
        this.run.shortcuts++
        this.story.tookShortcut++
        this.toast('Shortcut through a dark alley', COLORS.yellow)
        this.intel('Priya took a dark shortcut')
      }
    }
  }

  private updateCrowd(dt: number) {
    const scattered = this.now < this.run.scatterUntil
    for (const n of this.crowd) {
      const c = n.crew
      n.turnAt -= dt
      if (scattered) {
        n.angle = Math.atan2(c.y - this.run.scatter[1], c.x - this.run.scatter[0])
        n.turnAt = 0.3
      } else if (n.turnAt <= 0) {
        n.angle += (Math.random() - 0.5) * 2.4
        n.turnAt = 1 + Math.random() * 2
      }
      const sp = scattered ? 80 : 38
      const [nx, ny] = this.world.move(c.x, c.y, Math.cos(n.angle) * sp * dt, Math.sin(n.angle) * sp * dt, 9)
      if (nx === c.x && ny === c.y) {
        n.angle += Math.PI * (0.5 + Math.random())
        n.turnAt = 1
      }
      const moving = dist(nx, ny, c.x, c.y) > 0.1
      c.animate(dt, moving, nx - c.x)
      c.setPosition(nx, ny).setDepth(5 + ny / 1000)
    }
  }

  private inDanger() {
    return this.world.inAny(this.px, this.py, this.world.data.dangerZones)
  }

  private inZone() {
    return this.world.data.zones.findIndex((z) => this.world.inRect(this.px, this.py, z))
  }

  private isLit() {
    if (dist(this.px, this.py, ...(this.goalCenter())) < 130) return true
    return this.lamps.some((l) => this.lampRadius(l) >= 90 && dist(l.x, l.y + 10, this.px, this.py) < this.lampRadius(l) * 0.85)
  }

  private goalCenter(): [number, number] {
    const [c, r, w, h] = this.goalRect
    return [(c + w / 2) * T, (r + h / 2) * T]
  }

  private updateRunnerEffects(dt: number) {
    const r = this.run
    const zone = this.inZone()
    // safe zone: charge, hidden from the Barrier
    if (zone >= 0 && r.battery < 100 && this.zoneCharged[zone] < BALANCE.chargeCap) {
      const gain = Math.min(BALANCE.chargeRate * dt, BALANCE.chargeCap - this.zoneCharged[zone])
      this.zoneCharged[zone] += gain
      r.battery = Math.min(100, r.battery + gain)
      if (!r.charged) {
        r.charged = true
        this.toast('Safe Zone: charging your phone and hidden from the Barrier', COLORS.green)
        this.intel('Priya vanished inside a Safe Zone')
        this.sfx('good')
      }
    }

    // isolation meter
    const allies = this.activeFollowers().filter((a) => dist(a.crew.x, a.crew.y, this.px, this.py) < 180).length
    const crowdNear = this.now < r.scatterUntil ? 0 : this.crowd.filter((n) => dist(n.crew.x, n.crew.y, this.px, this.py) < 130).length
    const support = allies + Math.floor(crowdNear / 2)
    let rate = support >= 2 ? 0 : support === 1 ? BALANCE.isolationOneAlly : BALANCE.isolationAlone
    rate *= this.def.isolationScale * (this.inDanger() ? 1.5 : 1)
    if (zone >= 0) r.isolation = Math.max(0, r.isolation - BALANCE.isolationDecay * 2 * dt)
    else if (!this.isLit()) {
      r.isolation = Math.min(100, r.isolation + rate * dt)
      if (rate > 0) r.isoSeconds += dt
      else r.isolation = Math.max(0, r.isolation - BALANCE.isolationDecay * 0.5 * dt)
    } else r.isolation = Math.max(0, r.isolation - BALANCE.isolationDecay * dt)

    if (r.isolation > 80) {
      this.ambientCool -= dt
      if (this.ambientCool <= 0) {
        Sfx.heartbeat()
        this.ambientCool = 0.9
      }
    }

    // Check-In Contact starts walking only in the last 10 seconds, when she is really late
    if (this.story.checkedIn && !r.meeraSent && this.elapsed > this.def.time - 10 && !this.allies.some((a) => a.id === 'meera')) {
      r.meeraSent = true
      this.sendWalker('meera', 'cyan', 'Meera', Infinity, World.center(this.goalRect[0] + 1, this.goalRect[1]))
      this.toast('You are late: Meera starts walking towards you', COLORS.cyan)
    }
    if (this.def.id === 3 && this.story.fellForScam && !r.scamEcho && this.elapsed > 6) {
      r.scamEcho = true
      this.pendingEvents.push(1)
    }
    if (this.def.id === 3 && GameState.surpriseAlly && !r.bystanderSent && this.elapsed > 25) {
      r.bystanderSent = true
      this.sendWalker('bystander', 'green', 'Bystander', BALANCE.helperAllyTime + 10, this.farTile(8, 20))
      this.toast('Someone who stopped to help is coming!', COLORS.green)
    }
  }

  // ───────────────────────────── events & prompts ─────────────────────────────

  private runEvents() {
    if (this.promptActive || this.busy) return
    // an event fires once its time OR her route progress is reached, with a breather in between
    const progress = this.world.progress(this.px, this.py)
    const ev = this.def.script.findIndex((e, i) => !this.eventsDone.has(i) && (this.elapsed >= e.at || progress >= e.p))
    if (ev >= 0 && this.elapsed - this.lastEventAt >= 7) {
      this.eventsDone.add(ev)
      this.lastEventAt = this.elapsed
      this.fireEvent(this.def.script[ev])
    } else if (this.pendingEvents.length) {
      const kind = this.pendingEvents.shift()!
      if (kind === 1) this.fakeMessage()
    }
    // location-triggered prompts
    for (const n of this.npcs) {
      if (n.used || !n.def.auto || dist(n.x, n.y, this.px, this.py) > 50) continue
      n.used = true
      if (n.def.kind === 'trust') this.trustCheck()
      if (n.def.kind === 'cab') this.rideCheck()
      return
    }
  }

  private fireEvent(e: LevelDef['script'][number]) {
    if (e.kind === 'card') return this.helplineCard(e.id)
    if (e.kind === 'scam') return this.scamPrompt(Phaser.Math.Between(0, SCAMS.length - 1), false)
    if (e.kind === 'code') return this.codeCall(Math.random() < 0.5 ? false : true)
  }

  ask(cfg: Omit<PromptConfig, 'parent' | 'onDone'>, onDone: (r: PromptResult) => void) {
    this.promptActive = true
    this.hold = { id: '', t: 0 }
    this.progressGfx.clear()
    this.scene.pause()
    // Priya's cards go to whoever plays Priya; on two computers the other screen says she is on a call
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'call', title: cfg.title } })
    Net.prompt(this, this.step.runner, {
      ...cfg,
      parent: 'Level',
      onDone: (r: PromptResult) => {
        this.promptActive = false
        if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'call', title: null } })
        onDone(r)
      },
    } satisfies PromptConfig)
  }

  private helplineCard(id: string) {
    const card = cardById(id)
    const r = this.run
    if (r.battery <= 0) {
      this.toast('Phone is dead: the call never connected', COLORS.red)
      this.penalty('wrong', card)
      return
    }
    const order = shuffle(card.options.map((_, i) => i))
    const options = order.map((i) => card.options[i])
    const correct = order.map((orig, idx) => (card.correct.includes(orig) ? idx : -1)).filter((i) => i >= 0)
    const best = card.best !== undefined ? order.indexOf(card.best) : undefined
    this.ask(
      {
        title: 'Incoming: Helpline Card',
        from: `${BALANCE.cardTime}s to decide`,
        body: card.text,
        options,
        correct,
        best,
        incoming: true,
        hint: this.def.hints ? card.hint : undefined,
        reason: card.reason,
        accent: COLORS.cyan,
      },
      (res) => {
        this.rec.callsMade++
        if (res.correct) {
          this.rec.callsCorrect++
          this.story.correctCalls++
          if (this.def.id === 3) this.rec.l3Correct++
          r.correct++
          r.battery = Math.min(100, r.battery + BALANCE.correctCallBattery)
          r.awareness += 10
          this.spawnHelper('helper', 'white', 'Helper', BALANCE.helperAllyTime)
          this.intel('Priya made a correct call')
        } else this.penalty('wrong', card)
      },
    )
  }

  private penalty(_kind: 'wrong', card: ReturnType<typeof cardById>) {
    const r = this.run
    r.wrong++
    this.story.wrongCalls++
    if (this.def.id === 3) this.rec.l3Wrong++
    r.battery = Math.max(0, r.battery - BALANCE.wrongCallBattery)
    r.shrinkUntil = this.now + 6
    this.barrier.addEnergy(BALANCE.wrongCallEnergy)
    this.rec.missedHelplines.push({ text: card.text, answer: card.correct.map((i) => card.options[i]).join('  or  ') })
    this.intel(`Priya called the wrong number (${r.wrong}/${BALANCE.maxWrongCalls})`)
    this.cameras.main.shake(220, 0.004)
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'shake', ms: 220, amt: 0.004 } })
  }

  private trustCheck() {
    const options = shuffle(TRUST_OPTIONS.map((_, i) => i))
    this.ask(
      {
        title: 'Trust Check: you look lost',
        body: 'Someone offers directions to the station. Who do you approach? (The lesson is about the setting, not the person.)',
        options: options.map((i) => TRUST_OPTIONS[i].label),
        correct: options.map((o, idx) => (TRUST_OPTIONS[o].good ? idx : -1)).filter((i) => i >= 0),
        reason: 'Public, lit, staffed or family settings are safer places to ask for help.',
        accent: COLORS.yellow,
      },
      (res) => {
        if (res.correct) {
          this.run.awareness += 10
          this.run.isolation = Math.max(0, this.run.isolation - 20)
          this.spawnHelper('helper', 'green', 'Stall owner', 15)
        } else {
          this.run.frozen = 4
          this.barrier.addEnergy(10)
          this.toast('You wasted time in the dark alley', COLORS.red)
          this.intel('Priya trusted an unsafe place')
        }
      },
    )
  }

  private scamPrompt(i: number, fromBarrier: boolean) {
    const s = SCAMS[i]
    const options = ['Reply', 'Ignore', 'Report']
    this.ask(
      {
        title: 'Spot the Scam: new message',
        from: s.from,
        body: s.text,
        options,
        correct: [1, 2],
        incoming: true,
        reason: s.why,
        accent: COLORS.green,
      },
      (res) => {
        if (res.correct) {
          this.run.awareness += res.choice[0] === 2 ? 15 : 10
          this.barrier.lock('fakeMsg', this.now + BALANCE.abilityLockTime)
          this.toast('Scam avoided: Fake Message locked for 10s', COLORS.green)
        } else {
          this.story.fellForScam = true
          this.run.battery = Math.max(0, this.run.battery - 20)
          this.toast('Trust alert: a fake app drained 20% battery', COLORS.red)
          this.intel('Priya fell for the scam')
        }
        void fromBarrier
      },
    )
  }

  private codeCall(fake: boolean) {
    const phrase = this.story.codePhrase || CODE_PHRASES[0]
    const said = fake ? Phaser.Utils.Array.GetRandom(FAKE_PHRASES) : phrase
    this.ask(
      {
        title: 'Incoming call: "Meera"',
        from: 'Code Phrase check',
        body: `"Priya, it is me. Quick, I am close. Our code phrase is... ${said}."\n\nYour code phrase with Meera was: ${phrase}.`,
        options: ['It matches: this is Meera', 'It does not match: hang up'],
        correct: [fake ? 1 : 0],
        incoming: true,
        reason: fake ? 'A wrong phrase means a fake call. Hang up and stay with people.' : 'The phrase matched: it really was Meera.',
        accent: COLORS.cyan,
      },
      (res) => {
        if (res.correct && !fake) {
          this.run.awareness += 15
          this.run.isolateUntil = 0
          this.spawnHelper('meera', 'cyan', 'Meera', Infinity)
        } else if (res.correct && fake) {
          this.run.awareness += 15
          this.barrier.lock('fakeMsg', this.now + 15)
          this.barrier.lock('isolate', this.now + 10)
        } else {
          this.run.battery = Math.max(0, this.run.battery - 10)
          this.run.frozen = 3
        }
      },
    )
  }

  private rideCheck() {
    const options = shuffle(RIDE_OPTIONS.map((_, i) => i))
    this.ask(
      {
        title: 'Ride Check: a cab arrives',
        body: 'Pick the 2 actions that keep you safest.',
        options: options.map((i) => RIDE_OPTIONS[i].label),
        correct: options.map((o, idx) => (RIDE_OPTIONS[o].good ? idx : -1)).filter((i) => i >= 0),
        pick: 2,
        reason: 'Verify the plate number and share your trip with a trusted contact. Checking the app match and sitting behind the driver are good habits too.',
        accent: COLORS.yellow,
      },
      (res) => {
        this.run.cabDone = true
        if (res.correct) {
          this.run.awareness += 20
          this.barrier.lockForever('decoy')
          this.barrier.lockForever('fakeMsg')
          this.toast('Smooth ride: the Barrier loses Decoy and Fake Message', COLORS.green)
        } else {
          this.barrier.addEnergy(30)
          this.signs.forEach((s) => ((s.fake = !s.verified), this.drawSign(s)))
          this.toast('Skipped checks: the Barrier gets a free Decoy', COLORS.red)
        }
      },
    )
  }

  // ───────────────────────────── barrier ─────────────────────────────

  private updateBarrierInput(dt: number) {
    const k = this.barrierPad
    if (!GameState.aiBarrier) {
      const dx = (k.down('RIGHT') ? 1 : 0) - (k.down('LEFT') ? 1 : 0)
      const dy = (k.down('DOWN') ? 1 : 0) - (k.down('UP') ? 1 : 0)
      if (dx || dy) {
        this.aim.x = Phaser.Math.Clamp(this.aim.x + dx * 420 * dt, 10, W - 10)
        this.aim.y = Phaser.Math.Clamp(this.aim.y + dy * 420 * dt, HUD_H + 10, BAR_Y - 10)
      }
      const nums = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT']
      nums.forEach((key, i) => {
        const id = this.def.abilities[i]
        if (id && k.tap(key)) this.pressAbility(id)
      })
    }
    this.cursor.x = Phaser.Math.Linear(this.cursor.x, this.aim.x, Math.min(1, dt * 12))
    this.cursor.y = Phaser.Math.Linear(this.cursor.y, this.aim.y, Math.min(1, dt * 12))
  }

  private inHiddenZone() {
    return this.inZone() >= 0
  }

  /** The Barrier player asked for an ability (key or click). A room's guest sends it to the host. */
  private pressAbility(id: AbilityId) {
    if (GameState.aiBarrier || this.view === 'runner') return
    if (!this.authority) return Net.send({ k: 'ability', id, x: this.cursor.x, y: this.cursor.y })
    this.useAbility(id, true)
  }

  /** Runs one Barrier ability at the cursor. Returns true if it fired. */
  useAbility(id: AbilityId, announce = false): boolean {
    if (this.run.ended || this.promptActive) return false
    const fail = (msg: string) => {
      if (announce) this.toast(msg, COLORS.purple, 'barrier')
      return false
    }
    const reason = this.barrier.blockedReason(id, this.now)
    if (reason) return fail(`${ABILITIES[id].name}: ${reason}`)
    const cx = this.cursor.x
    const cy = this.cursor.y
    const r = this.run

    switch (id) {
      case 'lightsOut': {
        const l = this.nearest(this.lamps.filter((x) => x.state === 'on' || x.state === 'broken'), cx, cy, 230, (x) => [x.x, x.y])
        if (!l) return fail('Lights Out: no working light near the cursor')
        if (this.followers().some((a) => dist(a.crew.x, a.crew.y, l.x, l.y) < 150)) return fail('Lights Out: blocked by an ally standing there')
        l.restore = l.state
        l.state = 'out'
        l.outUntil = this.now + 12
        this.drawLamp(l)
        r.exploits.lights++
        break
      }
      case 'closeWay': {
        const g = this.nearest(this.gates.filter((x) => this.now >= x.closedUntil), cx, cy, 280, (x) => [x.x + x.w / 2, x.y + x.h / 2])
        if (!g) return fail('Close the Way: no open gate near the cursor')
        if (this.world.inRect(this.px, this.py, [g.x / T - 0.5, g.y / T - 0.5, g.w / T + 1, g.h / T + 1])) return fail('Close the Way: Priya is standing in it')
        g.closedUntil = this.now + 8
        r.exploits.gates++
        this.intel('The way ahead closes')
        break
      }
      case 'decoy': {
        const real = this.nearest(this.signs.filter((s) => !s.fake && !s.verified), cx, cy, 260, (s) => [s.x, s.y])
        if (real) {
          real.fake = true
          this.drawSign(real)
        } else {
          const c = World.tile(cx)
          const rr = World.tile(cy)
          if (!this.world.walkable(c, rr)) return fail('Decoy Sign: put the cursor on a path')
          const [x, y] = World.center(c, rr)
          const s: SignObj = { id: `d${this.signs.length}`, c, r: rr, x, y, fake: true, verified: false, gfx: this.add.graphics({ x, y }).setDepth(12) }
          this.signs.push(s)
          this.drawSign(s)
        }
        r.exploits.decoys++
        break
      }
      case 'crowd':
        if (!this.crowd.length) return fail('Crowd Flow: nobody around to move')
        r.scatterUntil = this.now + 10
        r.scatter = [cx, cy]
        r.exploits.other++
        break
      case 'fakeMsg':
        if (this.inHiddenZone()) return fail('Fake Message: Priya is hidden in a Safe Zone')
        if (r.battery <= 0) return fail('Fake Message: her phone is dead')
        this.pendingEvents.push(1)
        r.exploits.other++
        break
      case 'drain':
        if (this.inHiddenZone()) return fail('Drain: Priya is hidden in a Safe Zone')
        r.battery = Math.max(0, r.battery - 5)
        r.exploits.other++
        this.toast('A heavy app update drained 5% battery', COLORS.purple)
        break
      case 'flicker': {
        const g = this.nearest(this.gates.filter((x) => this.now >= x.closedUntil), cx, cy, 320, (x) => [x.x + x.w / 2, x.y + x.h / 2])
        if (!g) return fail('Flicker Bluff: no gate near the cursor')
        g.fakeUntil = this.now + 4
        this.drawGate(g)
        r.exploits.other++
        break
      }
      case 'isolate':
        if (!this.followers().length) return fail('Isolate: Priya has no allies to cut off')
        r.isolateUntil = this.now + 8
        r.exploits.other++
        this.toast('Her allies lost the link! Share Location or a Code Phrase reconnects', COLORS.red)
        break
    }
    this.barrier.spend(id, this.now)
    this.sfx('ability')
    this.puff(cx, cy, ABILITIES[id].color, true)
    this.intel(`${ABILITIES[id].name} used`)
    return true
  }

  private fakeMessage() {
    if (this.def.id === 3) this.codeCall(true)
    else this.scamPrompt(Phaser.Math.Between(0, SCAMS.length - 1), true)
  }

  private nearest<Tt>(list: Tt[], x: number, y: number, range: number, pos: (t: Tt) => [number, number]): Tt | null {
    let best: Tt | null = null
    let bd = range
    for (const t of list) {
      const [tx, ty] = pos(t)
      const d = dist(tx, ty, x, y)
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }

  // ───────────────────────────── rendering ─────────────────────────────

  private priyaRadius() {
    const r = this.run
    const base = this.def.theme === 'market' ? 92 : this.def.theme === 'underpass' ? 70 : 82
    let rad = base + this.activeFollowers().length * 34
    if (r.flashlight) rad += 45
    if (this.now < r.shrinkUntil) rad -= 30
    if (r.battery <= 0) rad = 40
    return Math.max(38, rad)
  }

  private render() {
    const l = this.light
    l.begin()
    for (const lamp of this.lamps) {
      const rad = this.lampRadius(lamp)
      lamp.glow.setAlpha(rad > 0 ? 0.22 : 0).setDisplaySize(rad * 1.6 || 1, rad * 1.6 || 1)
      if (rad > 0) l.add(lamp.x, lamp.y + 10, rad)
    }
    for (const z of this.world.data.zones) l.add((z[0] + z[2] / 2) * T, (z[1] + z[3] / 2) * T, Math.max(z[2], z[3]) * T * 0.75 + 30, 0.95)
    const [gx, gy] = this.goalCenter()
    l.add(gx, gy, 120, 0.9)
    l.add(this.px, this.py - 10, this.priyaRadius())
    for (const a of this.activeFollowers()) l.add(a.crew.x, a.crew.y - 10, 70, 0.9)
    for (const n of this.npcs) if (!n.used && n.def.color) l.add(n.x, n.y, 44, 0.6)
    // on Priya's zoomed screen, whatever she can use right now is lit so she can see it
    if (this.view === 'runner' && this.focusAt) l.add(this.focusAt[0], this.focusAt[1], 52, 0.85)

    const t = this.now
    this.ghost.setPosition(this.cursor.x, this.cursor.y + Math.sin(t * 3) * 5).setFlipX(Math.sin(t * 0.7) > 0)
    this.ring.clear().lineStyle(3, COLORS.purple, 0.7).strokeCircle(this.cursor.x, this.cursor.y, 38 + Math.sin(t * 5) * 3)

    this.hud.update(
      {
        timeLeft: this.def.time - this.elapsed,
        battery: this.run.battery,
        allies: this.followers().length,
        awareness: this.run.awareness,
        flashlight: this.run.flashlight,
        shareUses: this.run.shares,
        progress: this.world.progress(this.px, this.py),
        energy: this.barrier.energy,
        isolation: this.run.isolation,
        abilityState: (id) => this.abilityView(id),
      },
      this.now * 1000,
    )
  }

  // ───────────────────────────── end of round ─────────────────────────────

  private checkEnd() {
    const r = this.run
    if (this.world.inRect(this.px, this.py, this.goalRect)) return this.finish(true, 'home')
    if (r.isolation >= 100) return this.finish(false, 'isolated')
    if (r.wrong >= BALANCE.maxWrongCalls) return this.finish(false, 'calls')
    if (this.elapsed >= this.def.time) return this.finish(false, 'time')
  }

  private finish(win: boolean, reason: 'home' | 'isolated' | 'time' | 'calls') {
    const r = this.run
    if (r.ended) return
    r.ended = true
    const timeLeft = Math.max(0, this.def.time - this.elapsed)
    const runnerScore = Math.round(
      (win ? 200 + timeLeft * 2 : 0) + r.battery * 0.5 + r.awareness + r.correct * 50 + r.alliesMade * 30 + r.faults * 40,
    )
    const ex = r.exploits
    const barrierScore = Math.round(r.isoSeconds + r.delay + r.wrong * 25 + (ex.lights + ex.gates + ex.decoys + ex.other) * 15 + (win ? 0 : 150))

    this.story.batteryCarry = r.battery
    this.story.chargedLast = r.charged
    this.story.lostLast = !win
    this.story.won[this.def.id] = win
    this.rec.runnerScore += runnerScore
    const br = GameState.barrier()
    br.barrierScore += barrierScore
    const tally = GameState.tally[this.def.id]!
    tally.runner[this.step.runner] += runnerScore
    tally.barrier[this.step.barrier] += barrierScore
    br.exploits.lights += ex.lights
    br.exploits.gates += ex.gates
    br.exploits.decoys += ex.decoys
    br.exploits.other += ex.other

    GameState.lastOutcome = {
      step: this.step, win, reason, runnerScore, barrierScore, timeLeft,
      battery: r.battery, allies: r.alliesMade, correct: r.correct, wrong: r.wrong, faults: r.faults, charged: r.charged,
    }

    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'end', win } })
    this.endEffects(win)
    this.time.delayedCall(1750, () => {
      this.light.destroy()
      this.scene.start('RoundEnd')
    })
    this.toast(win ? 'She made it home!' : reason === 'isolated' ? 'Isolated in the dark...' : reason === 'calls' ? 'Help did not reach her in time' : 'Time ran out', win ? COLORS.green : COLORS.red)
    void hex
  }

  private endEffects(win: boolean) {
    Sfx[win ? 'win' : 'lose']()
    this.cameras.main.flash(300, win ? 120 : 255, win ? 255 : 60, win ? 160 : 60)
    this.time.delayedCall(1200, () => this.cameras.main.fadeOut(500, 0, 0, 0))
  }

  // ───────────────────────────── two computers ─────────────────────────────

  /** Does this screen show a message meant for `to`? */
  private sees(to: Audience) {
    return to === 'all' || this.view === 'full' || this.view === to
  }

  private toast(msg: string, color: number = COLORS.white, to: Audience = 'all') {
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'toast', msg, color, to } })
    if (this.sees(to)) this.hud.toast(msg, color)
  }

  /** The Barrier's intel feed (the Hud leaves it out on Priya's own screen). */
  private intel(msg: string) {
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'intel', msg } })
    this.hud.intel(msg, this.now * 1000)
  }

  private sfx(name: SfxName) {
    if (Net.isHost) Net.send({ k: 'fx', fx: { f: 'sfx', name } })
    Sfx[name]()
  }

  private abilityView(id: AbilityId) {
    const i = this.def.abilities.indexOf(id)
    if (!this.authority && this.latest?.abil[i]) {
      const [reason, cd, uses] = this.latest.abil[i]
      return { reason, cd, uses }
    }
    return { reason: this.barrier.blockedReason(id, this.now), cd: this.barrier.cooldownLeft(id, this.now), uses: Math.max(0, this.barrier.usesLeft(id)) }
  }

  /** Host: take the guest's input. Guest: take the host's snapshots and effects. */
  private wireNet() {
    if (!Net.online) return
    if (this.authority) {
      Net.onWhile(this, 'run', (m) => {
        if (this.view !== 'barrier') return
        this.remoteRun = [m.x, m.y]
        this.remotePad.held = new Set(m.held)
      })
      Net.onWhile(this, 'tap', (m) => this.view === 'barrier' && this.remotePad.taps.add(m.key))
      Net.onWhile(this, 'aim', (m) => this.view === 'runner' && (this.aim = { x: m.x, y: m.y }))
      Net.onWhile(this, 'ability', (m) => {
        if (this.view !== 'runner') return
        this.aim = { x: m.x, y: m.y }
        this.cursor = { x: m.x, y: m.y }
        this.useAbility(m.id, true)
      })
      return
    }
    Net.onWhile(this, 'snap', (m) => {
      this.latest = m.s
      this.snapAge = 0
    })
    Net.onWhile(this, 'fx', (m) => this.applyFx(m.fx))
  }

  /** Host: about 20 times a second, send what the other screen needs to draw. */
  private broadcast(dt: number) {
    if (!Net.isHost) return
    this.sendT -= dt
    if (this.sendT > 0) return
    this.sendT = 0.05
    Net.send({ k: 'snap', s: this.snapshot() })
  }

  private snapshot(): LevelSnap {
    const r = (v: number) => Math.round(v * 10) / 10
    return {
      now: this.now,
      elapsed: this.elapsed,
      px: r(this.px),
      py: r(this.py),
      vx: r(this.vxSmooth),
      moving: this.priyaMoving,
      frozen: this.run.frozen > 0 || (!!this.busy && !this.busy.cancel) || this.promptActive,
      run: this.run,
      energy: this.barrier.energy,
      abil: this.def.abilities.map((id) => [this.barrier.blockedReason(id, this.now), this.barrier.cooldownLeft(id, this.now), Math.max(0, this.barrier.usesLeft(id))]),
      lamps: this.lamps.map((l) => l.state),
      gates: this.gates.map((g) => [g.closedUntil, g.fakeUntil]),
      signs: this.signs.map((g) => [g.id, g.c, g.r, g.fake, g.verified]),
      npcs: this.npcs.map((n) => n.used),
      allies: this.allies.map((a) => ({
        uid: a.uid ?? 0,
        npc: this.npcs.findIndex((n) => n.crew === a.crew),
        color: a.crew.color,
        label: a.label ?? '',
        x: r(a.crew.x),
        y: r(a.crew.y),
        mode: a.mode,
        joined: a.joined,
      })),
      crowd: this.crowd.map((n) => [r(n.crew.x), r(n.crew.y)]),
      hint: this.useHint.text,
      prog: this.progFrac,
      focus: this.focusAt,
    }
  }

  private applyFx(fx: LevelFx) {
    switch (fx.f) {
      case 'toast':
        if (this.sees(fx.to)) this.hud.toast(fx.msg, fx.color)
        break
      case 'intel':
        this.hud.intel(fx.msg, this.now * 1000)
        break
      case 'puff':
        if (!(fx.barrier && this.view === 'runner')) this.spawnPuff(fx.x, fx.y, fx.tint)
        break
      case 'sfx':
        Sfx[fx.name]()
        break
      case 'shake':
        this.cameras.main.shake(fx.ms, fx.amt)
        break
      case 'end':
        this.run.ended = true
        this.endEffects(fx.win)
        break
      case 'call':
        // Priya's player sees the card itself; the Barrier sees that she is on a call
        this.callPlate?.destroy()
        this.callPlate = undefined
        if (fx.title && this.view !== 'runner') this.callPlate = waitingPlate(this, 'PRIYA IS ON HER PHONE', fx.title)
        break
    }
  }

  /** Guest: draw the host's latest snapshot, while this player's own side moves without lag. */
  private mirror(dt: number) {
    const s = this.latest
    if (!s) return
    this.snapAge += dt
    this.now = s.now + Math.min(this.snapAge, 0.25)
    this.elapsed = s.elapsed + Math.min(this.snapAge, 0.25)
    Object.assign(this.run, s.run)
    this.barrier.energy = s.energy
    const ease = Math.min(1, dt * 14)

    s.lamps.forEach((state, i) => {
      const l = this.lamps[i]
      if (l && l.state !== state) {
        l.state = state
        this.drawLamp(l)
      }
    })
    s.gates.forEach(([closedUntil, fakeUntil], i) => {
      const g = this.gates[i]
      if (!g) return
      g.closedUntil = closedUntil
      g.fakeUntil = fakeUntil
      const closed = this.now < closedUntil
      if (closed) this.world.closed.add(g.def.id)
      else this.world.closed.delete(g.def.id)
      const look = `${closed}${this.now < fakeUntil}`
      if (this.gateLook.get(g) !== look) {
        this.gateLook.set(g, look)
        this.drawGate(g)
      }
    })
    for (const [id, c, r, fake, verified] of s.signs) {
      let sign = this.signs.find((x) => x.id === id)
      if (!sign) {
        const [x, y] = World.center(c, r)
        sign = { id, c, r, x, y, fake, verified, gfx: this.add.graphics({ x, y }).setDepth(12) }
        this.signs.push(sign)
        this.drawSign(sign)
      } else if (sign.fake !== fake || sign.verified !== verified) {
        sign.fake = fake
        sign.verified = verified
        this.drawSign(sign)
      }
    }
    s.npcs.forEach((used, i) => {
      if (this.npcs[i]) this.npcs[i].used = used
    })
    this.mirrorAllies(s.allies, dt, ease)
    s.crowd.forEach(([x, y], i) => {
      const c = this.crowd[i]?.crew
      if (!c) return
      const nx = c.x + (x - c.x) * ease
      const ny = c.y + (y - c.y) * ease
      c.animate(dt, dist(nx, ny, c.x, c.y) > 0.1, nx - c.x)
      c.setPosition(nx, ny).setDepth(5 + ny / 1000)
    })

    if (this.view === 'runner') this.walkLocally(dt, s)
    else {
      this.px += (s.px - this.px) * ease
      this.py += (s.py - this.py) * ease
      this.priya.setPosition(this.px, this.py).setDepth(5 + this.py / 1000)
      this.priya.animate(dt, s.moving, s.vx)
      this.updateBarrierInput(dt)
      this.sendAim(dt)
    }

    this.focusAt = s.focus
    this.useHint.setText(s.hint).setPosition(this.px, this.py - 52)
    this.progressGfx.clear()
    if (s.prog >= 0) this.drawProgress(s.prog, '')
    if (this.run.isolation > 80) {
      this.ambientCool -= dt
      if (this.ambientCool <= 0) {
        Sfx.heartbeat()
        this.ambientCool = 0.9
      }
    }
  }

  /** Guest playing Priya: move her here at once and tell the host where she is. */
  private walkLocally(dt: number, s: LevelSnap) {
    const k = this.keys
    let dx = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0)
    let dy = (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0)
    // while she can't move, the host decides where she stands
    if (s.frozen || this.scene.isActive('Prompt')) {
      dx = dy = 0
      this.px = s.px
      this.py = s.py
    }
    if (dx && dy) {
      dx *= Math.SQRT1_2
      dy *= Math.SQRT1_2
    }
    const speed = BALANCE.playerSpeed * (this.run.battery <= 0 ? 0.92 : 1)
    let [nx, ny] = this.world.move(this.px, this.py, dx * speed * dt, dy * speed * dt)
    // drifted too far from the host's copy (a gate shut in her face): trust the host
    if (dist(nx, ny, s.px, s.py) > 90) [nx, ny] = [s.px, s.py]
    const moved = dist(nx, ny, this.px, this.py)
    this.vxSmooth = Phaser.Math.Linear(this.vxSmooth, dx * speed, 0.4)
    this.px = nx
    this.py = ny
    this.priya.setPosition(nx, ny).setDepth(5 + ny / 1000)
    this.priya.animate(dt, moved > 0.3, this.vxSmooth)

    for (const key of ['F', 'E', 'Q', 'SPACE']) if (Phaser.Input.Keyboard.JustDown(this.keys[key])) Net.send({ k: 'tap', key })
    this.sendT -= dt
    if (this.sendT <= 0) {
      this.sendT = 0.033
      Net.send({ k: 'run', x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10, held: ['W', 'A', 'S', 'D', 'SPACE'].filter((key) => this.keys[key].isDown) })
    }
  }

  /** Guest playing the Barrier: keep the host's copy of the cursor close to this one. */
  private sendAim(dt: number) {
    this.sendT -= dt
    if (this.sendT > 0) return
    this.sendT = 0.05
    Net.send({ k: 'aim', x: Math.round(this.aim.x), y: Math.round(this.aim.y) })
  }

  private mirrorAllies(list: AllySnap[], dt: number, ease: number) {
    const seen = new Set<number>()
    for (const a of list) {
      seen.add(a.uid)
      let ally = this.allies.find((x) => x.uid === a.uid)
      if (!ally) {
        const npc = this.npcs[a.npc]
        const crew = npc ? npc.crew : new Crewmate(this, a.x, a.y, a.color).setDepth(5).setLabel(a.label, FONT)
        if (npc && a.label) crew.setLabel(a.label, FONT)
        if (!npc) crew.popIn()
        ally = { id: '', uid: a.uid, crew, mode: a.mode as AllyMode, ttl: 0, path: [], repath: 0, joined: a.joined, lastX: crew.x, lastY: crew.y }
        this.allies.push(ally)
      }
      ally.mode = a.mode as AllyMode
      ally.joined = a.joined
      const c = ally.crew
      c.x += (a.x - c.x) * ease
      c.y += (a.y - c.y) * ease
      c.setDepth(5 + c.y / 1000)
      c.animate(dt, dist(c.x, c.y, ally.lastX, ally.lastY) > 0.3, c.x - ally.lastX)
      ally.lastX = c.x
      ally.lastY = c.y
    }
    for (const ally of this.allies.filter((x) => !seen.has(x.uid ?? -1))) {
      this.allies = this.allies.filter((x) => x !== ally)
      if (!this.npcs.some((n) => n.crew === ally.crew)) ally.crew.popOut(() => ally.crew.destroy())
    }
  }
}

