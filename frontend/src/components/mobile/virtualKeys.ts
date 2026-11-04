/**
 * On-screen controls speak the same language as a keyboard: they dispatch real `keydown` / `keyup`
 * events on `window`, so every game (Phaser's keyboard plugin, R3F listeners, plain DOM handlers)
 * works with them without knowing touch exists.
 */

const KEYS: Record<string, { key: string; keyCode: number }> = {
  Space: { key: ' ', keyCode: 32 },
  Enter: { key: 'Enter', keyCode: 13 },
  Escape: { key: 'Escape', keyCode: 27 },
  ShiftLeft: { key: 'Shift', keyCode: 16 },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
}

function describe(code: string) {
  if (KEYS[code]) return KEYS[code]
  const letter = /^Key([A-Z])$/.exec(code)?.[1]
  if (letter) return { key: letter.toLowerCase(), keyCode: letter.charCodeAt(0) }
  const digit = /^Digit(\d)$/.exec(code)?.[1]
  if (digit) return { key: digit, keyCode: 48 + Number(digit) }
  return { key: code, keyCode: 0 }
}

function dispatch(type: 'keydown' | 'keyup', code: string) {
  const { key, keyCode } = describe(code)
  const ev = new KeyboardEvent(type, { code, key, keyCode, which: keyCode, bubbles: true, cancelable: true } as KeyboardEventInit)
  // Phaser still reads the legacy keyCode, which some browsers ignore in the init dictionary.
  if (ev.keyCode !== keyCode) {
    Object.defineProperty(ev, 'keyCode', { get: () => keyCode })
    Object.defineProperty(ev, 'which', { get: () => keyCode })
  }
  window.dispatchEvent(ev)
}

/** Several controls may hold the same key; it is only released when the last one lets go. */
const held = new Map<string, number>()

export function pressKey(code: string) {
  const n = held.get(code) ?? 0
  held.set(code, n + 1)
  if (n === 0) dispatch('keydown', code)
}

export function releaseKey(code: string) {
  const n = held.get(code) ?? 0
  if (n <= 0) return
  if (n === 1) {
    held.delete(code)
    dispatch('keyup', code)
  } else held.set(code, n - 1)
}

/** A quick press and release, for one-shot actions. */
export function tapKey(code: string) {
  pressKey(code)
  releaseKey(code)
}

/**
 * The joystick's analog position, x right and y down, each -1..1 (0,0 when released).
 * Games that want smooth movement read this; the rest just see WASD.
 */
export const virtualStick = { x: 0, y: 0 }
