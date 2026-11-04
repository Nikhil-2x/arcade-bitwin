import { useMemo } from 'react'
import { MobileControls, type TouchButtonDef } from '../../../components/mobile/index.ts'

interface Props {
  /** Only while the player is in the scene; the "tap to step in" card covers it otherwise. */
  engaged: boolean
  /** What E does right now, e.g. "Place". */
  actionLabel: string
  /** The case's extra keyboard keys, e.g. [['E', 'talk'], ['M', 'mute']]. */
  extraControls?: ReadonlyArray<readonly [key: string, action: string]>
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** First-person scenes on a phone: stick to walk (push to the rim to run), drag to look, buttons for keys. */
export function LawMobileControls({ engaged, actionLabel, extraControls = [] }: Props) {
  const buttons = useMemo<TouchButtonDef[]>(() => {
    const list: TouchButtonDef[] = [{ code: 'KeyE', label: actionLabel, primary: true }]
    for (const [key, action] of extraControls) {
      // E is the main button already; anything that is not a single letter has no key to press.
      if (key === 'E' || !/^[A-Z]$/.test(key)) continue
      list.push({ code: `Key${key}`, label: capitalise(action) })
    }
    list.push({ code: 'Escape', label: 'Pause' })
    return list
  }, [actionLabel, extraControls])

  return <MobileControls buttons={buttons} visible={engaged} />
}
