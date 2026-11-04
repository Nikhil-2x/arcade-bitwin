import { useEffect, useRef, type PointerEvent } from 'react'
import { pressKey, releaseKey } from './virtualKeys.ts'

export interface TouchButtonDef {
  /** KeyboardEvent.code to hold while pressed, e.g. 'Space' or 'KeyE'. */
  code: string
  label: string
  /** Visually bigger: the main action. */
  primary?: boolean
}

/** Holds a key for as long as the finger stays down, so both taps and hold-to-act work. */
export function TouchButton({ code, label, primary }: TouchButtonDef) {
  const pointer = useRef<number | null>(null)
  const el = useRef<HTMLButtonElement>(null)

  const release = () => {
    if (pointer.current === null) return
    pointer.current = null
    el.current?.classList.remove('is-down')
    releaseKey(code)
  }
  useEffect(() => release, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== null) return
    e.preventDefault()
    pointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    el.current?.classList.add('is-down')
    pressKey(code)
  }
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId === pointer.current) release()
  }

  return (
    <button
      ref={el}
      type="button"
      className={`mc-btn${primary ? ' is-primary' : ''}`}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}
