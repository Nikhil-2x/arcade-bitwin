import { Link } from 'react-router'
import '../features/lawGame/law-game.css'
import { LAW_PATHS } from '../features/lawGame/paths.ts'

/** Lists both games. Standalone: it sits outside GameLayout, so the Phaser canvas never loads here. */
export default function ArcadeHubPage() {
  return (
    <div className="lg">
      <title>Arcade | Circle of Allies</title>
      <div className="lg-screen lg-hub">
        <div>
          <span className="lg-kicker">Arcade</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', margin: '8px 0 0' }}>Choose your game</h1>
        </div>
        <div className="lg-hub-cards">
          <article className="lg-game">
            <div className="art" style={{ background: 'linear-gradient(135deg, #1d2a66, #5a2f7a)' }} aria-hidden>
              {'🤝'}
            </div>
            <h3>Circle of Allies</h3>
            <p>The original two-player rescue adventure. Work together, spot barriers and call for help.</p>
            <Link className="lg-btn" to="/" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Enter
            </Link>
          </article>
          <article className="lg-game">
            <div className="art" style={{ background: 'linear-gradient(135deg, #3a1f2a, #7a4a1a)' }} aria-hidden>
              {'⚖️'}
            </div>
            <h3>Crime Scene: Know the Law</h3>
            <p>One player hides the evidence, the other investigates. Learn real sections of Indian law along the way, then swap roles.</p>
            <Link className="lg-btn" to={LAW_PATHS.law} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Enter
            </Link>
          </article>
        </div>
      </div>
    </div>
  )
}
