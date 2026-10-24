import type { LawRef } from '../types.ts'

/** A short law callout. Used sparingly, where a section actually helps. */
export function LawNote({ law, label = 'Know the law', children }: { law: LawRef; label?: string; children?: React.ReactNode }) {
  return (
    <aside className="lg-law">
      <b>
        {label}: {law.act}, {law.section}
      </b>
      <small>{law.title}</small>
      <p>{children ?? law.summary}</p>
    </aside>
  )
}
