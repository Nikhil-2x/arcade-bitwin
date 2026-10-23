/** Tiny WebAudio synth so the game has feedback sounds without any asset files. */
let ctx: AudioContext | null = null
let muted = false

function audio(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0, slide = 0) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur)
}

export const Sfx = {
  toggleMute() {
    muted = !muted
    return muted
  },
  click: () => tone(520, 0.07, 'square', 0.04),
  good: () => {
    tone(660, 0.12, 'triangle', 0.09)
    tone(880, 0.18, 'triangle', 0.09, 0.1)
  },
  bad: () => tone(160, 0.3, 'sawtooth', 0.08, 0, -80),
  alert: () => {
    tone(880, 0.12, 'square', 0.05)
    tone(660, 0.12, 'square', 0.05, 0.14)
  },
  phone: () => {
    tone(1200, 0.08, 'sine', 0.06)
    tone(1200, 0.08, 'sine', 0.06, 0.15)
  },
  ability: () => tone(300, 0.2, 'sawtooth', 0.05, 0, -150),
  pop: () => tone(300, 0.12, 'sine', 0.08, 0, 400),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.06, i * 0.15)),
  heartbeat: () => {
    tone(60, 0.12, 'sine', 0.2)
    tone(55, 0.14, 'sine', 0.16, 0.18)
  },
}
