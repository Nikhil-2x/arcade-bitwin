import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Speech } from '../../ui/useSpeech.ts'
import { footstep, makeNoise } from '../audio.ts'
import { BEACH_ANNOUNCEMENTS } from './beachCrowdData.ts'
import { DANCE_FLOOR } from './beachLayout.ts'
import type { BeachQueries } from './BeachQueries.ts'

const WAVE_GAIN = 0.16
const MURMUR_GAIN = 0.03
const MUSIC_GAIN = 0.09
const MUSIC_RANGE = 34
const FIRST_ANNOUNCEMENT_MS = 18000
const ANNOUNCEMENT_EVERY_MS = 46000
const GULL_EVERY_MS = 9000

/** A gliding cry: two falling notes, the way gulls do it. */
function gull(audio: AudioContext, output: AudioNode) {
  const count = 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const at = audio.currentTime + i * 0.3
    const osc = audio.createOscillator()
    osc.type = 'triangle'
    const pitch = 1300 + Math.random() * 500
    osc.frequency.setValueAtTime(pitch, at)
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.62, at + 0.24)
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.018, at + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.26)
    osc.connect(gain).connect(output)
    osc.start(at)
    osc.stop(at + 0.28)
  }
}

function whistle(audio: AudioContext, output: AudioNode) {
  const at = audio.currentTime
  const osc = audio.createOscillator()
  osc.frequency.value = 2650
  const wobble = audio.createOscillator()
  wobble.frequency.value = 38
  const depth = audio.createGain()
  depth.gain.value = 70
  wobble.connect(depth).connect(osc.frequency)
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.035, at + 0.03)
  gain.gain.setValueAtTime(0.035, at + 0.5)
  gain.gain.linearRampToValueAtTime(0, at + 0.6)
  osc.connect(gain).connect(output)
  osc.start(at)
  wobble.start(at)
  osc.stop(at + 0.62)
  wobble.stop(at + 0.62)
}

/** A plucked marimba and a soft kick: a small loop, played from the speakers by the bar. */
const NOTES = [392, 440, 523, 587, 659, 587, 523, 440]
function musicBeat(audio: AudioContext, output: AudioNode, beat: number) {
  const at = audio.currentTime
  if (beat % 2 === 0) {
    const kick = audio.createOscillator()
    kick.frequency.setValueAtTime(120, at)
    kick.frequency.exponentialRampToValueAtTime(48, at + 0.12)
    const body = audio.createGain()
    body.gain.setValueAtTime(0.9, at)
    body.gain.exponentialRampToValueAtTime(0.001, at + 0.16)
    kick.connect(body).connect(output)
    kick.start(at)
    kick.stop(at + 0.18)
  }
  const pluck = audio.createOscillator()
  pluck.type = 'sine'
  pluck.frequency.value = NOTES[beat % NOTES.length] * (beat % 16 >= 8 ? 0.75 : 1)
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.45, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28)
  pluck.connect(gain).connect(output)
  pluck.start(at)
  pluck.stop(at + 0.3)
}

/** Waves, gulls, a crowd, the bar's music and the lifeguard's whistle. M mutes it; subtitles stay either way. */
export function BeachSounds({ q, onSpeech }: { q: BeachQueries; onSpeech?: (speech: Speech) => void }) {
  const { camera } = useThree()
  const speech = useRef(onSpeech)
  const musicGain = useRef<GainNode | null>(null)
  const context = useRef<AudioContext | null>(null)
  useEffect(() => {
    speech.current = onSpeech
  })

  // The music gets louder as the player nears the dance floor.
  useFrame(() => {
    const gain = musicGain.current
    const audio = context.current
    if (!gain || !audio) return
    const d = Math.hypot(camera.position.x - DANCE_FLOOR[0], camera.position.z - DANCE_FLOOR[1])
    const near = Math.max(0, 1 - d / MUSIC_RANGE)
    gain.gain.setTargetAtTime(MUSIC_GAIN * near * near, audio.currentTime, 0.2)
  })

  useEffect(() => {
    let audio: AudioContext | null = null
    let master: GainNode | null = null
    let noise: AudioBuffer | null = null
    let muted = false
    let beat = 0
    const timers: number[] = []

    // Browsers only allow sound after a click: the one that captures the mouse is it.
    const start = () => {
      if (audio) {
        void audio.resume()
        return
      }
      audio = new AudioContext()
      context.current = audio
      const a = audio
      master = a.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(a.destination)
      noise = makeNoise(a, 4)

      // The sea: filtered noise, swelling and falling like a slow breath.
      const sea = a.createBufferSource()
      sea.buffer = noise
      sea.loop = true
      const low = a.createBiquadFilter()
      low.type = 'lowpass'
      low.frequency.value = 900
      const swell = a.createGain()
      swell.gain.value = WAVE_GAIN
      const breath = a.createOscillator()
      breath.frequency.value = 0.13
      const depth = a.createGain()
      depth.gain.value = WAVE_GAIN * 0.6
      breath.connect(depth).connect(swell.gain)
      sea.connect(low).connect(swell).connect(master)
      sea.start()
      breath.start()

      const crowd = a.createBufferSource()
      crowd.buffer = noise
      crowd.loop = true
      const band = a.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 620
      band.Q.value = 0.7
      const murmur = a.createGain()
      murmur.gain.value = MURMUR_GAIN
      crowd.connect(band).connect(murmur).connect(master)
      crowd.start()

      const music = a.createGain()
      music.gain.value = 0
      music.connect(master)
      musicGain.current = music
      timers.push(
        window.setInterval(() => {
          musicBeat(a, music, beat)
          beat++
        }, 220),
      )
      timers.push(
        window.setInterval(() => {
          if (master && Math.random() < 0.8) gull(a, master)
        }, GULL_EVERY_MS),
      )
    }
    document.addEventListener('pointerlockchange', start)

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat) return
      muted = !muted
      if (master) master.gain.value = muted ? 0 : 1
    }
    window.addEventListener('keydown', onKey)

    q.setStepListener(() => {
      if (audio && master && noise) footstep(audio, master, noise, 900, 0.1)
    })
    q.setWhistleListener(() => {
      if (audio && master) whistle(audio, master)
      speech.current?.({ name: 'Lifeguard', text: 'Hey! Red flags! Back from the edge, please.', announcement: true })
    })

    let next = 0
    const announce = () => {
      if (audio && master) gull(audio, master)
      speech.current?.({ name: 'Lifeguard tower', text: BEACH_ANNOUNCEMENTS[next % BEACH_ANNOUNCEMENTS.length], announcement: true })
      next++
    }
    let interval = 0
    const first = window.setTimeout(() => {
      announce()
      interval = window.setInterval(announce, ANNOUNCEMENT_EVERY_MS)
    }, FIRST_ANNOUNCEMENT_MS)

    return () => {
      document.removeEventListener('pointerlockchange', start)
      window.removeEventListener('keydown', onKey)
      q.setStepListener(null)
      q.setWhistleListener(null)
      window.clearTimeout(first)
      window.clearInterval(interval)
      timers.forEach((id) => window.clearInterval(id))
      musicGain.current = null
      context.current = null
      void audio?.close()
    }
  }, [q])

  return null
}
