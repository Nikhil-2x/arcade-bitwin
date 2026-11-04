/**
 * "Is the player in the scene?" On desktop that means the mouse is pointer-locked. Phones have no
 * pointer lock, so a tap on the scene engages touch play instead. Everything that used to check
 * `document.pointerLockElement` asks `isEngaged()`, and both kinds of change fire `pointerlockchange`
 * so existing listeners (audio start, intro shots, the HUD) keep working unchanged.
 */
let touchEngaged = false

export const isEngaged = () => touchEngaged || document.pointerLockElement !== null

export function setTouchEngaged(on: boolean) {
  if (touchEngaged === on) return
  touchEngaged = on
  document.dispatchEvent(new Event('pointerlockchange'))
}
