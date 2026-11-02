import { useEffect, useRef } from 'react'
import type { Speech } from '../../ui/useSpeech.ts'
import { footstep, makeNoise } from '../audio.ts'
import { BANK_ANNOUNCEMENTS } from './bankCrowdData.ts'
import type { BankQueries } from './BankQueries.ts'

const MURMUR_GAIN = 0.05
const ROOM_GAIN = 0.35
const REVERB_SECONDS = 2.2
const DOOR_HEARD_WITHIN = 14
const FIRST_ANNOUNCEMENT_MS = 16000
const ANNOUNCEMENT_EVERY_MS = 48000
const COUNTER_EVERY_MS = 6500
const TYPING_EVERY_MS = 2300

/** The sounds other parts of the hall ask for. */
export interface BankChime {
  ding: () => void
  print: () => void
  door: (distance: number) => void
}

/** The tail a big stone room gives every sound: decaying noise, used as an echo. */
function hallEcho(audio: AudioContext) {
  const length = audio.sampleRate * REVERB_SECONDS
  const buffer = audio.createBuffer(2, length, audio.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2)
  }
  const convolver = audio.createConvolver()
  convolver.buffer = buffer
  return convolver
}

function tone(audio: AudioContext, output: AudioNode, frequency: number, at: number, seconds: number, level: number) {
  const osc = audio.createOscillator()
  osc.frequency.value = frequency
  const gain = audio.createGain()
  gain.gain.setValueAtTime(level, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
  osc.connect(gain).connect(output)
  osc.start(at)
  osc.stop(at + seconds + 0.02)
}

/** A short rush of filtered noise: paper, a door, a key. */
function rush(audio: AudioContext, output: AudioNode, noise: AudioBuffer, frequency: number, at: number, seconds: number, level: number) {
  const source = audio.createBufferSource()
  source.buffer = noise
  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 0.8
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + seconds * 0.2)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
  source.connect(filter).connect(gain).connect(output)
  source.start(at, Math.random() * 3)
  source.stop(at + seconds + 0.02)
}

/** A note counter riffling a bundle: a fast run of paper flicks, far off across the hall. */
function noteCounter(audio: AudioContext, output: AudioNode, noise: AudioBuffer) {
  const start = audio.currentTime
  for (let i = 0; i < 26; i++) rush(audio, output, noise, 3200 + Math.random() * 900, start + i * 0.034, 0.03, 0.05)
}

function typing(audio: AudioContext, output: AudioNode, noise: AudioBuffer) {
  const start = audio.currentTime
  const keys = 3 + Math.floor(Math.random() * 6)
  for (let i = 0; i < keys; i++) rush(audio, output, noise, 2400 + Math.random() * 1200, start + i * (0.09 + Math.random() * 0.1), 0.03, 0.035)
}

/** A crowd in a marble hall, tills and keyboards, the token chime and the PA. M mutes it; subtitles stay either way. */
export function BankSounds({ q, onSpeech, chimeRef }: { q: BankQueries; onSpeech?: (speech: Speech) => void; chimeRef: React.RefObject<BankChime | null> }) {
  const speech = useRef(onSpeech)
  useEffect(() => {
    speech.current = onSpeech
  })

  useEffect(() => {
    let audio: AudioContext | null = null
    let master: GainNode | null = null
    let room: AudioNode | null = null
    let noise: AudioBuffer | null = null
    let muted = false
    const timers: number[] = []

    // Browsers only allow sound after a click: the one that captures the mouse is it.
    const start = () => {
      if (audio) {
        void audio.resume()
        return
      }
      const a = new AudioContext()
      audio = a
      master = a.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(a.destination)
      noise = makeNoise(a, 4)

      const echo = hallEcho(a)
      const echoGain = a.createGain()
      echoGain.gain.value = ROOM_GAIN
      echo.connect(echoGain).connect(master)
      // Everything in the room goes out dry and through the echo.
      const bus = a.createGain()
      bus.connect(master)
      bus.connect(echo)
      room = bus

      const crowd = a.createBufferSource()
      crowd.buffer = noise
      crowd.loop = true
      const band = a.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 520
      band.Q.value = 0.6
      const murmur = a.createGain()
      murmur.gain.value = MURMUR_GAIN
      // Crowds swell and settle.
      const swell = a.createOscillator()
      swell.frequency.value = 0.07
      const depth = a.createGain()
      depth.gain.value = MURMUR_GAIN * 0.35
      swell.connect(depth).connect(murmur.gain)
      crowd.connect(band).connect(murmur).connect(bus)
      crowd.start()
      swell.start()

      timers.push(window.setInterval(() => noteCounter(a, bus, noise!), COUNTER_EVERY_MS))
      timers.push(window.setInterval(() => typing(a, bus, noise!), TYPING_EVERY_MS))
    }
    document.addEventListener('pointerlockchange', start)

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat) return
      muted = !muted
      if (master) master.gain.value = muted ? 0 : 1
    }
    window.addEventListener('keydown', onKey)

    chimeRef.current = {
      ding: () => {
        if (!audio || !room) return
        const at = audio.currentTime
        tone(audio, room, 880, at, 0.5, 0.05)
        tone(audio, room, 659, at + 0.22, 0.75, 0.05)
      },
      print: () => {
        if (!audio || !room || !noise) return
        const at = audio.currentTime
        for (let i = 0; i < 6; i++) rush(audio, room, noise, 1700, at + i * 0.07, 0.06, 0.08)
      },
      door: (distance) => {
        if (!audio || !room || !noise || distance > DOOR_HEARD_WITHIN) return
        rush(audio, room, noise, 620, audio.currentTime, 0.55, 0.12 * (1 - distance / DOOR_HEARD_WITHIN))
      },
    }

    q.setStepListener(() => {
      // Hard soles on marble: brighter than sand, with the room behind it.
      if (audio && room && noise) footstep(audio, room, noise, 2200, 0.08)
    })
    // The law note on the screen says why the rope is there: this only draws the eye to it.
    q.setWarnListener(() => chimeRef.current?.ding())

    let next = 0
    const announce = () => {
      chimeRef.current?.ding()
      speech.current?.({ name: 'Branch announcement', text: BANK_ANNOUNCEMENTS[next % BANK_ANNOUNCEMENTS.length], announcement: true })
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
      q.setWarnListener(null)
      chimeRef.current = null
      window.clearTimeout(first)
      window.clearInterval(interval)
      timers.forEach((id) => window.clearInterval(id))
      void audio?.close()
    }
  }, [q, chimeRef])

  return null
}
