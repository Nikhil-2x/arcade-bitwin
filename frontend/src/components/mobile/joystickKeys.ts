/** Which keys the joystick holds for each direction (KeyboardEvent.code values). */
export interface JoystickKeys {
  up: string
  down: string
  left: string
  right: string
}

export const WASD: JoystickKeys = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }
export const ARROWS: JoystickKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
