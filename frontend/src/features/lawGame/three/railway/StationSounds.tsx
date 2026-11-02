import { useEffect, useRef } from 'react'
import type { Speech } from '../../ui/useSpeech.ts'
import { footstep, makeNoise } from '../audio.ts'
import { ANNOUNCEMENTS } from './crowdData.ts'
import type { RailwayQueries } from './RailwayQueries.ts'

const MURMUR_GAIN = 0.035
const FIRST_ANNOUNCEMENT_MS = 16000
const ANNOUNCEMENT_EVERY_MS = 42000

function chime(audio: AudioContext, output: AudioNode) {
  // The two-note call that comes before every station announcement.
  ;[659, 523].forEach((frequency, i) => {
    const at = audio.currentTime + i * 0.42
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.09, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 1)
    gain.connect(output)
    const osc = audio.createOscillator()
    osc.frequency.value = frequency
    osc.connect(gain)
    osc.start(at)
    osc.stop(at + 1.05)
  })
}

/** Crowd murmur, footsteps and announcements. M mutes it; the subtitles stay either way. */
export function StationSounds({ q, onSpeech }: { q: RailwayQueries; onSpeech?: (speech: Speech) => void }) {
  const speech = useRef(onSpeech)
  useEffect(() => {
    speech.current = onSpeech
  })

  useEffect(() => {
    let audio: AudioContext | null = null
    let master: GainNode | null = null
    let noise: AudioBuffer | null = null
    let muted = false

    // Browsers only allow sound after a click: the one that captures the mouse is it.
    const start = () => {
      if (audio) {
        void audio.resume()
        return
      }
      audio = new AudioContext()
      master = audio.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(audio.destination)
      noise = makeNoise(audio, 4)
      const murmur = audio.createBufferSource()
      murmur.buffer = noise
      murmur.loop = true
      const band = audio.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 520
      band.Q.value = 0.6
      const gain = audio.createGain()
      gain.gain.value = MURMUR_GAIN
      murmur.connect(band).connect(gain).connect(master)
      murmur.start()
    }
    document.addEventListener('pointerlockchange', start)

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat) return
      muted = !muted
      if (master) master.gain.value = muted ? 0 : 1
    }
    window.addEventListener('keydown', onKey)

    q.setStepListener(() => {
      if (audio && master && noise) footstep(audio, master, noise)
    })

    let next = 0
    const announce = () => {
      if (audio && master) chime(audio, master)
      speech.current?.({ name: 'Station announcement', text: ANNOUNCEMENTS[next % ANNOUNCEMENTS.length], announcement: true })
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
      window.clearTimeout(first)
      window.clearInterval(interval)
      void audio?.close()
    }
  }, [q])

  return null
}
