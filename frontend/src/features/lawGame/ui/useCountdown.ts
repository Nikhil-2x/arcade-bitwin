import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Counts down from `seconds` while `running`. `onEnd` fires once at zero.
 * Returns whole seconds left. Pass `usedRef` to read the exact seconds spent (for scoring) from outside.
 */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void, usedRef?: RefObject<number>) {
  const [left, setLeft] = useState(seconds)
  const startedAt = useRef<number | null>(null)
  const own = useRef(0)
  const used = usedRef ?? own
  const end = useRef(onEnd)
  const fired = useRef(false)
  useEffect(() => {
    end.current = onEnd
  })

  useEffect(() => {
    if (!running) return
    startedAt.current = performance.now() - used.current * 1000
    const id = window.setInterval(() => {
      used.current = (performance.now() - (startedAt.current ?? 0)) / 1000
      const remaining = Math.max(0, seconds - used.current)
      setLeft(Math.ceil(remaining))
      if (remaining <= 0 && !fired.current) {
        fired.current = true
        end.current()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, seconds, used])

  return { left }
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
