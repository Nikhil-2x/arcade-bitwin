import { useCallback, useEffect, useRef, useState } from 'react'

const SHOW_MS = 6000
const QUIET_MS = 14000

/** Shows a note when the player leans on a boundary, without nagging them while they stay there. */
export function useEdgeNote() {
  const [show, setShow] = useState(false)
  const last = useRef(-Infinity)
  const trigger = useCallback(() => {
    const now = performance.now()
    if (now - last.current < QUIET_MS) return
    last.current = now
    setShow(true)
  }, [])
  useEffect(() => {
    if (!show) return
    const id = window.setTimeout(() => setShow(false), SHOW_MS)
    return () => window.clearTimeout(id)
  }, [show])
  return { show, trigger }
}
