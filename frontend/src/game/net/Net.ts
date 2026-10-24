import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import type { PromptConfig, PromptResult } from '../scenes/PromptScene.ts'
import { SceneBridge, type SceneKey } from '../sceneBridge.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerIdx } from '../types.ts'
import { display, hex, panel } from '../ui/widgets.ts'
import type { Relay, RelayKind, RelayOf, ServerMsg } from './protocol.ts'

export type NetRole = 'offline' | 'host' | 'guest'

export interface RoomStatus {
  role: NetRole
  /** idle: no room. connecting: talking to the server. waiting: room open, alone. paired: both players in. */
  phase: 'idle' | 'connecting' | 'waiting' | 'paired'
  code: string
  error: string
}

/** Scenes the guest mirrors. Anywhere else (menu, level select) the guest waits in the room. */
const SHARED_SCENES: readonly SceneKey[] = ['Prologue', 'Brief', 'Level', 'RoundEnd', 'LevelResult', 'Ending', 'Results']

const WS_URL: string = import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

type Handler<K extends RelayKind> = (msg: RelayOf<K>) => void

/**
 * Two computers, one game. The room creator (host, Player 1) runs every rule; the guest (Player 2)
 * draws the same scenes from what the host sends, and sends back its own input.
 * Offline (solo, or two players on one keyboard) none of this is used and the game runs as before.
 */
class NetClient {
  private ws: WebSocket | null = null
  private handlers = new Map<RelayKind, Set<(m: Relay) => void>>()
  private listeners = new Set<() => void>()
  private promptId = 0
  private pending = new Map<number, (r: PromptResult) => void>()
  status: RoomStatus = { role: 'offline', phase: 'idle', code: '', error: '' }

  constructor() {
    SceneBridge.subscribe((key) => this.onScene(key))
    this.on('prompt', (m) => this.showRemotePrompt(m.id, m.cfg))
    this.on('answer', (m) => {
      this.pending.get(m.id)?.(m.result)
      this.pending.delete(m.id)
    })
    this.on('scene', (m) => this.follow(m.key, m.state))
  }

  get role() {
    return this.status.role
  }

  /** Two computers are playing (or a room is open). */
  get online() {
    return this.status.role !== 'offline'
  }

  get isHost() {
    return this.status.role === 'host'
  }

  get isGuest() {
    return this.status.role === 'guest'
  }

  /** The player sitting at this computer, or null when one computer plays both (or the room has no second player yet). */
  get localPlayer(): PlayerIdx | null {
    if (this.status.phase !== 'paired') return null
    return this.isHost ? 0 : this.isGuest ? 1 : null
  }

  /** Does the person at this computer play `p`? Always true offline. */
  owns(p: PlayerIdx) {
    const me = this.localPlayer
    return me === null || me === p
  }

  // ───────────── room lifecycle ─────────────

  createRoom() {
    this.open({ t: 'create' })
  }

  joinRoom(code: string) {
    this.open({ t: 'join', code })
  }

  leaveRoom() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'leave' }))
    this.drop('')
  }

  private open(first: object) {
    this.ws?.close()
    this.setStatus({ role: 'offline', phase: 'connecting', code: '', error: '' })
    const ws = new WebSocket(WS_URL)
    this.ws = ws
    ws.onopen = () => ws.send(JSON.stringify(first))
    ws.onmessage = (e) => this.onServer(JSON.parse(e.data as string) as ServerMsg)
    ws.onerror = () => this.ws === ws && this.drop('Could not reach the room server. Is it running?')
    ws.onclose = () => this.ws === ws && this.drop(this.status.phase === 'connecting' ? 'Could not reach the room server. Is it running?' : 'Lost the connection to the room.')
  }

  /** Back to offline. Anyone in the middle of a shared game is sent back to the room screen. */
  private drop(error: string) {
    const ws = this.ws
    this.ws = null
    ws?.close()
    this.pending.clear()
    const wasOnline = this.online
    this.setStatus({ role: 'offline', phase: 'idle', code: '', error })
    if (wasOnline && SHARED_SCENES.includes(SceneBridge.active)) SceneBridge.show('Room')
  }

  private onServer(msg: ServerMsg) {
    switch (msg.t) {
      case 'created':
        GameState.newGame('duo')
        return this.setStatus({ role: 'host', phase: 'waiting', code: msg.code, error: '' })
      case 'joined':
        GameState.newGame('duo')
        return this.setStatus({ role: 'guest', phase: 'paired', code: msg.code, error: '' })
      case 'peer-joined':
        this.setStatus({ ...this.status, phase: 'paired', error: '' })
        // a guest who joins mid-way lands on whatever is on screen now
        return this.onScene(SceneBridge.active)
      case 'peer-left':
        this.pending.clear()
        this.setStatus({ ...this.status, phase: 'waiting', error: 'Player 2 left the room.' })
        // back to the room to wait for someone to join again
        if (SHARED_SCENES.includes(SceneBridge.active) || SceneBridge.active === 'LevelSelect') SceneBridge.show('Room')
        return
      case 'closed':
        return this.drop('Player 1 closed the room.')
      case 'error':
        this.ws?.close()
        this.ws = null
        return this.setStatus({ role: 'offline', phase: 'idle', code: '', error: msg.message })
      case 'relay':
        return this.handlers.get(msg.data.k)?.forEach((h) => (h as (m: Relay) => void)(msg.data))
    }
  }

  // ───────────── status for React ─────────────

  private setStatus(s: RoomStatus) {
    this.status = s
    this.listeners.forEach((l) => l())
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => void this.listeners.delete(l)
  }

  getStatus = () => this.status

  // ───────────── messages ─────────────

  send(msg: Relay) {
    if (this.status.phase === 'paired' && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'relay', data: msg }))
  }

  on<K extends RelayKind>(kind: K, fn: Handler<K>) {
    let set = this.handlers.get(kind)
    if (!set) this.handlers.set(kind, (set = new Set()))
    const h = fn as unknown as (m: Relay) => void
    set.add(h)
    return () => void set.delete(h)
  }

  /** Same as `on`, removed automatically when the scene shuts down. */
  onWhile<K extends RelayKind>(scene: Phaser.Scene, kind: K, fn: Handler<K>) {
    const off = this.on(kind, fn)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off)
    return off
  }

  // ───────────── scenes ─────────────

  /** Host: tell the guest which scene to show. Leaving to the menu closes the room. */
  private onScene(key: SceneKey) {
    if (!this.online) return
    if (key === 'Menu' || key === 'Trailer') {
      // the host heading back to the menu takes the guest along, then the room closes
      if (this.isHost) this.send({ k: 'scene', key: 'Menu', state: null })
      return this.leaveRoom()
    }
    if (!this.isHost) return
    if (SHARED_SCENES.includes(key)) this.send({ k: 'scene', key, state: GameState.snapshot() })
    else this.send({ k: 'scene', key: 'Room', state: null })
  }

  /** Guest: show what the host shows. */
  private follow(key: SceneKey, state: ReturnType<typeof GameState.snapshot> | null) {
    if (state) GameState.restore(state)
    SceneBridge.show(key)
  }

  /**
   * A button or key either player may press, whose effect only the host runs (it changes scenes or state).
   * Returns the function to call on a local press.
   */
  shared(scene: Phaser.Scene, name: string, fn: () => void): () => void {
    const key = scene.sys.settings.key
    if (this.isHost) {
      this.onWhile(scene, 'act', (m) => m.scene === key && m.name === name && fn())
      return fn
    }
    if (this.isGuest) return () => this.send({ k: 'act', scene: key, name })
    return fn
  }

  /** Like `shared`, but the effect is visual and runs on both screens (for example the next ending page). */
  mirrored(scene: Phaser.Scene, name: string, fn: () => void): () => void {
    const key = scene.sys.settings.key
    if (this.isGuest) {
      this.onWhile(scene, 'cue', (m) => m.scene === key && m.name === name && fn())
      return () => this.send({ k: 'act', scene: key, name })
    }
    const run = () => {
      this.send({ k: 'cue', scene: key, name })
      fn()
    }
    if (this.isHost) this.onWhile(scene, 'act', (m) => m.scene === key && m.name === name && run())
    return run
  }

  /** Host: play a visual step on the guest's copy of this scene. */
  cue(scene: Phaser.Scene, name: string) {
    if (this.isHost) this.send({ k: 'cue', scene: scene.sys.settings.key, name })
  }

  /** Guest: run `fn` when the host cues `name` on this scene. */
  onCue(scene: Phaser.Scene, name: string, fn: () => void) {
    const key = scene.sys.settings.key
    this.onWhile(scene, 'cue', (m) => m.scene === key && m.name === name && fn())
  }

  // ───────────── prompts ─────────────

  /**
   * Show a choice card to the player it belongs to. On their own computer it opens here as before;
   * otherwise it opens on the other computer, and this one shows who is choosing until they answer.
   */
  prompt(scene: Phaser.Scene, who: PlayerIdx, cfg: PromptConfig) {
    if (this.owns(who)) {
      scene.scene.launch('Prompt', cfg)
      return
    }
    const { parent, onDone, ...remote } = cfg
    const plate = waitingPlate(scene, `PLAYER ${who + 1} IS CHOOSING`, cfg.title)
    const id = ++this.promptId
    this.pending.set(id, (r) => {
      plate.destroy()
      scene.scene.resume(parent)
      onDone(r)
    })
    this.send({ k: 'prompt', id, cfg: remote })
  }

  /** Guest: the host asked this player something. */
  private showRemotePrompt(id: number, cfg: Omit<PromptConfig, 'parent' | 'onDone'>) {
    SceneBridge.overlay('Prompt', {
      ...cfg,
      parent: SceneBridge.active,
      onDone: (result: PromptResult) => this.send({ k: 'answer', id, result }),
    } satisfies PromptConfig)
  }
}

/** Small console plate saying the other player is busy with a card. */
export function waitingPlate(scene: Phaser.Scene, head: string, sub = '') {
  const c = scene.add.container(0, 0).setDepth(200)
  c.add(scene.add.rectangle(640, 360, 1280, 720, COLORS.bg, 0.55))
  c.add(panel(scene, 390, 300, 500, 120, COLORS.panel, COLORS.cyan))
  c.add(display(scene, 640, 336, head, 18, hex(COLORS.cyan)).setOrigin(0.5))
  if (sub) c.add(display(scene, 640, 374, sub.toUpperCase(), 12, hex(COLORS.muted)).setOrigin(0.5))
  return c
}

export const Net = new NetClient()
