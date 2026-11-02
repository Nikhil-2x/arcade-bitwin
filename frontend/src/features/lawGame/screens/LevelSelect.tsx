import { Link } from 'react-router'
import { LAW_CASES } from '../data/cases.ts'
import '../law-game.css'
import { LAW_PATHS } from '../paths.ts'
import type { SceneId } from '../types.ts'

/** The classroom after hours: a chalkboard, a forced drawer, a torn envelope drifting down. */
function ClassroomArt() {
  return (
    <svg viewBox="0 0 320 170" aria-hidden className="lg-lv-svg">
      <rect width="320" height="170" fill="#1a1d3a" />
      <rect y="132" width="320" height="38" fill="#2b2440" />
      <g className="lg-lv-moon">
        <rect x="246" y="26" width="52" height="66" rx="3" fill="#0b0e22" stroke="#4b5288" strokeWidth="3" />
        <path d="M272 26v66M246 59h52" stroke="#4b5288" strokeWidth="2" />
        <circle cx="284" cy="42" r="8" fill="#ffe7b0" />
      </g>
      <rect x="28" y="28" width="150" height="74" rx="3" fill="#20493d" stroke="#6e4a2c" strokeWidth="4" />
      <g stroke="#dfeee6" strokeWidth="2" strokeLinecap="round" fill="none" className="lg-lv-chalk">
        <path d="M42 48h62M42 62h92M42 76h48" />
        <path d="M118 74l10 10 22-26" stroke="#ff8a7a" />
      </g>
      <rect x="70" y="118" width="130" height="10" rx="2" fill="#8a6a44" />
      <rect x="82" y="128" width="8" height="30" fill="#5a3f27" />
      <rect x="180" y="128" width="8" height="30" fill="#5a3f27" />
      <g className="lg-lv-drawer">
        <rect x="108" y="128" width="58" height="16" fill="#6e4a2c" stroke="#3a2614" />
      </g>
      <g className="lg-lv-paper">
        <rect x="-11" y="-8" width="22" height="15" fill="#e9dfc4" />
        <circle cx="3" cy="-1" r="3.4" fill="#a3231c" />
      </g>
    </svg>
  )
}

/** The station at dusk: an express running through, under a signal that has gone dark. */
function RailwayArt() {
  return (
    <svg viewBox="0 0 320 170" aria-hidden className="lg-lv-svg">
      <defs>
        <linearGradient id="lg-lv-dusk" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#12102e" />
          <stop offset="55%" stopColor="#5a2150" />
          <stop offset="85%" stopColor="#ff8a5b" />
        </linearGradient>
      </defs>
      <rect width="320" height="118" fill="url(#lg-lv-dusk)" />
      <circle cx="232" cy="104" r="26" fill="#ffd27a" opacity="0.9" />
      <path d="M0 118V84h40V68h34v16h26V58l14-14 14 14v26h44v34z" fill="#231433" />
      <path d="M0 96h320v8H0z" fill="#3a2442" opacity="0.8" />
      <g fill="#6d5e78">
        <rect x="150" y="56" width="170" height="7" />
        <rect x="186" y="63" width="6" height="55" />
        <rect x="270" y="63" width="6" height="55" />
      </g>
      <rect y="118" width="320" height="52" fill="#191523" />
      <g className="lg-lv-train">
        <g>
          {[0, 92, 184, 276].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <rect y="80" width="88" height="38" rx="4" fill="#b9b6ac" />
              <rect y="80" width="88" height="9" rx="4" fill="#2f5f9e" />
              <rect y="108" width="88" height="10" fill="#2f5f9e" />
              {[8, 26, 44, 62].map((w) => (
                <rect key={w} x={w} y="93" width="12" height="11" fill="#ffdca0" />
              ))}
            </g>
          ))}
        </g>
      </g>
      <g stroke="#6b6775" strokeWidth="2.5">
        <path d="M0 122h320M0 130h320" />
      </g>
      <g fill="#3a3540">
        {Array.from({ length: 17 }, (_, i) => (
          <rect key={i} x={i * 20} y="119" width="7" height="14" />
        ))}
      </g>
      <rect y="138" width="320" height="32" fill="#8d8a92" />
      <rect y="138" width="320" height="4" fill="#ffcf3a" />
      <g>
        <rect x="26" y="62" width="4" height="76" fill="#17181c" />
        <rect x="19" y="38" width="18" height="30" rx="3" fill="#0a0b10" />
        <circle cx="28" cy="48" r="5" fill="#ff3a2c" className="lg-lv-signal" />
        <circle cx="28" cy="60" r="5" fill="#10261a" />
      </g>
    </svg>
  )
}

const ART: Record<SceneId, () => React.JSX.Element> = { classroom: ClassroomArt, railway: RailwayArt }

/** What each case teaches, in words a player will recognise. */
const TEACHES: Record<SceneId, string> = {
  classroom: 'Theft, trespass and exam leaks, and how evidence stands up in court.',
  railway: 'The Railways Act: trespass, signal tampering, damage to railway property and the alarm chain.',
}

const TAPE = 'CRIME SCENE  DO NOT CROSS  '.repeat(14)

/** The doorway to the law game. Loads no 3D at all, so it opens at once. */
export default function LevelSelect() {
  return (
    <div className="lg lg-lv">
      <title>Crime Scene: Choose a Level</title>
      <div className="lg-lv-tape one" aria-hidden>
        <span>{TAPE}</span>
      </div>
      <div className="lg-lv-tape two" aria-hidden>
        <span>{TAPE}</span>
      </div>

      <Link to={LAW_PATHS.arcade} className="lg-btn small ghost lg-lv-back">
        Back to arcade
      </Link>

      <header className="lg-lv-head">
        <h1>Crime Scene: Know the Law</h1>
        <p>Two players, one screen. Hide the evidence, hunt it down, then swap sides.</p>
      </header>

      <main className="lg-lv-cases" aria-label="Levels">
        {LAW_CASES.map((c, i) => {
          const Art = ART[c.scene]
          return (
            <Link key={c.level} to={LAW_PATHS.level(c.level)} className={`lg-lv-case ${c.scene}`} style={{ animationDelay: `${650 + i * 160}ms` }}>
              <div className="lg-lv-art">
                <Art />
                <span className="lg-lv-num">Level {c.level}</span>
              </div>
              <div className="lg-lv-body">
                <h2>{c.title}</h2>
                <p className="lg-lv-place">{c.place}</p>
                <p>{c.tagline}</p>
                <p className="lg-lv-learn">{TEACHES[c.scene]}</p>
              </div>
              <span className="lg-lv-go">Play level {c.level}</span>
            </Link>
          )
        })}
      </main>

      <footer className="lg-lv-credit">
        Level 2 station model by{' '}
        <a href="https://sketchfab.com/3d-models/railway-station-8dc6346464044ad3be71b47f072e4a34" target="_blank" rel="noreferrer">
          Igor Tretyakov
        </a>
        , CC BY 4.0. Simplified for the web.
      </footer>
    </div>
  )
}
