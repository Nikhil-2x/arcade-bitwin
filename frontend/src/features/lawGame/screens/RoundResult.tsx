import { PLAYER_NAMES } from '../config.ts'
import { totalsOf, useLawGame } from '../store/useLawGame.ts'
import type { ScoreLine } from '../types.ts'

function Sheet({ title, lines, total }: { title: string; lines: ScoreLine[]; total: number }) {
  return (
    <section className="lg-sheet">
      <h3>{title}</h3>
      {lines.map((l) => (
        <div className="lg-row" key={l.label}>
          <span>
            {l.label}
            {l.note && <small>{l.note}</small>}
          </span>
          <b className={l.points < 0 ? 'neg' : ''}>{l.points > 0 ? `+${l.points}` : l.points}</b>
        </div>
      ))}
      <div className="lg-total">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </section>
  )
}

export function RoundResult() {
  const { theCase, world, results, round, verdicts, collected, nextRound } = useLawGame()
  const r = results[results.length - 1]
  if (!r || !world) return null
  const culprit = theCase.suspects.find((s) => s.id === world.characterId)
  const totals = totalsOf(results)
  const conceal = new Map(world.placements.map((p) => [p.evidenceId, p.concealment]))

  return (
    <div className="lg-screen">
      <div className="lg-scroll">
        <div className="lg-center" style={{ paddingBottom: 6 }}>
          <span className="lg-kicker">Round {round + 1} of 2 · the culprit was {culprit?.name}</span>
          <h1 className={`lg-verdict ${r.correctAccusation ? 'good' : 'bad'}`}>{r.correctAccusation ? 'Case solved' : 'The culprit walked free'}</h1>
          <p className="lg-dim" style={{ margin: 0 }}>
            {r.mistakes === 0
              ? 'Every clue was sorted correctly, so the hint was honest.'
              : `${r.mistakes} sorting ${r.mistakes === 1 ? 'mistake' : 'mistakes'} gave the hint a ${Math.round(r.mislead * 100)}% chance of misleading${r.hintWasMisleading ? ', and it did' : ', but it held true'}.`}
          </p>
        </div>

        <div className="lg-cols">
          <Sheet title={`${PLAYER_NAMES[r.detective]} · Detective`} lines={r.detectiveLines} total={r.detectiveScore} />
          <Sheet title={`${PLAYER_NAMES[r.criminal]} · Obstructor`} lines={r.criminalLines} total={r.criminalScore} />
        </div>

        <div className="lg-cols" style={{ gridTemplateColumns: '1fr' }}>
          <section className="lg-sheet">
            <h3>The evidence</h3>
            <table className="lg-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Truth</th>
                  <th>Detective said</th>
                  <th>Hidden</th>
                </tr>
              </thead>
              <tbody>
                {theCase.evidences.map((e) => {
                  const v = verdicts[e.id]
                  const found = collected.includes(e.id)
                  const right = found && v !== undefined && (v === 'relevant') === e.relevant
                  return (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td>{e.relevant ? 'Relevant' : 'Irrelevant'}</td>
                      <td style={{ color: right ? 'var(--lg-green)' : 'var(--lg-red)' }}>{!found ? 'Never found' : v === 'relevant' ? 'Relevant' : 'Irrelevant'}</td>
                      <td>{Math.round((conceal.get(e.id) ?? 0) * 100)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <div className="lg-foot">
        <span className="lg-dim">
          Running total: {PLAYER_NAMES[0]} {totals[0]} · {PLAYER_NAMES[1]} {totals[1]}
        </span>
        <button className="lg-btn" onClick={nextRound}>
          {round === 0 ? 'Swap roles' : 'See the winner'}
        </button>
      </div>
    </div>
  )
}
