import type { LawRef } from '../types.ts'
import { LawNote } from './LawNote.tsx'

export function EdgeNote({ law }: { law?: LawRef }) {
  if (!law) return null
  return (
    <div className="lg-toast">
      <LawNote label="Stay off the tracks" law={law} />
    </div>
  )
}
