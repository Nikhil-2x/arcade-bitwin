// Web Audio API Procedural Sound Engine
// Completely self-contained, no external assets needed!

class SoundEngine {
  private ctx: AudioContext | null = null
  private muted: boolean = false

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public setMuted(m: boolean) {
    this.muted = m
  }

  public isMuted(): boolean {
    return this.muted
  }

  public playClick() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(440, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.06)
  }

  public playPaperFold() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    // White noise burst filtered
    const bufferSize = this.ctx.sampleRate * 0.12
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime)
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)
    noise.start()
  }

  public playWhoosh() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.18)
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.19)
  }

  public playWhisper() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, this.ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.25)
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.26)
  }

  public playSuccess() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const startTime = now + idx * 0.07
      gain.gain.setValueAtTime(0.18, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22)
      osc.connect(gain)
      gain.connect(this.ctx!.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.23)
    })
  }

  public playError() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, this.ctx.currentTime)
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.26)
  }

  public playSiren() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    const now = this.ctx.currentTime
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.linearRampToValueAtTime(900, now + 0.3)
    osc.frequency.linearRampToValueAtTime(600, now + 0.6)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.66)
  }

  public playRaiseVoice() {
    if (this.muted) return
    this.initCtx()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    const now = this.ctx.currentTime
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.2)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.36)
  }
}

export const sound = new SoundEngine()

