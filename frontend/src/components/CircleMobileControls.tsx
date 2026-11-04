import { useEffect, useState } from 'react'
import { SceneBridge } from '../game/sceneBridge.ts'
import { MobileControls, type TouchButtonDef } from './mobile/index.ts'

/** Same keys as the keyboard layout in the level brief. */
const BUTTONS: readonly TouchButtonDef[] = [
  { code: 'Space', label: 'Use', primary: true },
  { code: 'KeyF', label: 'Torch' },
  { code: 'KeyE', label: 'Share' },
  { code: 'KeyQ', label: 'Ally' },
]

/** Circle of Allies on a phone: the gamepad appears only while a level is being played. */
export default function CircleMobileControls() {
  const [scene, setScene] = useState(SceneBridge.active)
  useEffect(() => SceneBridge.subscribe(setScene), [])
  return <MobileControls buttons={BUTTONS} visible={scene === 'Level'} />
}
