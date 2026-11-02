import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'

export const VerdictScreen: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const {
    rescueChain,
    saboteur,
    rescuerScoreBreakdown,
    saboteurScoreBreakdown,
    setPhase,
    roundNumber,
    language
  } = store

  const isCoreMissionComplete = !!rescueChain.find((s) => s.stepNumber === 5)?.completed
  const isSaboteurTraced = !saboteur.hasEscaped

  let bannerText = 'LIFE SAVED — CULPRIT FREE'
  let bannerClass = 'life-saved'
  let bannerTextHi = 'जान बची — पर अपराधी फरार'

  if (isCoreMissionComplete && isSaboteurTraced) {
    bannerText = 'PERFECT RESCUE'
    bannerClass = 'perfect'
    bannerTextHi = 'उत्कृष्ट बचाव — सम्पूर्ण न्याय'
  } else if (!isCoreMissionComplete && isSaboteurTraced) {
    bannerText = 'TOO LATE — BUT TRACED'
    bannerClass = 'too-late'
    bannerTextHi = 'देर हो गई — पर आरोपी चिन्हित'
  } else if (!isCoreMissionComplete && !isSaboteurTraced) {
    bannerText = 'SILENCED'
    bannerClass = 'silenced'
    bannerTextHi = 'मदद नहीं पहुंच सकी'
  }

  return (
    <div className="cc-verdict-overlay">
      <div className="cc-verdict-container">
        <span className="cc-verdict-kicker">
          {language === 'hi' ? `राउंड ${roundNumber === 1 ? 'A' : 'B'} निर्णय` : `ROUND ${roundNumber === 1 ? 'A' : 'B'} VERDICT`}
        </span>
        <h1 className={`cc-verdict-banner ${bannerClass}`}>
          {language === 'hi' ? bannerTextHi : bannerText}
        </h1>

        {/* Side-by-side Score Comparison */}
        <div className="cc-verdict-scores">
          {/* Rescuer Column */}
          <div className="cc-verdict-col rescuer">
            <h3 className="cc-col-title">RESCUER ROUND SCORE</h3>
            <div className="cc-col-total">{rescuerScoreBreakdown.totalScore}</div>
            <div className="cc-breakdown-list">
              <div className="cc-breakdown-row">
                <span>Rescue Chain Steps:</span>
                <span>+{rescuerScoreBreakdown.rescueChainPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Myths Countered with Law:</span>
                <span>+{rescuerScoreBreakdown.mythsCounteredPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Proof Tokens Secured:</span>
                <span>+{rescuerScoreBreakdown.proofTokensPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Safe Walker Bonus:</span>
                <span>+{rescuerScoreBreakdown.safeWalkerBonus}</span>
              </div>
            </div>
          </div>

          {/* Saboteur Column */}
          <div className="cc-verdict-col saboteur">
            <h3 className="cc-col-title">SABOTEUR ROUND SCORE</h3>
            <div className="cc-col-total">{saboteurScoreBreakdown.totalScore}</div>
            <div className="cc-breakdown-list">
              <div className="cc-breakdown-row">
                <span>Whispers Landed:</span>
                <span>+{saboteurScoreBreakdown.whispersLandedPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Tasks Interrupted:</span>
                <span>+{saboteurScoreBreakdown.tasksCancelledPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Evidence Neutralised:</span>
                <span>+{saboteurScoreBreakdown.evidenceNeutralisedPoints}</span>
              </div>
              <div className="cc-breakdown-row">
                <span>Escape Points:</span>
                <span>+{saboteurScoreBreakdown.escapePoints}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="cc-verdict-actions">
          <button
            className="cc-action-btn primary"
            onClick={() => setPhase('debrief')}
          >
            {language === 'hi'
              ? 'अध्ययन सारांश व कानूनी विश्लेषण देखें →'
              : 'View Case Debrief & Legal Lessons →'}
          </button>
        </div>
      </div>
    </div>
  )
}

