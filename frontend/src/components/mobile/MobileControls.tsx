import { Joystick } from './Joystick.tsx'
import type { JoystickKeys } from './joystickKeys.ts'
import { TouchButton, type TouchButtonDef } from './TouchButton.tsx'
import { useIsMobile } from './useIsMobile.ts'
import './mobile-controls.css'

export interface MobileControlsProps {
  /** Action buttons, bottom-right. List the main action first. */
  buttons?: readonly TouchButtonDef[]
  /** Keys the joystick holds. Defaults to WASD. */
  stickKeys?: JoystickKeys
  /** Lets a screen hide the controls while a menu or overlay is up. */
  visible?: boolean
}

/**
 * The on-screen gamepad: a thumbstick on the left, action buttons on the right.
 * Renders nothing outside phone-sized touch screens, so it is safe to drop into any game.
 */
export function MobileControls({ buttons = [], stickKeys, visible = true }: MobileControlsProps) {
  const mobile = useIsMobile()
  if (!mobile || !visible) return null
  return (
    <div className="mc-root">
      <div className="mc-left">
        <Joystick keys={stickKeys} />
      </div>
      {buttons.length > 0 && (
        <div className="mc-right">
          {buttons.map((b) => (
            <TouchButton key={b.code} {...b} />
          ))}
        </div>
      )}
    </div>
  )
}
