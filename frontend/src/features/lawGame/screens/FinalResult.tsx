import { Link } from 'react-router'
import { PLAYER_NAMES } from '../config.ts'
import { LAW_PATHS } from '../paths.ts'
import { totalsOf, useLawGame } from '../store/useLawGame.ts'
import { LawNote } from '../ui/LawNote.tsx'

export function FinalResult() {
  const { theCase, results, start } = useLawGame()
  const totals = totalsOf(results)
  const draw = totals[0] === totals[1]
  const winner = totals[0] > totals[1] ? 0 : 1

  return (
    <div className="lg-screen">
      <div className="lg-scroll">
        <div className="lg-center">
          <span className="lg-kicker">Final verdict</span>
          <h1 className="lg-winner">{draw ? 'A draw' : `${PLAYER_NAMES[winner]} wins`}</h1>
          <p className="lg-dim">{draw ? 'Evenly matched on both sides of the law.' : 'Best across both roles: detective and obstructor.'}</p>
        </div>

        <div className="lg-cols">
          {([0, 1] as const).map((p) => {
            const as = results.map((r) => (r.criminal === p ? { role: 'Obstructor', pts: r.criminalScore } : { role: 'Detective', pts: r.detectiveScore }))
            return (
              <section className="lg-sheet" key={p} style={!draw && winner === p ? { borderColor: 'var(--lg-amber)' } : undefined}>
                <h3>{PLAYER_NAMES[p]}</h3>
                {as.map((a, i) => (
                  <div className="lg-row" key={i}>
                    <span>
                      Round {i + 1} · {a.role}
                    </span>
                    <b>{a.pts}</b>
                  </div>
                ))}
                <div className="lg-total">
                  <span>Total</span>
                  <span>{totals[p]}</span>
                </div>
              </section>
            )
          })}
        </div>

        <div className="lg-center" style={{ paddingBottom: 4 }}>
          <h3 style={{ fontSize: '1.1rem' }}>Laws from this case</h3>
          <p className="lg-dim" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            Simplified for learning. For the exact wording, check the official text of each Act.
          </p>
        </div>
        <div className="lg-lawlist">
          {theCase.charges.map((l) => (
            <LawNote key={l.act + l.section} law={l} label={l.section} />
          ))}
        </div>
      </div>
      <div className="lg-foot">
        <button className="lg-btn ghost" onClick={() => start(theCase.level)}>
          Play again
        </button>
        <Link className="lg-btn" to={LAW_PATHS.arcade}>
          Back to arcade
        </Link>
      </div>
    </div>
  )
}
