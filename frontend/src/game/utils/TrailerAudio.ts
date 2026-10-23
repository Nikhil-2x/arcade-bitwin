/**
 * Procedural Cinematic Audio & Music Synthesizer for Circle of Allies Trailer.
 * Self-contained Web Audio engine with zero external audio file dependencies.
 */
class TrailerAudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private rainSource: AudioBufferSourceNode | null = null
  private droneOsc: OscillatorNode | null = null
  private droneGain: GainNode | null = null

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
      if (!this.masterGain && this.ctx) {
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      }
      return this.ctx
    } catch {
      return null
    }
  }

  public start() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return

    // 1. Soft night rain & distant city atmosphere
    try {
      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        data[i] = (b0 + b1 + b2) * 0.08
      }

      this.rainSource = ctx.createBufferSource()
      this.rainSource.buffer = noiseBuffer
      this.rainSource.loop = true

      const rainFilter = ctx.createBiquadFilter()
      rainFilter.type = 'lowpass'
      rainFilter.frequency.setValueAtTime(450, ctx.currentTime)

      this.ambientGain = ctx.createGain()
      this.ambientGain.gain.setValueAtTime(0.001, ctx.currentTime)
      this.ambientGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2.5)

      this.rainSource.connect(rainFilter).connect(this.ambientGain).connect(this.masterGain)
      this.rainSource.start()

      // 2. Cinematic sub drone (55Hz / A1)
      this.droneGain = ctx.createGain()
      this.droneGain.gain.setValueAtTime(0.001, ctx.currentTime)
      this.droneGain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 3)

      this.droneOsc = ctx.createOscillator()
      this.droneOsc.type = 'sine'
      this.droneOsc.frequency.setValueAtTime(55, ctx.currentTime)

      this.droneOsc.connect(this.droneGain).connect(this.masterGain)
      this.droneOsc.start()
    } catch {
      // safe fallback
    }
  }

  /** Bus arrival: engine rumble with stereo pan + air-brake hiss */
  public playBusArrival() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Engine rumble
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(65, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 1.2)
    osc.frequency.exponentialRampToValueAtTime(55, now + 2.6)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(160, now)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 1.0)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8)

    if (panner) {
      panner.pan.setValueAtTime(-0.8, now)
      panner.pan.linearRampToValueAtTime(0.0, now + 1.8)
      osc.connect(filter).connect(gain).connect(panner).connect(this.masterGain)
    } else {
      osc.connect(filter).connect(gain).connect(this.masterGain)
    }

    osc.start(now)
    osc.stop(now + 2.8)

    // Air-brake hiss
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return
      const bNow = this.ctx.currentTime
      const bSize = this.ctx.sampleRate * 0.6
      const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate)
      const d = buffer.getChannelData(0)
      for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.28))
      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      const bFilt = this.ctx.createBiquadFilter()
      bFilt.type = 'bandpass'
      bFilt.frequency.setValueAtTime(1600, bNow)
      const bGain = this.ctx.createGain()
      bGain.gain.setValueAtTime(0.18, bNow)
      bGain.gain.exponentialRampToValueAtTime(0.001, bNow + 0.5)

      noise.connect(bFilt).connect(bGain).connect(this.masterGain)
      noise.start(bNow)
      noise.stop(bNow + 0.55)
    }, 1100)
  }

  /** Phone chime for Meera's text message */
  public playPhoneChime() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    const playTone = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + delay)
      gain.gain.setValueAtTime(0.001, now + delay)
      gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur)
      osc.connect(gain).connect(this.masterGain!)
      osc.start(now + delay)
      osc.stop(now + delay + dur)
    }

    playTone(1318.51, 0.0, 0.4) // E6
    playTone(1661.22, 0.1, 0.5) // G#6
  }

  /** Footsteps on wet pavement */
  public playFootsteps() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.45
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(90, t)
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08)
      gain.gain.setValueAtTime(0.06, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      osc.connect(gain).connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.09)
    }
  }

  /** Lamp flicker, spark, and pop out */
  public playLampPop() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Mains spark
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, now)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain).connect(this.masterGain)
    osc.start(now)
    osc.stop(now + 0.2)

    // Sharp pop
    const pop = ctx.createOscillator()
    const pGain = ctx.createGain()
    pop.type = 'sine'
    pop.frequency.setValueAtTime(320, now + 0.1)
    pop.frequency.exponentialRampToValueAtTime(40, now + 0.25)
    pGain.gain.setValueAtTime(0.2, now + 0.1)
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    pop.connect(pGain).connect(this.masterGain)
    pop.start(now + 0.1)
    pop.stop(now + 0.26)
  }

  /** Gate clang */
  public playGateClang() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc.connect(gain).connect(this.masterGain)
    osc.start(now)
    osc.stop(now + 0.42)
  }

  /** Tension heartbeat pulse */
  public playTensionPulse() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    const thud = (freq: number, delay: number, vol: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + delay)
      osc.frequency.exponentialRampToValueAtTime(38, now + delay + 0.14)
      gain.gain.setValueAtTime(vol, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2)
      osc.connect(gain).connect(this.masterGain!)
      osc.start(now + delay)
      osc.stop(now + delay + 0.22)
    }

    thud(68, 0, 0.25)
    thud(54, 0.18, 0.18)
  }

  /** Uplifting theme progression (D major / A major chords of hope) */
  public playUpliftingTheme() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Harmonic progression: D - F# - A - C# - D (rising warmth)
    const chord1 = [293.66, 369.99, 440.0, 554.37] // D maj7
    const chord2 = [329.63, 440.0, 493.88, 659.25] // E sus / A

    chord1.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, now + i * 0.08)
      gain.gain.setValueAtTime(0.001, now + i * 0.08)
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 2.4)
      osc.connect(gain).connect(this.masterGain!)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 2.5)
    })

    chord2.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, now + 1.2 + i * 0.08)
      gain.gain.setValueAtTime(0.001, now + 1.2 + i * 0.08)
      gain.gain.linearRampToValueAtTime(0.14, now + 1.2 + i * 0.08 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + i * 0.08 + 2.4)
      osc.connect(gain).connect(this.masterGain!)
      osc.start(now + 1.2 + i * 0.08)
      osc.stop(now + 1.2 + i * 0.08 + 2.5)
    })
  }

  /** Driving rhythmic synth pulse for the 3 Nights montage */
  public playMontageBeat(count = 6) {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(i % 2 === 0 ? 110 : 220, t)
      gain.gain.setValueAtTime(0.1, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      osc.connect(gain).connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.16)
    }
  }

  /** Climax swell and title impact */
  public playTitleImpact() {
    const ctx = this.getContext()
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Sub boom
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(80, now)
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.8)
    subGain.gain.setValueAtTime(0.35, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)
    sub.connect(subGain).connect(this.masterGain)
    sub.start(now)
    sub.stop(now + 1.5)

    // Resonant shimmering chord (A minor / C major resolve)
    const notes = [220, 261.63, 329.63, 440, 523.25, 659.25]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.04)
      gain.gain.setValueAtTime(0.001, now + idx * 0.04)
      gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.04 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 3.5)
      osc.connect(gain).connect(this.masterGain!)
      osc.start(now + idx * 0.04)
      osc.stop(now + idx * 0.04 + 3.6)
    })
  }

  public stop() {
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4)
      } catch {
        // ignore
      }
    }
    if (this.droneGain && this.ctx) {
      try {
        this.droneGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4)
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      try {
        this.rainSource?.stop()
        this.droneOsc?.stop()
        this.rainSource?.disconnect()
        this.droneOsc?.disconnect()
      } catch {
        // ignore
      }
      this.rainSource = null
      this.droneOsc = null
      this.ambientGain = null
      this.droneGain = null
    }, 500)
  }

  public dispose() {
    this.stop()
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        void this.ctx.close()
      } catch {
        // ignore
      }
    }
    this.ctx = null
    this.masterGain = null
  }
}

export const TrailerAudio = new TrailerAudioManager()
