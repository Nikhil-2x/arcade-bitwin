import type { LawRef } from '../types.ts'
import { HudToast } from './HudToast.tsx'
import { LawNote } from './LawNote.tsx'

export function EdgeNote({ law, label = 'Stay off the tracks' }: { law?: LawRef; label?: string }) {
  if (!law) return null
  return (
    <HudToast>
      <LawNote label={label} law={law} />
    </HudToast>
  )
}
