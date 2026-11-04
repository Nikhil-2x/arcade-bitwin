import { useEffect, useRef, type PointerEvent } from 'react'
import { WASD, type JoystickKeys } from './joystickKeys.ts'
import { pressKey, releaseKey, virtualStick } from './virtualKeys.ts'

/** Below this the stick counts as centred. */
const DEAD_ZONE = 0.2
/** sin(22.5°): splits the circle into eight equal direction sectors. */
const AXIS = 0.38

/**
 * A virtual thumbstick. It holds the matching direction keys (8-way) and also publishes its
 * analog position in `virtualStick` for games that want smooth movement.
 */
export function Joystick({ keys = WASD, size = 132 }: { keys?: JoystickKeys; size?: number }) {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const down = useRef(new Set<string>())

  const setHeld = (next: Set<string>) => {
    for (const k of down.current) if (!next.has(k)) releaseKey(k)
    for (const k of next) if (!down.current.has(k)) pressKey(k)
    down.current = next
  }

  const update = (clientX: number, clientY: number) => {
    const el = base.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const radius = r.width / 2
    let x = (clientX - (r.left + radius)) / radius
    let y = (clientY - (r.top + radius)) / radius
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    if (knob.current) knob.current.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`
    const active = Math.min(len, 1) > DEAD_ZONE
    virtualStick.x = active ? x : 0
    virtualStick.y = active ? y : 0
    const next = new Set<string>()
    if (active) {
      const nx = x / Math.max(len, 1e-6)
      const ny = y / Math.max(len, 1e-6)
      if (ny < -AXIS) next.add(keys.up)
      if (ny > AXIS) next.add(keys.down)
      if (nx < -AXIS) next.add(keys.left)
      if (nx > AXIS) next.add(keys.right)
    }
    setHeld(next)
  }

  const reset = () => {
    pointer.current = null
    virtualStick.x = 0
    virtualStick.y = 0
    if (knob.current) knob.current.style.transform = ''
    setHeld(new Set())
  }

  // Never leave a key stuck down if the controls disappear mid-push.
  useEffect(() => reset, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== null) return
    e.preventDefault()
    pointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    base.current?.classList.add('is-active')
    update(e.clientX, e.clientY)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === pointer.current) update(e.clientX, e.clientY)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointer.current) return
    base.current?.classList.remove('is-active')
    reset()
  }

  return (
    <div
      ref={base}
      className="mc-stick"
      style={{ width: size, height: size }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      aria-hidden
    >
      <div ref={knob} className="mc-knob" />
    </div>
  )
}
