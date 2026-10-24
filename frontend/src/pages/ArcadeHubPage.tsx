import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LAW_PATHS } from '../features/lawGame/paths.ts'
import { PATHS } from '../routes/paths.ts'
import './arcade-hub.css'

function AlliesArt() {
  // A lone figure in the dark, ringed by allies whose lights join into a circle.
  const ring = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    return { x: 100 + Math.cos(a) * 58, y: 72 + Math.sin(a) * 40, d: i * 0.25 }
  })
  return (
    <svg viewBox="0 0 200 144" aria-hidden className="hub-art-svg">
      <defs>
        <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffb547" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="72" rx="78" ry="56" fill="url(#hub-glow)" opacity="0.35" className="hub-breathe" />
      <ellipse cx="100" cy="72" rx="58" ry="40" fill="none" stroke="#9eecff" strokeWidth="1.5" strokeDasharray="4 6" className="hub-spin" />
      {ring.map((p, i) => (
        <g key={i} className="hub-ally" style={{ animationDelay: `${p.d}s` }}>
          <circle cx={p.x} cy={p.y} r="9" fill="#9eecff" opacity="0.18" />
          <circle cx={p.x} cy={p.y - 3} r="3.2" fill="#dff8ff" />
          <rect x={p.x - 3.5} y={p.y + 0.5} width="7" height="7" rx="3" fill="#9eecff" />
        </g>
      ))}
      <circle cx="100" cy="64" r="6" fill="#ffd9a0" />
      <rect x="93" y="71" width="14" height="16" rx="6" fill="#ffb547" />
    </svg>
  )
}

function CrimeArt() {
  return (
    <svg viewBox="0 0 200 144" aria-hidden className="hub-art-svg">
      <g className="hub-tape">
        <rect x="-20" y="98" width="240" height="16" fill="#ffcf3a" transform="rotate(-8 100 106)" />
        <text x="100" y="110" textAnchor="middle" fontSize="9" fontFamily="Bungee, sans-serif" fill="#1b1304" transform="rotate(-8 100 106)">
          CRIME SCENE · DO NOT CROSS · CRIME SCENE
        </text>
      </g>
      {/* scales of justice */}
      <g stroke="#f1d9a8" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M70 24v60M52 86h36M48 34h44" />
        <path d="M48 34l-10 22M48 34l10 22M92 34l-10 22M92 34l10 22" />
      </g>
      <g className="hub-scale-l">
        <path d="M34 56h28a14 6 0 0 1-28 0z" fill="#f1d9a8" />
      </g>
      <g className="hub-scale-r">
        <path d="M78 56h28a14 6 0 0 1-28 0z" fill="#f1d9a8" />
      </g>
      {/* magnifier sweeping for clues */}
      <g className="hub-magnify">
        <circle cx="138" cy="56" r="20" fill="rgba(158,236,255,0.12)" stroke="#9eecff" strokeWidth="4" />
        <path d="M152 70l18 18" stroke="#9eecff" strokeWidth="7" strokeLinecap="round" />
        <circle cx="132" cy="50" r="4" fill="#fff" opacity="0.5" />
      </g>
    </svg>
  )
}

function SoonArt() {
  return (
    <svg viewBox="0 0 200 144" aria-hidden className="hub-art-svg">
      <text x="100" y="98" textAnchor="middle" fontSize="84" fontFamily="Bungee, sans-serif" fill="none" stroke="#7a82b8" strokeWidth="2" className="hub-flicker">
        ?
      </text>
    </svg>
  )
}

interface Game {
  title: string
  tag: string
  blurb: string
  players: string
  to?: string
  art: ReactNode
  tone: string
}

const GAMES: Game[] = [
  {
    title: 'Circle of Allies',
    tag: 'Adventure',
    blurb: 'Get Priya home safe through a city at night. Spot barriers, call allies and build a circle no one can break.',
    players: '1–2 players · online rooms',
    to: PATHS.intro,
    art: <AlliesArt />,
    tone: 'allies',
  },
  {
    title: 'Crime Scene: Know the Law',
    tag: 'Investigation',
    blurb: 'One player hides the evidence, the other hunts it down in 3D. Learn real sections of Indian law, then swap roles.',
    players: '2 players · same screen',
    to: LAW_PATHS.law,
    art: <CrimeArt />,
    tone: 'crime',
  },
  {
    title: 'Coming Soon',
    tag: 'In development',
    blurb: 'A third story is being built. New mission, new lessons, the same two-player spirit.',
    players: 'Stay tuned',
    art: <SoonArt />,
    tone: 'soon',
  },
]

/** The site's front door: every game, side by side. Sits outside GameLayout, so no Phaser canvas loads here. */
export default function ArcadeHubPage() {
  return (
    <div className="hub">
      <title>BitWin Arcade</title>
      <div className="hub-sky" aria-hidden>
        <div className="hub-stars" />
        <div className="hub-sun" />
        <div className="hub-grid" />
      </div>
      <div className="hub-scan" aria-hidden />

      <header className="hub-hero">
        <span className="hub-kicker">Insert coin · Learn something</span>
        <h1 className="hub-title" data-text="BitWin Arcade">
          BitWin Arcade
        </h1>
        <p className="hub-sub">Games about courage, community and knowing your rights. Pick a cabinet.</p>
      </header>

      <main className="hub-row" aria-label="Games">
        {GAMES.map((g, i) => {
          const body = (
            <>
              <div className="hub-art">{g.art}</div>
              <div className="hub-meta">
                <span className="hub-tag">{g.tag}</span>
                <h2>{g.title}</h2>
                <p>{g.blurb}</p>
                <span className="hub-players">{g.players}</span>
              </div>
              <span className="hub-play">{g.to ? 'Press start' : 'Coming soon'}</span>
            </>
          )
          return g.to ? (
            <Link key={g.title} to={g.to} className={`hub-card ${g.tone}`} style={{ animationDelay: `${120 + i * 110}ms` }}>
              {body}
            </Link>
          ) : (
            <div key={g.title} className={`hub-card ${g.tone}`} aria-disabled style={{ animationDelay: `${120 + i * 110}ms` }}>
              {body}
            </div>
          )
        })}
      </main>
    </div>
  )
}
