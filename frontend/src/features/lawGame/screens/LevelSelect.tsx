import { MotionConfig, motion } from 'motion/react'
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

const SWELL = 'M-40 8q20-10 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0V40H-40z'

/** Bright morning on the sand: the sea rolls in, a ball bounces, and a turtle heads for the water. */
function BeachArt() {
  return (
    <svg viewBox="0 0 320 170" aria-hidden className="lg-lv-svg">
      <defs>
        <linearGradient id="lg-lv-day" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3c9bdc" />
          <stop offset="100%" stopColor="#c8ebf6" />
        </linearGradient>
      </defs>
      <rect width="320" height="92" fill="url(#lg-lv-day)" />
      <motion.circle
        cx="258"
        cy="34"
        r="17"
        fill="#fff3bf"
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
      />
      <rect y="86" width="320" height="30" fill="#158aa6" />
      <g transform="translate(0 92)"><motion.path d={SWELL} fill="#2bb3c2" animate={{ x: [0, -40] }} transition={{ duration: 5, ease: 'linear', repeat: Infinity }} /></g>
      <g transform="translate(0 103)"><motion.path d={SWELL} fill="#6fd8d2" animate={{ x: [-40, 0] }} transition={{ duration: 3.6, ease: 'linear', repeat: Infinity }} /></g>
      <g transform="translate(0 113)"><motion.path d={SWELL} fill="#eefbf7" animate={{ x: [0, -40] }} transition={{ duration: 2.8, ease: 'linear', repeat: Infinity }} /></g>
      <path d="M0 124q80-8 160-2t160-4v52H0z" fill="#efd9a4" />
      {/* A parasol and a lounger. */}
      <path d="M254 88v62" stroke="#7a5636" strokeWidth="3" />
      <path d="M218 96q36-36 72 0z" fill="#ec6a5c" />
      <path d="M242 96q12-36 24 0z" fill="#f2efe6" />
      <path d="M212 148l32-4 14-11" stroke="#3fa7c9" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* The ball. */}
      <motion.g animate={{ y: [0, -38, 0] }} transition={{ duration: 1.1, ease: ['easeOut', 'easeIn'], repeat: Infinity }}>
        <circle cx="60" cy="140" r="11" fill="#f2efe6" />
        <path d="M60 129a11 11 0 0 1 0 22z" fill="#ec6a5c" />
        <path d="M60 129a11 11 0 0 0-8 18z" fill="#3fa7c9" />
      </motion.g>
      <ellipse cx="60" cy="153" rx="11" ry="2.5" fill="#b89a60" />
      {/* The turtle, going home. */}
      <motion.g animate={{ x: [0, 16, 16, 0], y: [0, -10, -10, 0], opacity: [1, 1, 0, 0] }} transition={{ duration: 9, times: [0, 0.7, 0.85, 1], ease: 'linear', repeat: Infinity }}>
        <ellipse cx="144" cy="146" rx="14" ry="9" fill="#3f7d5a" />
        <ellipse cx="144" cy="146" rx="9" ry="5.6" fill="#2d6245" />
        <circle cx="157" cy="139" r="4" fill="#5fa377" />
        <path d="M134 139l-7-5M154 151l6 5M134 153l-7 5" stroke="#5fa377" strokeWidth="3.4" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

/** The banking hall: the strongroom door turns, a note counter riffles, and one coin goes missing from the pile. */
function BankArt() {
  return (
    <svg viewBox="0 0 320 170" aria-hidden className="lg-lv-svg">
      <defs>
        <linearGradient id="lg-lv-hall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a2a1c" />
          <stop offset="100%" stopColor="#a87c49" />
        </linearGradient>
      </defs>
      <rect width="320" height="170" fill="url(#lg-lv-hall)" />
      <path d="M0 58 160 14l160 44z" fill="#2a1e15" />
      <path d="M0 58h320v7H0z" fill="#d8c8a6" />
      {[34, 92, 228, 286].map((x) => (
        <g key={x}>
          <rect x={x - 9} y="65" width="18" height="71" fill="#e6d9bd" />
          <path d={`M${x - 3} 65v71M${x + 3} 65v71`} stroke="#b7a786" strokeWidth="1.5" />
          <rect x={x - 12} y="130" width="24" height="7" fill="#c2b290" />
        </g>
      ))}
      {/* The strongroom door. */}
      <circle cx="160" cy="92" r="42" fill="#2d2f36" />
      <circle cx="160" cy="92" r="42" fill="none" stroke="#c9a24a" strokeWidth="3" />
      <motion.g style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }} animate={{ rotate: [0, 90, 90, 0, 0] }} transition={{ duration: 9, times: [0, 0.2, 0.55, 0.75, 1], ease: 'easeInOut', repeat: Infinity }}>
        <circle cx="160" cy="92" r="27" fill="#454852" />
        <path d="M160 68v48M136 92h48M143 75l34 34M177 75l-34 34" stroke="#c9a24a" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="160" cy="92" r="7" fill="#c9a24a" />
      </motion.g>
      {/* The floor, and the teller's counter. */}
      <rect y="136" width="320" height="34" fill="#efe7d3" />
      <path d="M0 148h320M60 136l-24 34M260 136l24 34M160 136v34" stroke="#b7a786" strokeWidth="1.2" />
      <rect x="10" y="122" width="64" height="30" rx="2" fill="#40281a" />
      <rect x="6" y="118" width="72" height="6" fill="#c9a24a" />
      {/* Notes riffling through the counter. */}
      <rect x="24" y="104" width="36" height="14" rx="2" fill="#20232c" />
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x="32"
          y="97"
          width="20"
          height="9"
          fill="#a58fd1"
          stroke="#6d5a96"
          strokeWidth="0.6"
          animate={{ y: [12, -8], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: i * 0.3, ease: 'easeOut', repeat: Infinity }}
        />
      ))}
      {/* The pile, with one coin rolling away. */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="256" cy={154 - i * 5} rx="17" ry="5" fill={i % 2 ? '#d9b34f' : '#c9a24a'} stroke="#8a6d2a" strokeWidth="0.8" />
      ))}
      <motion.g animate={{ x: [0, 0, -92, -92], opacity: [0, 1, 1, 0] }} transition={{ duration: 6, times: [0, 0.2, 0.8, 1], ease: 'easeIn', repeat: Infinity }}>
        <circle cx="238" cy="154" r="7" fill="#e2c15c" stroke="#8a6d2a" />
      </motion.g>
    </svg>
  )
}

const ART: Record<SceneId, () => React.JSX.Element> = { classroom: ClassroomArt, railway: RailwayArt, beach: BeachArt, bank: BankArt }

/** What each case teaches, in words a player will recognise. */
const TEACHES: Record<SceneId, string> = {
  classroom: 'Theft, trespass and exam leaks, and how evidence stands up in court.',
  railway: 'The Railways Act: trespass, signal tampering, damage to railway property and the alarm chain.',
  beach: 'The Wild Life Act: protected turtles, nests and eggs, illegal trade, and safety on the shore.',
  bank: 'Financial crime: money laundering, forgery, breach of trust, cheque bounce and cyber fraud.',
}

const TAPE = 'CRIME SCENE  DO NOT CROSS  '.repeat(14)

/** The doorway to the law game. Loads no 3D at all, so it opens at once. */
export default function LevelSelect() {
  return (
    <MotionConfig reducedMotion="user">
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
              <motion.div
                key={c.level}
                className="lg-lv-slot"
                initial={{ opacity: 0, transform: 'translateY(18px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.08, ease: [0.23, 1, 0.32, 1] }}
              >
                <Link to={LAW_PATHS.level(c.level)} className={`lg-lv-case ${c.scene}`}>
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
              </motion.div>
            )
          })}
        </main>

        <footer className="lg-lv-credit">
          Level 2 station model by{' '}
          <a href="https://sketchfab.com/3d-models/railway-station-8dc6346464044ad3be71b47f072e4a34" target="_blank" rel="noreferrer">
            Igor Tretyakov
          </a>
          , CC BY 4.0. Simplified for the web. Level 3 beach scan by{' '}
          <a href="https://sketchfab.com/3d-models/karpen-albania-drone-3d-scan-dd0c6d2411f44352a3bff7ec45d57902" target="_blank" rel="noreferrer">
            Sircher
          </a>
          , CC BY 4.0. Level 4 bank hall by{' '}
          <a href="https://sketchfab.com/3d-models/the-bank-hall-7ff86c154ac843c48c4b0ec0149d4321" target="_blank" rel="noreferrer">
            Veterock
          </a>
          , CC BY 4.0. Optimised for the web.
        </footer>
      </div>
    </MotionConfig>
  )
}
