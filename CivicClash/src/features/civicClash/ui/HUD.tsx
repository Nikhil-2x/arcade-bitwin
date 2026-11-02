import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'

export const HUD: React.FC<{
  store: CivicClashStore
  onAutoWalk?: () => void
  onOpenCaseFile?: () => void
  onOpenTutorial?: () => void
}> = ({ store, onAutoWalk, onOpenCaseFile, onOpenTutorial }) => {
  const {
    timeRemainingSec,
    level,
    roundNumber,
    p1Role,
    rescuer,
    rescuerScoreBreakdown,
    saboteurScoreBreakdown,
    currentObjective,
    language
  } = store

  // Format real-time remaining (270s) as compressed Golden Hour (60:00 -> 00:00)
  const goldenHourTotalSec = 60 * 60
  const ratio = timeRemainingSec / 270
  const simulatedSec = Math.floor(goldenHourTotalSec * ratio)
  const minutes = Math.floor(simulatedSec / 60)
  const seconds = simulatedSec % 60
  const clockDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <header className="cc-top-hud">
      {/* 1. Left: Level & Golden Clock */}
      <div className="cc-hud-left-group">
        <div className="cc-hud-pill">
          <span className="cc-hud-badge">LEVEL {level.id}</span>
          <span className="cc-hud-sub">
            {p1Role === 'rescuer' ? 'RESCUER' : 'SABOTEUR'}
          </span>
        </div>

        <div className="cc-golden-clock">
          <span className="cc-clock-label">
            {language === 'hi' ? 'गोल्डन ऑवर' : 'GOLDEN HOUR'}
          </span>
          <span className="cc-clock-digits">{clockDisplay}</span>
        </div>
      </div>

      {/* 2. Center: Compact Single Objective Capsule */}
      <div className="cc-objective-hud-capsule">
        <span className="cc-obj-step-badge">
          STEP {currentObjective.stepNumber}/5
        </span>
        <span className="cc-obj-title-text">
          {language === 'hi' ? currentObjective.titleHi : currentObjective.title}
        </span>
        {onAutoWalk && (
          <button
            className="cc-obj-walk-pill"
            onClick={onAutoWalk}
            title="Auto-walk character directly to current objective"
          >
            🚶 {language === 'hi' ? 'वहां चलें' : 'Walk There'}
          </button>
        )}
      </div>

      {/* 3. Right: Resources, Score, Guide buttons */}
      <div className="cc-hud-right-group">
        {p1Role === 'rescuer' && (
          <div className="cc-cones-chip" title="Warning cones remaining to protect accident scene">
            <span className="cc-cone-ico">⚠️</span>
            <span className="cc-cone-val">{rescuer.conesRemaining}/3 Cones</span>
          </div>
        )}

        <div className="cc-score-chip">
          <span className="cc-score-label">PTS</span>
          <span className="cc-score-val">
            {p1Role === 'rescuer' ? rescuerScoreBreakdown.totalScore : saboteurScoreBreakdown.totalScore}
          </span>
        </div>

        {onOpenTutorial && (
          <button
            className="cc-hud-btn guide"
            onClick={onOpenTutorial}
            title="How to play and Saboteur obstacles guide"
          >
            ❓ Guide
          </button>
        )}

        {onOpenCaseFile && (
          <button
            className="cc-hud-btn casefile"
            onClick={onOpenCaseFile}
            title="View secured case evidence and Good Samaritan laws (TAB)"
          >
            📁 Case File
          </button>
        )}
      </div>
    </header>
  )
}
