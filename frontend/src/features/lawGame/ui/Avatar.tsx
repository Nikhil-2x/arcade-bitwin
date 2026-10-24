import type { Suspect } from '../types.ts'

/** A drawn bust for a suspect, so each character reads at a glance without image files. */
export function Avatar({ s, title }: { s: Suspect; title?: string }) {
  return (
    <svg viewBox="0 0 100 120" role="img" aria-label={title ?? s.name}>
      <ellipse cx="50" cy="118" rx="42" ry="30" fill={s.shirt} />
      <rect x="43" y="68" width="14" height="16" rx="5" fill={s.skin} />
      <ellipse cx="50" cy="50" rx="21" ry="25" fill={s.skin} />
      {s.hairStyle === 0 && <path d="M28 46c0-20 14-26 24-26s20 6 20 26c-6-10-14-13-22-13s-16 3-22 13z" fill={s.hair} />}
      {s.hairStyle === 1 && (
        <>
          <path d="M26 54c-4-30 10-38 24-38s28 8 24 38c0 12 2 22-4 30-2-14-4-30-20-30s-18 16-20 30c-6-8-4-18-4-30z" fill={s.hair} />
        </>
      )}
      {s.hairStyle === 2 && <path d="M29 42c2-16 12-20 22-20s19 4 21 20c-8-6-14-8-22-8s-14 2-21 8z" fill={s.hair} />}
      {s.hairStyle === 3 && (
        <>
          <path d="M29 44c0-18 10-22 22-22s20 4 20 22c-5-8-12-10-21-10s-15 2-21 10z" fill={s.hair} />
          <rect x="33" y="46" width="14" height="10" rx="4" fill="none" stroke="#222" strokeWidth="2" />
          <rect x="53" y="46" width="14" height="10" rx="4" fill="none" stroke="#222" strokeWidth="2" />
          <path d="M47 51h6" stroke="#222" strokeWidth="2" />
        </>
      )}
      <circle cx="42" cy="53" r="2" fill="#1a1a1a" />
      <circle cx="58" cy="53" r="2" fill="#1a1a1a" />
      <path d="M43 64q7 5 14 0" stroke="#7a2e2e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
