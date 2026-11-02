import React from 'react'
import type { VerdictRevealData } from '../network/milestone6Types.ts'
import './VerdictRevealModal.css'

interface VerdictRevealModalProps {
  verdictData: VerdictRevealData
  hostName: string
  guestName: string
  hostId: string
  guestId: string
  onContinue: () => void
}

export const VerdictRevealModal: React.FC<VerdictRevealModalProps> = ({
  verdictData,
  hostName,
  guestName,
  hostId,
  guestId,
  onContinue
}) => {
  const isCorrect = verdictData.isAccusationCorrect
  const saboteurName =
    verdictData.actualSaboteurId === hostId
      ? hostName
      : verdictData.actualSaboteurId === guestId
      ? guestName
      : 'Saboteur'

  return (
    <div className="cc-modal-backdrop cc-reveal-backdrop">
      <div className="cc-reveal-modal">
        <div className={`cc-reveal-banner ${isCorrect ? 'runner-win' : 'saboteur-win'}`}>
          <div className="cc-reveal-stamp">{isCorrect ? 'ACCUSATION UPHELD' : 'DEFENSE SUCCESSFUL'}</div>
          <h2>{isCorrect ? '⚖️ THE TRUTH IS REVEALED!' : '🎭 THE COVER STORY PREVAILED!'}</h2>
          <p className="cc-reveal-summary">{verdictData.outcomeSummary}</p>
        </div>

        <div className="cc-reveal-body">
          {/* True Identity Card */}
          <div className="cc-identity-card">
            <div className="cc-card-label">CONFIRMED TRUE ROLES</div>
            <div className="cc-identity-row">
              <div className="cc-player-id-pill">
                <span className="cc-pname">{hostName}</span>
                <span
                  className={`cc-prole ${
                    verdictData.actualRoles[hostId] === 'runner' ? 'runner' : 'saboteur'
                  }`}
                >
                  {verdictData.actualRoles[hostId] === 'runner'
                    ? 'RESPONSIBLE CITIZEN'
                    : 'CRIMINAL MANIPULATOR'}
                </span>
              </div>

              <div className="cc-vs-tag">VS</div>

              <div className="cc-player-id-pill">
                <span className="cc-pname">{guestName}</span>
                <span
                  className={`cc-prole ${
                    verdictData.actualRoles[guestId] === 'runner' ? 'runner' : 'saboteur'
                  }`}
                >
                  {verdictData.actualRoles[guestId] === 'runner'
                    ? 'RESPONSIBLE CITIZEN'
                    : 'CRIMINAL MANIPULATOR'}
                </span>
              </div>
            </div>
            <div className="cc-true-culprit">
              The true perpetrator behind the incident was <strong>{saboteurName}</strong>.
            </div>
          </div>

          {/* Evidence vs Counter-Narrative Comparison */}
          <div className="cc-comparison-grid">
            <div className="cc-comparison-col">
              <div className="cc-col-title">RUNNER ACCUSATION EVIDENCE</div>
              {verdictData.runnerEvidence.length === 0 ? (
                <div className="cc-empty-box">No evidence items attached to accusation.</div>
              ) : (
                verdictData.runnerEvidence.map((ev) => (
                  <div key={ev.id} className="cc-ev-pill">
                    <span className="cc-ev-check">
                      {ev.verified && !ev.isContradiction ? '✓ VERIFIED' : '⚠️ MISLEADING'}
                    </span>
                    <span className="cc-ev-text">{ev.title}</span>
                  </div>
                ))
              )}
              <div className="cc-score-tag runner">
                Score Awarded: +{verdictData.evidenceScoreAwarded} pts
              </div>
            </div>

            <div className="cc-comparison-col">
              <div className="cc-col-title">SABOTEUR DEFENSE NARRATIVE</div>
              {verdictData.saboteurNarrative ? (
                <div className="cc-narrative-display">
                  <strong>{verdictData.saboteurNarrative.title}</strong>
                  <p>{verdictData.saboteurNarrative.description}</p>
                </div>
              ) : (
                <div className="cc-empty-box">Default alibi presented.</div>
              )}
              <div className="cc-score-tag saboteur">
                Score Awarded: +{verdictData.saboteurDeceptionAwarded} pts
              </div>
            </div>
          </div>
        </div>

        <div className="cc-reveal-footer">
          <button type="button" className="cc-reveal-continue-btn" onClick={onContinue}>
            PROCEED TO ROUND RESULTS & CIVIC DEBRIEF →
          </button>
        </div>
      </div>
    </div>
  )
}
