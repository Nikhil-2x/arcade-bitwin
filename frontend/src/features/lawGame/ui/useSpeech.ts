import { useCallback, useEffect, useState } from 'react'
import type { LawRef, Suspect } from '../types.ts'

export interface Speech {
  name: string
  text: string
  /** Draws their face beside the words. */
  suspect?: Suspect
  law?: LawRef
  /** A station announcement: it gives way to anyone actually talking to the player. */
  announcement?: boolean
}

const READ_MS_PER_CHAR = 55
const MIN_MS = 4500

export function useSpeech() {
  const [current, setCurrent] = useState<Speech | null>(null)
  const say = useCallback((speech: Speech) => {
    setCurrent((now) => (speech.announcement && now && !now.announcement ? now : speech))
  }, [])
  useEffect(() => {
    if (!current) return
    const id = window.setTimeout(() => setCurrent(null), Math.max(MIN_MS, current.text.length * READ_MS_PER_CHAR))
    return () => window.clearTimeout(id)
  }, [current])
  return { current, say }
}
