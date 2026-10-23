import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { button, hex, panel, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

export interface PromptResult {
  correct: boolean
  choice: number[]
  timedOut: boolean
}

export interface PromptConfig {
  parent: string
  title: string
  from?: string
  body: string
  options: string[]
  /** Indices that count as correct. Leave undefined for story choices with no right answer. */
  correct?: number[]
  /** Index that is the best match (shown when more than one answer is accepted). */
  best?: number
  /** How many options must be picked (default 1). */
  pick?: number
  timer?: number
  hint?: string
  reason?: string
  accent?: number
  onDone: (r: PromptResult) => void
}

/**
 * Generic phone-style overlay used for helpline cards, Trust Check, Spot the Scam,
 * Ride Check, Code Phrase, Prologue and Bystander choices.
 */
export class PromptScene extends Phaser.Scene {
  private cfg!: PromptConfig
  private picked = new Set<number>()
  private locked = false
  private left = 0
  private bar!: Phaser.GameObjects.Graphics
  private optionButtons: ReturnType<typeof button>[] = []
  private confirm?: ReturnType<typeof button>

  constructor() {
    super('Prompt')
  }

  init(cfg: PromptConfig) {
    this.cfg = cfg
    this.picked = new Set()
    this.locked = false
    this.left = cfg.timer ?? 0
    this.optionButtons = []
    this.done = false
    this.finishAfter = 0
    this.result = { correct: false, choice: [], timedOut: false }
  }

  create() {
    const cfg = this.cfg
    const accent = cfg.accent ?? COLORS.cyan
    const n = cfg.options.length
    const w = 700
    const bodyText = text(this, 0, 0, cfg.body, 22, '#ffffff', { wordWrap: { width: w - 80 }, lineSpacing: 6 })
    const bodyH = bodyText.height
    const hintH = cfg.hint ? 30 : 0
    const h = 150 + bodyH + hintH + n * 64 + ((cfg.pick ?? 1) > 1 ? 64 : 0)
    const x = (1280 - w) / 2
    const y = Math.max(20, (720 - h) / 2)

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.62)
    const root = this.add.container(0, 0)
    root.add(panel(this, x, y, w, h, 0x0c1030, accent))

    root.add(text(this, x + 36, y + 22, cfg.title, 24, hex(accent)))
    if (cfg.from) root.add(text(this, x + w - 36, y + 26, cfg.from, 16, '#9aa4d6').setOrigin(1, 0))
    bodyText.setPosition(x + 40, y + 72)
    root.add(bodyText)
    let cy = y + 86 + bodyH
    if (cfg.hint) {
      root.add(text(this, x + 40, cy, cfg.hint, 16, '#f5e663'))
      cy += hintH
    }
    cy += 24

    cfg.options.forEach((label, i) => {
      const b = button(this, 640, cy + 28, w - 80, 52, `${i + 1}   ${label}`, () => this.choose(i), accent, label.length > 46 ? 15 : 20)
      this.optionButtons.push(b)
      root.add(b.container)
      cy += 64
    })
    if ((cfg.pick ?? 1) > 1) {
      this.confirm = button(this, 640, cy + 30, 240, 48, 'Confirm', () => this.submit(), COLORS.green, 20)
      this.confirm.setEnabled(false)
      root.add(this.confirm.container)
    }

    this.bar = this.add.graphics()
    this.barRect = { x: x + 40, y: y + 56, w: w - 80 }
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const i = parseInt(e.key, 10) - 1
      if (i >= 0 && i < n) this.choose(i)
      if ((e.key === 'Enter' || e.key === ' ') && this.locked) this.finish()
    })
    this.input.on('pointerdown', () => this.locked && this.time.now > this.finishAfter && this.finish())

    // entrance: pop in, phone shake for incoming calls
    root.setScale(0.9).setAlpha(0)
    this.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' })
    if (cfg.timer) Sfx.phone()
  }

  private finishAfter = 0
  private barRect = { x: 0, y: 0, w: 0 }

  update(_t: number, delta: number) {
    if (!this.cfg.timer || this.locked) return
    this.left -= delta / 1000
    const frac = Math.max(0, this.left / this.cfg.timer)
    this.bar.clear()
    const { x, y, w } = this.barRect
    this.bar.fillStyle(0x000000, 0.5).fillRoundedRect(x, y, w, 10, 5)
    this.bar.fillStyle(frac > 0.35 ? COLORS.green : COLORS.red, 1).fillRoundedRect(x, y, Math.max(0, w * frac), 10, 5)
    if (this.left <= 0) this.resolve([], true)
  }

  private choose(i: number) {
    if (this.locked) return
    const need = this.cfg.pick ?? 1
    if (need === 1) return this.resolve([i], false)
    if (this.picked.has(i)) this.picked.delete(i)
    else if (this.picked.size < need) this.picked.add(i)
    this.optionButtons.forEach((b, k) => b.container.setAlpha(this.picked.has(k) ? 1 : 0.7))
    this.confirm?.setEnabled(this.picked.size === need)
    Sfx.click()
  }

  private submit() {
    if (this.picked.size === (this.cfg.pick ?? 1)) this.resolve([...this.picked], false)
  }

  private resolve(choice: number[], timedOut: boolean) {
    if (this.locked) return
    this.locked = true
    this.bar.clear()
    const cfg = this.cfg
    let correct = true
    if (cfg.correct) {
      correct = !timedOut && choice.length > 0 && choice.every((c) => cfg.correct!.includes(c)) && choice.length === (cfg.pick ?? 1)
    }
    this.result = { correct, choice, timedOut }
    this.optionButtons.forEach((b, k) => {
      b.setEnabled(false)
      b.container.disableInteractive()
      if (cfg.correct?.includes(k)) b.container.setAlpha(1)
    })
    this.confirm?.container.setVisible(false)

    if (!cfg.correct) {
      this.time.delayedCall(250, () => this.finish())
      return
    }
    Sfx[correct ? 'good' : 'bad']()
    const msg = timedOut ? "Time's up!" : correct ? 'Correct!' : 'Not quite'
    const col = correct ? COLORS.green : COLORS.red
    const best = cfg.best !== undefined && correct && !choice.includes(cfg.best) ? '\nBest match: ' + cfg.options[cfg.best] : ''
    const wrongAnswer = correct ? '' : `\nRight answer: ${cfg.correct.map((c) => cfg.options[c]).join('  or  ')}`
    const box = panel(this, 240, 618, 800, 86, 0x0c1030, col)
    const t1 = text(this, 640, 628, msg, 24, hex(col)).setOrigin(0.5, 0)
    const t2 = text(this, 640, 660, (cfg.reason ?? '') + best + wrongAnswer, 15, '#ffffff', { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5, 0)
    this.add.container(0, 0, [box, t1, t2])
    this.finishAfter = this.time.now + 400
    this.time.delayedCall(correct ? 2600 : 3800, () => this.finish())
  }

  private result: PromptResult = { correct: false, choice: [], timedOut: false }
  private done = false

  private finish() {
    if (this.done) return
    this.done = true
    const parent = this.cfg.parent
    const r = this.result
    const cb = this.cfg.onDone
    this.scene.stop()
    this.scene.resume(parent)
    cb(r)
  }
}
