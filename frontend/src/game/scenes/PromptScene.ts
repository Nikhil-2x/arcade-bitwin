import Phaser from 'phaser'
import { BALANCE, COLORS } from '../config/constants.ts'
import { button, display, hex, panel, stamp, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

/** Consecutive correct graded answers across all cards; a wrong one resets it. */
let combo = 0

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
  /** A call or message arriving on her phone: "INCOMING" header and a ring. */
  incoming?: boolean
  hint?: string
  reason?: string
  accent?: number
  onDone: (r: PromptResult) => void
}

/**
 * Generic phone-style overlay used for helpline cards, Trust Check, Spot the Scam,
 * Ride Check, Code Phrase, Prologue and Bystander choices.
 * Every card runs on the same clock (BALANCE.cardTime) and is answered from the keyboard:
 * W / S move the highlight and Space answers. The mouse and number keys belong to the Barrier.
 */
export class PromptScene extends Phaser.Scene {
  private cfg!: PromptConfig
  private picked = new Set<number>()
  private locked = false
  private left = 0
  private sel = 0
  private bar!: Phaser.GameObjects.Graphics
  private optionButtons: ReturnType<typeof button>[] = []

  constructor() {
    super('Prompt')
  }

  init(cfg: PromptConfig) {
    this.cfg = cfg
    this.picked = new Set()
    this.locked = false
    this.left = BALANCE.cardTime
    this.sel = 0
    this.optionButtons = []
    this.done = false
    this.finishAfter = 0
    this.result = { correct: false, choice: [], timedOut: false }
  }

  create() {
    const cfg = this.cfg
    const accent = cfg.accent ?? COLORS.cyan
    const need = cfg.pick ?? 1
    const w = 700
    const bodyText = text(this, 0, 0, cfg.body, 21, hex(COLORS.paper), { wordWrap: { width: w - 80 }, lineSpacing: 6 })
    const bodyH = bodyText.height
    const hintH = cfg.hint ? 30 : 0
    const h = 184 + bodyH + hintH + cfg.options.length * 62
    const x = (1280 - w) / 2
    const y = Math.max(20, (720 - h) / 2)

    this.add.rectangle(640, 360, 1280, 720, COLORS.bg, 0.7)
    const root = this.add.container(0, 0)
    root.add(panel(this, x, y, w, h, COLORS.panel, accent))

    // header strip: what kind of card this is, then who it's from
    root.add(display(this, x + 40, y + 20, cfg.incoming ? 'INCOMING' : 'CHOICE', 11, hex(accent)))
    if (cfg.from) root.add(display(this, x + w - 40, y + 20, cfg.from.toUpperCase(), 11, hex(COLORS.muted)).setOrigin(1, 0))
    root.add(display(this, x + 40, y + 38, cfg.title.toUpperCase(), 22, hex(COLORS.paper)))
    bodyText.setPosition(x + 40, y + 92)
    root.add(bodyText)
    let cy = y + 104 + bodyH
    if (cfg.hint) {
      root.add(text(this, x + 40, cy, cfg.hint, 16, hex(COLORS.amber)))
      cy += hintH
    }
    cy += 16

    cfg.options.forEach((label, i) => {
      const b = button(this, 640, cy + 26, w - 80, 50, label, () => this.choose(i), accent, label.length > 46 ? 15 : 18, { body: true })
      b.container.disableInteractive()
      this.optionButtons.push(b)
      root.add(b.container)
      cy += 62
    })
    const how = need > 1 ? `SPACE  PICK ${need}` : 'SPACE  ANSWER'
    root.add(display(this, 640, cy + 8, `W / S  CHOOSE      ${how}`, 11, hex(COLORS.muted)).setOrigin(0.5, 0))
    this.optionButtons[0]?.setFocus(true)

    this.bar = this.add.graphics()
    this.barRect = { x: x + 40, y: y + 74, w: w - 80 }
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e))

    // entrance: pop in, phone ring for incoming calls
    root.setScale(0.9).setAlpha(0)
    this.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' })
    if (cfg.incoming) Sfx.phone()
  }

  private finishAfter = 0
  private barRect = { x: 0, y: 0, w: 0 }

  /** W / S move the highlight, Space answers; Space again skips the result once it has shown. */
  private onKey(e: KeyboardEvent) {
    // ignore auto-repeat: she may still be holding W or Space from walking or reporting
    if (e.repeat) return
    const k = e.key.toLowerCase()
    const n = this.optionButtons.length
    if (this.locked) {
      if (k === ' ' && this.time.now > this.finishAfter) this.finish()
      return
    }
    if (k === 'w' || k === 's') {
      this.optionButtons[this.sel].setFocus(false)
      this.sel = (this.sel + (k === 'w' ? n - 1 : 1)) % n
      this.optionButtons[this.sel].setFocus(true)
      Sfx.hover()
    } else if (k === ' ') {
      this.choose(this.sel)
    }
  }

  update(_t: number, delta: number) {
    if (this.locked) return
    this.left -= delta / 1000
    const frac = Math.max(0, this.left / BALANCE.cardTime)
    this.bar.clear()
    const { x, y, w } = this.barRect
    // draining frame ruler: ticks every 10px, lit ones still have time on them
    const edge = x + w * frac
    const col = frac > 0.35 ? COLORS.amber : COLORS.red
    for (let tx = x, i = 0; tx <= x + w; tx += 10, i++) {
      this.bar.lineStyle(i % 5 === 0 ? 2 : 1, tx <= edge ? col : COLORS.panelEdge, 1).lineBetween(tx, y + 8, tx, y + 8 - (i % 5 === 0 ? 8 : 4))
    }
    this.bar.fillStyle(col, 1).fillRect(x, y + 9, Math.max(0, w * frac), 2)
    if (this.left <= 0) this.resolve([...this.picked], true)
  }

  /** Single-pick cards answer at once. Multi-pick cards toggle a tick and answer when enough are ticked. */
  private choose(i: number) {
    if (this.locked) return
    const need = this.cfg.pick ?? 1
    if (need === 1) return this.resolve([i], false)
    if (this.picked.has(i)) this.picked.delete(i)
    else this.picked.add(i)
    const label = this.optionButtons[i].container.getAt(1) as Phaser.GameObjects.Text
    label.setText(`${this.picked.has(i) ? '✓  ' : ''}${this.cfg.options[i]}`)
    Sfx.click()
    if (this.picked.size === need) this.resolve([...this.picked], false)
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
      if (cfg.correct?.includes(k)) b.container.setAlpha(1)
    })

    if (!cfg.correct) {
      this.time.delayedCall(250, () => this.finish())
      return
    }
    Sfx[correct ? 'good' : 'bad']()
    combo = correct ? combo + 1 : 0
    if (correct) {
      // timing grade: how much of the clock was left when she answered
      const frac = this.left / BALANCE.cardTime
      const word = frac > 0.6 ? 'PERFECT' : frac > 0.3 ? 'QUICK' : 'GOOD'
      stamp(this, 640, 150, word, frac > 0.6 ? COLORS.amber : COLORS.green, combo)
    } else {
      this.cameras.main.shake(140, 0.006)
    }
    const msg = timedOut ? 'TIME RAN OUT' : correct ? 'RIGHT CALL' : 'NOT THIS ONE'
    const col = correct ? COLORS.green : COLORS.red
    const best = cfg.best !== undefined && correct && !choice.includes(cfg.best) ? '\nBest match: ' + cfg.options[cfg.best] : ''
    const wrongAnswer = correct ? '' : `\nRight answer: ${cfg.correct.map((c) => cfg.options[c]).join('  or  ')}`
    const box = panel(this, 240, 618, 800, 86, COLORS.bg, col)
    const t1 = display(this, 640, 630, msg, 18, hex(col)).setOrigin(0.5, 0)
    const t2 = text(this, 640, 658, (cfg.reason ?? '') + best + wrongAnswer, 15, hex(COLORS.paper), { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5, 0)
    const result = this.add.container(0, 30, [box, t1, t2]).setAlpha(0)
    this.tweens.add({ targets: result, y: 0, alpha: 1, duration: 260, ease: 'Expo.easeOut' })
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
