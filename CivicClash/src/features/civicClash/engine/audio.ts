// ─────────────────────────────────────────────────────────────────────────────
// Civic Clash — Procedural WebAudio engine (PATCH-A · game feel)
// 100% synthesized. No asset files. Backwards compatible with the original
// API (playClick / playPaperFold / playWhoosh / playWhisper / playSuccess /
// playError / playSiren / playRaiseVoice / setMuted / isMuted).
//
// Layout:  voices ─▶ sfxBus ─┐
//                            ├▶ master ▶ compressor ▶ destination
//          music  ─▶ musicBus┘            (+ optional convolver reverb send)
// ─────────────────────────────────────────────────────────────────────────────

export type AudioQuality = 'low' | 'high'
export type FootSurface = 'asphalt' | 'tile' | 'gravel'
export type MusicMode = 'round' | 'accuse'
type Bus = 'sfx' | 'music'

interface VoiceOpts {
  type?: OscillatorType
  f0: number
  f1?: number
  dur: number
  vol?: number
  delay?: number
  attack?: number
  pan?: number
  detune?: number
  wet?: number
  bus?: Bus
  prio?: 1 | 2
  lp?: number
  lpEnd?: number
}

interface NoiseOpts {
  dur: number
  vol?: number
  delay?: number
  attack?: number
  filter?: BiquadFilterType
  f0?: number
  f1?: number
  q?: number
  pan?: number
  wet?: number
  bus?: Bus
  prio?: 1 | 2
}

const STORE_KEY = 'cc.audio.v1'
const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private reverbSend: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null

  private muted = false
  private musicEnabled = true
  private quality: AudioQuality = 'high'
  private voices = 0
  private unlocked = false

  // footsteps / throttles
  private lastClickAt = 0
  private lastHoverAt = 0
  private footFlip = 1

  // music state
  private mus = {
    running: false,
    paused: false,
    mode: 'round' as MusicMode,
    intensity: 0.1,
    target: 0.1,
    step: 0,
    nextTime: 0,
    timer: 0 as unknown as number,
    padGain: null as GainNode | null,
    padFilter: null as BiquadFilterNode | null,
    oscs: [] as OscillatorNode[]
  }

  constructor() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null
      if (raw) {
        const s = JSON.parse(raw) as { muted?: boolean; music?: boolean; quality?: AudioQuality }
        this.muted = !!s.muted
        this.musicEnabled = s.music !== false
        if (s.quality === 'low' || s.quality === 'high') this.quality = s.quality
      }
    } catch {
      /* storage unavailable — ignore */
    }
    if (typeof window !== 'undefined') {
      const unlock = () => this.unlock()
      window.addEventListener('pointerdown', unlock, { passive: true })
      window.addEventListener('keydown', unlock, { passive: true })
    }
  }

  // ───────────────────────── infrastructure ─────────────────────────
  private persist() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ muted: this.muted, music: this.musicEnabled, quality: this.quality })
      )
    } catch {
      /* ignore */
    }
  }

  private ready(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      try {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' })
      } catch {
        return null
      }
      const ctx = this.ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.knee.value = 18
      comp.ratio.value = 5
      comp.attack.value = 0.004
      comp.release.value = 0.2
      this.sfxBus = ctx.createGain()
      this.sfxBus.gain.value = 1
      this.musicBus = ctx.createGain()
      this.musicBus.gain.value = this.musicEnabled ? 0.55 : 0
      this.sfxBus.connect(this.master)
      this.musicBus.connect(this.master)
      this.master.connect(comp)
      comp.connect(ctx.destination)
      this.noiseBuf = this.makeNoise(ctx, 1.5)
      this.buildReverb(ctx)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
    return this.ctx
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  private buildReverb(ctx: AudioContext) {
    if (!this.master) return
    const secs = 1.4
    const len = Math.floor(ctx.sampleRate * secs)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    const conv = ctx.createConvolver()
    conv.buffer = ir
    const out = ctx.createGain()
    out.gain.value = 0.5
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 1
    this.reverbSend.connect(conv)
    conv.connect(out)
    out.connect(this.master)
  }

  /** Call from any user gesture. Safe to call repeatedly. */
  public unlock() {
    if (this.unlocked) return
    const ctx = this.ready()
    if (ctx && ctx.state === 'running') this.unlocked = true
  }

  private canPlay(prio: 1 | 2 = 1): boolean {
    if (this.muted) return false
    const cap = this.quality === 'low' ? 16 : 44
    return prio === 2 || this.voices < cap
  }

  private route(
    ctx: AudioContext,
    src: AudioNode,
    t: number,
    pan: number | undefined,
    wet: number | undefined,
    bus: Bus | undefined
  ) {
    let out: AudioNode = src
    if (pan !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      out.connect(p)
      out = p
    }
    out.connect((bus === 'music' ? this.musicBus : this.sfxBus) as AudioNode)
    if (wet && wet > 0 && this.quality === 'high' && this.reverbSend) {
      const w = ctx.createGain()
      w.gain.value = wet
      out.connect(w)
      w.connect(this.reverbSend)
    }
    void t
  }

  private tone(o: VoiceOpts) {
    const ctx = this.ready()
    if (!ctx || !this.canPlay(o.prio)) return
    const t = ctx.currentTime + (o.delay ?? 0)
    const osc = ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(o.f0, t)
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur)
    if (o.detune) osc.detune.value = o.detune
    const g = ctx.createGain()
    const vol = o.vol ?? 0.15
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol, t + (o.attack ?? 0.004))
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
    let head: AudioNode = osc
    if (o.lp) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(o.lp, t)
      if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.lpEnd), t + o.dur)
      head.connect(f)
      head = f
    }
    head.connect(g)
    this.route(ctx, g, t, o.pan, o.wet, o.bus)
    this.voices++
    osc.onended = () => {
      this.voices = Math.max(0, this.voices - 1)
      try {
        g.disconnect()
      } catch {
        /* noop */
      }
    }
    osc.start(t)
    osc.stop(t + o.dur + 0.03)
  }

  private noise(o: NoiseOpts) {
    const ctx = this.ready()
    if (!ctx || !this.noiseBuf || !this.canPlay(o.prio)) return
    const t = ctx.currentTime + (o.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = o.dur > 1.4
    const f = ctx.createBiquadFilter()
    f.type = o.filter ?? 'bandpass'
    f.frequency.setValueAtTime(o.f0 ?? 1200, t)
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t + o.dur)
    f.Q.value = o.q ?? 1
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(o.vol ?? 0.15, t + (o.attack ?? 0.003))
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
    src.connect(f)
    f.connect(g)
    this.route(ctx, g, t, o.pan, o.wet, o.bus)
    this.voices++
    src.onended = () => {
      this.voices = Math.max(0, this.voices - 1)
      try {
        g.disconnect()
      } catch {
        /* noop */
      }
    }
    src.start(t, Math.random() * 0.5)
    src.stop(t + o.dur + 0.03)
  }

  // ───────────────────────── settings ─────────────────────────
  public setMuted(m: boolean) {
    this.muted = m
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05)
    if (m) this.stopMusic(0.1)
    this.persist()
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMusicEnabled(on: boolean) {
    this.musicEnabled = on
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1)
    this.persist()
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled
  }

  public setQuality(q: AudioQuality) {
    this.quality = q
    this.persist()
  }

  public getQuality(): AudioQuality {
    return this.quality
  }

  /** Briefly lowers the music so a stinger cuts through. */
  public duck(depth = 0.35, hold = 0.35, release = 0.6) {
    if (!this.ctx || !this.musicBus || !this.musicEnabled) return
    const t = this.ctx.currentTime
    const g = this.musicBus.gain
    g.cancelScheduledValues(t)
    g.setTargetAtTime(0.55 * depth, t, 0.03)
    g.setTargetAtTime(0.55, t + hold, release / 3)
  }

  // ───────────────────────── legacy API (kept) ─────────────────────────
  public playClick() {
    const now = performance.now()
    if (now - this.lastClickAt < 45) return
    this.lastClickAt = now
    this.tone({ type: 'triangle', f0: 440, f1: 880, dur: 0.05, vol: 0.14 })
    this.tone({ type: 'sine', f0: 1760, dur: 0.025, vol: 0.04, delay: 0.01 })
  }

  public playPaperFold() {
    this.noise({ dur: 0.14, vol: 0.2, f0: 1400, f1: 700, q: 1.4 })
    this.noise({ dur: 0.05, vol: 0.1, f0: 3200, filter: 'highpass', delay: 0.05 })
  }

  public playWhoosh() {
    this.tone({ type: 'sine', f0: 300, f1: 110, dur: 0.2, vol: 0.14 })
    this.noise({ dur: 0.22, vol: 0.1, f0: 500, f1: 2400, q: 0.8, filter: 'bandpass' })
  }

  public playWhisper() {
    this.tone({ type: 'sine', f0: 180, f1: 120, dur: 0.28, vol: 0.14 })
    this.noise({ dur: 0.34, vol: 0.05, f0: 4200, f1: 2600, q: 2, filter: 'bandpass', attack: 0.08 })
  }

  public playSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      this.tone({ type: 'sine', f0: f, dur: 0.26, vol: 0.15, delay: i * 0.07, wet: 0.25 })
      this.tone({ type: 'triangle', f0: f * 2, dur: 0.12, vol: 0.04, delay: i * 0.07 })
    })
  }

  public playError() {
    this.tone({ type: 'sawtooth', f0: 170, f1: 105, dur: 0.28, vol: 0.17, lp: 900 })
    this.tone({ type: 'square', f0: 85, dur: 0.18, vol: 0.08, delay: 0.1, lp: 400 })
  }

  public playSiren() {
    const now = 0
    this.tone({ type: 'sine', f0: 600, dur: 0.3, vol: 0.14, delay: now })
    this.tone({ type: 'sine', f0: 900, dur: 0.3, vol: 0.14, delay: now + 0.3 })
    this.tone({ type: 'sine', f0: 600, dur: 0.3, vol: 0.12, delay: now + 0.6 })
    this.tone({ type: 'sine', f0: 900, dur: 0.3, vol: 0.1, delay: now + 0.9 })
  }

  public playRaiseVoice() {
    this.tone({ type: 'triangle', f0: 320, f1: 640, dur: 0.35, vol: 0.22 })
    this.tone({ type: 'sawtooth', f0: 160, f1: 320, dur: 0.3, vol: 0.06, lp: 800 })
  }

  // ───────────────────────── UI ─────────────────────────
  public playHover() {
    const now = performance.now()
    if (now - this.lastHoverAt < 60) return
    this.lastHoverAt = now
    this.tone({ type: 'sine', f0: 1320, dur: 0.03, vol: 0.025 })
  }

  public playToggle(on: boolean) {
    this.tone({ type: 'triangle', f0: on ? 520 : 440, f1: on ? 780 : 300, dur: 0.09, vol: 0.12 })
  }

  public playDeny() {
    this.tone({ type: 'square', f0: 150, dur: 0.07, vol: 0.09, lp: 700 })
    this.tone({ type: 'square', f0: 120, dur: 0.1, vol: 0.09, delay: 0.08, lp: 600 })
  }

  public playPing() {
    this.tone({ type: 'sine', f0: 1175, dur: 0.12, vol: 0.06, wet: 0.2 })
    this.tone({ type: 'sine', f0: 1568, dur: 0.14, vol: 0.05, delay: 0.06, wet: 0.2 })
  }

  public playInteract() {
    this.tone({ type: 'triangle', f0: 330, f1: 660, dur: 0.1, vol: 0.14 })
    this.noise({ dur: 0.07, vol: 0.06, f0: 2600, filter: 'highpass' })
  }

  // ───────────────────────── movement ─────────────────────────
  public playFootstep(sprint = false, surface: FootSurface = 'asphalt') {
    this.footFlip *= -1
    const pan = this.footFlip * 0.12
    const v = sprint ? 1.25 : 1
    const rnd = 0.92 + Math.random() * 0.16
    if (surface === 'tile') {
      this.noise({ dur: 0.045, vol: 0.07 * v, f0: 2400 * rnd, filter: 'bandpass', q: 3, pan })
      this.tone({ type: 'sine', f0: 140 * rnd, f1: 70, dur: 0.07, vol: 0.07 * v, pan })
    } else if (surface === 'gravel') {
      for (let i = 0; i < 3; i++) {
        this.noise({
          dur: 0.05,
          vol: 0.05 * v,
          f0: 3400 * rnd,
          filter: 'bandpass',
          q: 0.9,
          delay: i * 0.022,
          pan
        })
      }
      this.tone({ type: 'sine', f0: 110 * rnd, f1: 55, dur: 0.08, vol: 0.06 * v, pan })
    } else {
      this.noise({ dur: 0.06, vol: 0.07 * v, f0: 900 * rnd, f1: 500, filter: 'lowpass', q: 0.7, pan })
      this.tone({ type: 'sine', f0: 100 * rnd, f1: 50, dur: 0.09, vol: 0.09 * v, pan })
    }
  }

  // ───────────────────────── sabotage / abilities ─────────────────────────
  /** Per-ability signature stinger. Unknown ids fall back to a generic sneaky sting. */
  public playAbility(abilityId = '') {
    const id = abilityId.toLowerCase()
    if (id.includes('cctv')) {
      this.noise({ dur: 0.35, vol: 0.14, f0: 6000, f1: 800, filter: 'highpass', q: 0.5 })
      this.tone({ type: 'square', f0: 900, f1: 90, dur: 0.3, vol: 0.09, lp: 2500 })
      this.tone({ type: 'sawtooth', f0: 60, dur: 0.25, vol: 0.12, delay: 0.1, lp: 300 })
    } else if (id.includes('panic') || id.includes('rumor')) {
      this.tone({ type: 'sawtooth', f0: 400, f1: 800, dur: 0.4, vol: 0.09, lp: 2200, wet: 0.3 })
      this.tone({ type: 'sawtooth', f0: 566, f1: 1130, dur: 0.4, vol: 0.07, lp: 2200 })
      this.noise({ dur: 0.45, vol: 0.06, f0: 1200, f1: 3000, q: 1.5 })
    } else if (id.includes('jam') || id.includes('shutter')) {
      this.tone({ type: 'square', f0: 180, dur: 0.05, vol: 0.14, lp: 1200 })
      this.tone({ type: 'square', f0: 233, dur: 0.05, vol: 0.12, delay: 0.09, lp: 1200 })
      this.noise({ dur: 0.18, vol: 0.18, f0: 300, f1: 120, filter: 'lowpass', delay: 0.16 })
      this.tone({ type: 'sine', f0: 70, f1: 35, dur: 0.35, vol: 0.22, delay: 0.16 })
    } else if (id.includes('alarm') || id.includes('hydrant')) {
      for (let i = 0; i < 3; i++) this.tone({ type: 'square', f0: 1760 - i * 280, dur: 0.07, vol: 0.07, delay: i * 0.1, lp: 3000 })
      this.noise({ dur: 0.12, vol: 0.12, f0: 5000, filter: 'highpass', delay: 0.32 })
    } else if (id.includes('escape')) {
      this.noise({ dur: 0.7, vol: 0.12, f0: 300, f1: 5000, q: 0.7, attack: 0.2 })
      this.tone({ type: 'triangle', f0: 220, f1: 880, dur: 0.7, vol: 0.1, attack: 0.15, wet: 0.2 })
    } else {
      this.tone({ type: 'triangle', f0: 392, f1: 262, dur: 0.22, vol: 0.13, wet: 0.2 })
      this.tone({ type: 'triangle', f0: 349, f1: 233, dur: 0.26, vol: 0.1, delay: 0.1 })
      this.noise({ dur: 0.2, vol: 0.05, f0: 3800, filter: 'bandpass', q: 2.5, delay: 0.04 })
    }
    this.duck(0.5, 0.2, 0.4)
  }

  /** Unmistakable "something just got sabotaged" alert (heard by the victim). */
  public playSabotageAlert() {
    this.tone({ type: 'sine', f0: 90, f1: 38, dur: 0.55, vol: 0.3, prio: 2 })
    this.tone({ type: 'square', f0: 466, f1: 233, dur: 0.38, vol: 0.09, lp: 2600, prio: 2, wet: 0.25 })
    this.tone({ type: 'square', f0: 440, f1: 220, dur: 0.38, vol: 0.09, lp: 2600, prio: 2 })
    this.noise({ dur: 0.16, vol: 0.16, f0: 7000, filter: 'highpass', prio: 2 })
    this.tone({ type: 'square', f0: 880, dur: 0.07, vol: 0.07, delay: 0.42, lp: 3000, prio: 2 })
    this.tone({ type: 'square', f0: 880, dur: 0.07, vol: 0.07, delay: 0.55, lp: 3000, prio: 2 })
    this.duck(0.3, 0.5, 0.7)
  }

  public playLightsOut() {
    this.tone({ type: 'sawtooth', f0: 220, f1: 40, dur: 0.6, vol: 0.12, lp: 900, wet: 0.3 })
    this.noise({ dur: 0.25, vol: 0.14, f0: 4000, f1: 300, filter: 'highpass' })
  }

  // ───────────────────────── scoring ─────────────────────────
  public playPoints(amount = 10) {
    const hi = Math.min(1, amount / 60)
    const f = 880 + hi * 440
    this.tone({ type: 'square', f0: f, dur: 0.06, vol: 0.05, lp: 4000 })
    this.tone({ type: 'square', f0: f * 1.5, dur: 0.12, vol: 0.05, delay: 0.06, lp: 4000 })
  }

  public playTaskComplete(big = false) {
    const root = big ? 523.25 : 440
    const scale = [0, 4, 7, 12, big ? 16 : 14]
    scale.forEach((s, i) => {
      const f = root * Math.pow(2, s / 12)
      this.tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.12, delay: i * 0.055, wet: 0.3 })
      this.tone({ type: 'sine', f0: f * 2, dur: 0.18, vol: 0.04, delay: i * 0.055 })
    })
    this.noise({ dur: 0.25, vol: 0.05, f0: 7000, filter: 'highpass', delay: 0.18, wet: 0.2 })
    this.duck(0.55, 0.2, 0.4)
  }

  /** Combo stinger — pitch climbs a pentatonic ladder with the streak. */
  public playCombo(level: number) {
    const ladder = [0, 2, 4, 7, 9, 12, 14, 16, 19]
    const s = ladder[Math.min(ladder.length - 1, Math.max(0, level - 1))]
    const f = 523.25 * Math.pow(2, s / 12)
    this.tone({ type: 'square', f0: f, dur: 0.1, vol: 0.06, lp: 3500 })
    this.tone({ type: 'square', f0: f * 1.5, dur: 0.16, vol: 0.06, delay: 0.07, lp: 3500 })
    this.tone({ type: 'sine', f0: f * 3, dur: 0.2, vol: 0.03, delay: 0.1, wet: 0.3 })
  }

  // ───────────────────────── round flow ─────────────────────────
  public playLevelIntro() {
    this.tone({ type: 'sine', f0: 55, dur: 1.2, vol: 0.2, attack: 0.3, wet: 0.4 })
    this.noise({ dur: 1.0, vol: 0.06, f0: 300, f1: 3000, q: 0.8, attack: 0.6, wet: 0.3 })
    this.tone({ type: 'triangle', f0: 220, f1: 330, dur: 0.9, vol: 0.08, attack: 0.4, wet: 0.5 })
  }

  public playCountdown(n: number) {
    const f = n <= 3 ? 880 : 660
    this.tone({ type: 'square', f0: f, dur: 0.1, vol: 0.09, lp: 3200 })
    this.tone({ type: 'sine', f0: f / 2, dur: 0.12, vol: 0.08 })
  }

  public playRoundStart() {
    this.noise({ dur: 0.6, vol: 0.12, f0: 400, f1: 6000, q: 0.7, attack: 0.5, prio: 2 })
    this.tone({ type: 'sawtooth', f0: 110, f1: 220, dur: 0.6, vol: 0.09, attack: 0.5, lp: 1400, prio: 2 })
    this.tone({ type: 'sine', f0: 65, f1: 30, dur: 0.7, vol: 0.32, delay: 0.6, prio: 2 })
    ;[392, 523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.09, delay: 0.6 + i * 0.03, wet: 0.35, prio: 2 })
    )
    this.noise({ dur: 0.3, vol: 0.12, f0: 5000, filter: 'highpass', delay: 0.6, prio: 2 })
  }

  public playTimeUp() {
    this.tone({ type: 'sawtooth', f0: 110, dur: 1.0, vol: 0.15, lp: 700, attack: 0.04, prio: 2, wet: 0.3 })
    this.tone({ type: 'sawtooth', f0: 110.8, dur: 1.0, vol: 0.15, lp: 700, attack: 0.04, prio: 2 })
    this.tone({ type: 'sawtooth', f0: 165, dur: 1.0, vol: 0.09, lp: 700, attack: 0.04, prio: 2 })
    this.noise({ dur: 0.3, vol: 0.1, f0: 3000, filter: 'highpass', prio: 2 })
    this.duck(0.2, 1.0, 0.8)
  }

  /** Clock tick for the final seconds; `urgency` 0..1 sharpens it. */
  public playTick(urgency = 0.5) {
    const u = clamp01(urgency)
    this.tone({ type: 'square', f0: 1500 + u * 700, dur: 0.025, vol: 0.05 + u * 0.05, lp: 4500 })
    this.tone({ type: 'sine', f0: 90 + u * 40, f1: 50, dur: 0.09, vol: 0.12 + u * 0.1 })
  }

  public playRoundEnd(result: 'win' | 'lose' | 'draw') {
    if (result === 'win') {
      ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.12, delay: i * 0.08, wet: 0.4 })
      )
      this.tone({ type: 'sine', f0: 65, dur: 0.8, vol: 0.18, wet: 0.2 })
    } else if (result === 'lose') {
      ;[392, 349.23, 311.13, 261.63].forEach((f, i) =>
        this.tone({ type: 'sawtooth', f0: f, dur: 0.5, vol: 0.08, delay: i * 0.14, lp: 1200, wet: 0.4 })
      )
    } else {
      ;[440, 440 * 1.25].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.1, delay: i * 0.12, wet: 0.4 })
      )
    }
    this.duck(0.3, 0.8, 0.8)
  }

  // ───────────────────────── roles ─────────────────────────
  public playRoleReveal(role: 'runner' | 'saboteur') {
    if (role === 'runner') {
      this.tone({ type: 'sine', f0: 98, f1: 98, dur: 1.2, vol: 0.2, attack: 0.1, wet: 0.4, prio: 2 })
      ;[392, 587.33, 783.99].forEach((f, i) => {
        this.tone({ type: 'sawtooth', f0: f, dur: 0.7, vol: 0.06, delay: 0.15 + i * 0.12, attack: 0.05, lp: 2600, wet: 0.45, prio: 2 })
        this.tone({ type: 'triangle', f0: f * 2, dur: 0.5, vol: 0.04, delay: 0.15 + i * 0.12, wet: 0.45, prio: 2 })
      })
      this.noise({ dur: 0.4, vol: 0.08, f0: 6000, filter: 'highpass', delay: 0.4, prio: 2 })
    } else {
      this.tone({ type: 'sine', f0: 55, f1: 41, dur: 1.5, vol: 0.28, attack: 0.05, wet: 0.5, prio: 2 })
      this.tone({ type: 'sawtooth', f0: 220, f1: 207.65, dur: 1.1, vol: 0.07, lp: 700, delay: 0.05, wet: 0.5, prio: 2 })
      this.tone({ type: 'sawtooth', f0: 311.13, f1: 293.66, dur: 1.1, vol: 0.06, lp: 700, delay: 0.05, wet: 0.5, prio: 2 })
      this.noise({ dur: 0.9, vol: 0.05, f0: 3800, f1: 2000, q: 3, attack: 0.3, prio: 2 })
      for (let i = 0; i < 4; i++) this.noise({ dur: 0.03, vol: 0.09, f0: 1800 + i * 600, filter: 'bandpass', q: 4, delay: 0.5 + i * 0.07, prio: 2 })
    }
    this.duck(0.25, 1.0, 0.8)
  }

  public playRoleSwitch() {
    // reverse-swoosh in → two card-flip clacks → swap chime
    this.noise({ dur: 0.55, vol: 0.12, f0: 300, f1: 6500, q: 0.6, attack: 0.45, prio: 2 })
    this.tone({ type: 'sine', f0: 140, f1: 560, dur: 0.55, vol: 0.12, attack: 0.4, prio: 2 })
    this.noise({ dur: 0.05, vol: 0.18, f0: 1800, q: 2, delay: 0.55, prio: 2 })
    this.noise({ dur: 0.05, vol: 0.16, f0: 1500, q: 2, delay: 0.75, prio: 2 })
    this.tone({ type: 'sine', f0: 70, f1: 35, dur: 0.4, vol: 0.25, delay: 0.55, prio: 2 })
    ;[659.25, 880, 1318.5].forEach((f, i) =>
      this.tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.09, delay: 0.85 + i * 0.07, wet: 0.4, prio: 2 })
    )
    this.duck(0.3, 1.0, 0.6)
  }

  // ───────────────────────── verdict / finale ─────────────────────────
  public playDrumroll(seconds = 1.6) {
    const hits = Math.floor(seconds / 0.06)
    for (let i = 0; i < hits; i++) {
      const p = i / hits
      this.noise({
        dur: 0.06,
        vol: 0.05 + p * 0.12,
        f0: 220 + p * 200,
        filter: 'bandpass',
        q: 1.1,
        delay: i * 0.06 * (1 - p * 0.35),
        prio: 2
      })
    }
    this.noise({ dur: seconds, vol: 0.08, f0: 500, f1: 7000, q: 0.5, attack: seconds * 0.85, prio: 2 })
    this.duck(0.25, seconds, 0.4)
  }

  public playGavel() {
    this.noise({ dur: 0.08, vol: 0.3, f0: 1100, q: 1.8, prio: 2 })
    this.tone({ type: 'sine', f0: 190, f1: 60, dur: 0.18, vol: 0.35, prio: 2 })
    this.tone({ type: 'sine', f0: 55, f1: 28, dur: 0.7, vol: 0.3, delay: 0.02, wet: 0.5, prio: 2 })
    this.noise({ dur: 0.5, vol: 0.1, f0: 600, f1: 150, filter: 'lowpass', delay: 0.04, wet: 0.5, prio: 2 })
  }

  public playVerdictReveal(correct: boolean) {
    this.playGavel()
    if (correct) {
      ;[392, 493.88, 587.33, 783.99].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.9, vol: 0.1, delay: 0.2 + i * 0.05, attack: 0.02, wet: 0.5, prio: 2 })
      )
      ;[1568, 1976, 2349].forEach((f, i) =>
        this.tone({ type: 'sine', f0: f, dur: 0.4, vol: 0.04, delay: 0.5 + i * 0.09, wet: 0.5, prio: 2 })
      )
    } else {
      ;[261.63, 311.13, 392].forEach((f, i) =>
        this.tone({ type: 'sawtooth', f0: f, dur: 0.9, vol: 0.07, delay: 0.2 + i * 0.04, lp: 1100, wet: 0.5, prio: 2 })
      )
      this.tone({ type: 'sine', f0: 49, f1: 33, dur: 0.9, vol: 0.2, delay: 0.25, prio: 2 })
    }
    this.duck(0.2, 1.2, 0.8)
  }

  public playFinal(result: 'win' | 'lose' | 'draw') {
    this.playGavel()
    if (result === 'win') {
      const mel = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]
      const dly = [0, 0.14, 0.28, 0.42, 0.7, 0.84, 1.0]
      mel.forEach((f, i) => {
        this.tone({ type: 'sawtooth', f0: f, dur: 0.45, vol: 0.07, delay: 0.25 + dly[i], lp: 3200, wet: 0.5, prio: 2 })
        this.tone({ type: 'triangle', f0: f / 2, dur: 0.45, vol: 0.09, delay: 0.25 + dly[i], wet: 0.4, prio: 2 })
      })
      this.noise({ dur: 0.6, vol: 0.1, f0: 7000, filter: 'highpass', delay: 1.25, wet: 0.4, prio: 2 })
    } else if (result === 'lose') {
      ;[392, 349.23, 329.63, 261.63].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.7, vol: 0.1, delay: 0.3 + i * 0.28, wet: 0.5, prio: 2 })
      )
    } else {
      ;[440, 554.37, 659.25].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.9, vol: 0.09, delay: 0.3 + i * 0.12, wet: 0.5, prio: 2 })
      )
    }
    this.duck(0.2, 2.0, 1.0)
  }

  // ───────────────────────── tension music layer ─────────────────────────
  public startMusic(mode: MusicMode = 'round') {
    if (this.muted) return
    const ctx = this.ready()
    if (!ctx || !this.musicBus) return
    const m = this.mus
    if (m.running && m.mode === mode) return
    this.stopMusic(0.15)
    m.mode = mode
    m.running = true
    m.paused = false
    m.step = 0
    m.intensity = mode === 'accuse' ? 0.4 : 0.1
    m.target = m.intensity
    m.nextTime = ctx.currentTime + 0.08

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    filter.Q.value = 2
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.2)
    const mk = (type: OscillatorType, f: number, det: number) => {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      o.detune.value = det
      o.connect(filter)
      o.start()
      return o
    }
    m.oscs = [mk('sawtooth', 55, -8), mk('sawtooth', 55, 9), mk('sine', 27.5, 0)]
    filter.connect(gain)
    gain.connect(this.musicBus)
    m.padFilter = filter
    m.padGain = gain
    window.clearInterval(m.timer)
    m.timer = window.setInterval(() => this.musicTick(), 30)
  }

  public stopMusic(fade = 0.8) {
    const m = this.mus
    if (!m.running) return
    m.running = false
    window.clearInterval(m.timer)
    const ctx = this.ctx
    const oscs = m.oscs
    const gain = m.padGain
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.02, fade / 4))
      window.setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop()
            o.disconnect()
          } catch {
            /* noop */
          }
        })
        try {
          gain.disconnect()
        } catch {
          /* noop */
        }
      }, fade * 1000 + 120)
    }
    m.oscs = []
    m.padGain = null
    m.padFilter = null
  }

  /** 0 = calm, 1 = panic. Smoothed internally. */
  public setMusicIntensity(v: number) {
    this.mus.target = clamp01(v)
  }

  public setMusicPaused(p: boolean) {
    const m = this.mus
    m.paused = p
    if (this.ctx && m.padFilter) m.padFilter.frequency.setTargetAtTime(p ? 90 : 220, this.ctx.currentTime, 0.15)
  }

  public isMusicRunning(): boolean {
    return this.mus.running
  }

  private musicTick() {
    const ctx = this.ctx
    const m = this.mus
    if (!ctx || !m.running) return
    let guard = 0
    while (m.nextTime < ctx.currentTime + 0.15 && guard++ < 8) {
      m.intensity += (m.target - m.intensity) * 0.06
      const u = m.intensity
      const bpm = m.mode === 'accuse' ? 72 : 84 + u * 56
      this.musicStep(m.step, m.nextTime, u)
      m.nextTime += 60 / bpm / 4
      m.step++
    }
  }

  private musicStep(s: number, t: number, u: number) {
    const ctx = this.ctx
    const m = this.mus
    if (!ctx || !this.musicBus) return
    const roots = [33, 29, 26, 28] // A1 F1 D1 E1
    const root = roots[Math.floor(s / 16) % 4]
    const hi = this.quality === 'high'
    const accuse = m.mode === 'accuse'

    // chord change + pad filter / level follow intensity
    if (s % 16 === 0 && m.oscs.length === 3) {
      const f = mtof(root + 12)
      m.oscs[0].frequency.setTargetAtTime(f, t, 0.25)
      m.oscs[1].frequency.setTargetAtTime(f, t, 0.25)
      m.oscs[2].frequency.setTargetAtTime(f / 2, t, 0.25)
    }
    if (m.padFilter && !m.paused) m.padFilter.frequency.setTargetAtTime(170 + u * u * 1500, t, 0.3)
    if (m.padGain) m.padGain.gain.setTargetAtTime(0.045 + u * 0.05, t, 0.4)
    if (m.paused) return

    const play = (o: VoiceOpts) => this.musicVoice(o, t)
    const noiseHit = (o: NoiseOpts) => this.musicNoise(o, t)

    if (accuse) {
      // slow clock: tick … tock
      if (s % 4 === 0) {
        const tock = (s / 4) % 2 === 1
        play({ type: 'square', f0: tock ? 1100 : 1500, dur: 0.03, vol: 0.05, lp: 3500 })
        play({ type: 'sine', f0: tock ? 70 : 90, f1: 45, dur: 0.1, vol: 0.12 })
      }
      if (s % 32 === 16) play({ type: 'sawtooth', f0: mtof(root + 24), f1: mtof(root + 23), dur: 1.4, vol: 0.025, lp: 800, attack: 0.5 })
      return
    }

    // heartbeat: every beat once urgent, otherwise half-time
    const beat = s % 4 === 0
    if (s % 8 === 0 || (u > 0.55 && beat)) {
      play({ type: 'sine', f0: 120, f1: 42, dur: 0.2, vol: 0.14 + u * 0.14 })
      if (u > 0.3) play({ type: 'sine', f0: 105, f1: 40, dur: 0.16, vol: 0.07 + u * 0.08, delay: 0.14 })
    }
    // hats
    if (hi && u > 0.3 && (s % 2 === 0 || u > 0.7)) {
      noiseHit({ dur: 0.03, vol: 0.02 + u * 0.05, f0: 7500, filter: 'highpass', delay: 0 })
    }
    // arp
    if (hi && u > 0.2 && (s % 4 === 2 || (u > 0.6 && s % 2 === 0))) {
      const pat = [0, 3, 7, 10, 12, 7, 3, 0]
      play({
        type: 'square',
        f0: mtof(root + 24 + pat[(s >> 1) % 8]),
        dur: 0.09,
        vol: 0.025 + u * 0.03,
        lp: 800 + u * 2400
      })
    }
    // dissonant stab on bar line
    if (hi && u > 0.75 && s % 16 === 0) {
      ;[0, 1, 6].forEach((i) =>
        play({ type: 'sawtooth', f0: mtof(root + 36 + i), dur: 0.35, vol: 0.03, lp: 1500 })
      )
    }
    // riser into each bar when critical
    if (u > 0.9 && s % 16 === 0) {
      noiseHit({ dur: 0.9, vol: 0.035, f0: 500, f1: 4500, q: 0.8, attack: 0.8 })
    }
  }

  // music voices are scheduled at an absolute time t (not "now + delay")
  private musicVoice(o: VoiceOpts, t: number) {
    const ctx = this.ctx
    if (!ctx || !this.musicBus) return
    const start = t + (o.delay ?? 0)
    const osc = ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(o.f0, start)
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), start + o.dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(o.vol ?? 0.1, start + (o.attack ?? 0.004))
    g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur)
    let head: AudioNode = osc
    if (o.lp) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = o.lp
      head.connect(f)
      head = f
    }
    head.connect(g)
    g.connect(this.musicBus)
    osc.onended = () => {
      try {
        g.disconnect()
      } catch {
        /* noop */
      }
    }
    osc.start(start)
    osc.stop(start + o.dur + 0.03)
  }

  private musicNoise(o: NoiseOpts, t: number) {
    const ctx = this.ctx
    if (!ctx || !this.musicBus || !this.noiseBuf) return
    const start = t + (o.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = o.filter ?? 'bandpass'
    f.frequency.setValueAtTime(o.f0 ?? 1200, start)
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, start + o.dur)
    f.Q.value = o.q ?? 1
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(o.vol ?? 0.05, start + (o.attack ?? 0.003))
    g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.musicBus)
    src.onended = () => {
      try {
        g.disconnect()
      } catch {
        /* noop */
      }
    }
    src.start(start, Math.random() * 0.5)
    src.stop(start + o.dur + 0.03)
  }
}

export const sound = new SoundEngine()
