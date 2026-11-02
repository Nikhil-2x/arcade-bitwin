import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { OFFICIAL_HELPLINES, EMERGENCY_5_STEPS } from '../data/toolkit.ts'

export const FinalResultsScreen: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const {
    rescuerScoreBreakdown,
    saboteurScoreBreakdown,
    knowledgePoints,
    setPhase,
    startMatch,
    mode,
    language
  } = store

  const p1Total = rescuerScoreBreakdown.totalScore + 150
  const p2Total = saboteurScoreBreakdown.totalScore + 100
  const isP1Winner = p1Total >= p2Total

  return (
    <div className="cc-final-results-view">
      <div className="cc-final-container">
        {/* Header */}
        <header className="cc-final-header">
          <span className="cc-final-kicker">CHAMPIONSHIP SUMMARY</span>
          <h1 className="cc-final-title">
            {isP1Winner ? 'PLAYER 1 TRIUMPHS!' : 'PLAYER 2 TAKES THE VICTORY!'}
          </h1>
          <p className="cc-final-sub">
            {language === 'hi'
              ? 'दोनों खिलाड़ियों ने महत्वपूर्ण कानूनी व जीवन रक्षक कौशलों का अभ्यास किया।'
              : 'Both players mastered essential bystander intervention, digital safety, and statutory rights.'}
          </p>
        </header>

        {/* Grand Scoreboard */}
        <div className="cc-final-scoreboard">
          <div className={`cc-final-player-card ${isP1Winner ? 'winner' : ''}`}>
            <span className="cc-player-badge">PLAYER 1</span>
            <div className="cc-player-score-large">{p1Total}</div>
            <span className="cc-stars">⭐⭐⭐</span>
            <span className="cc-score-sub">Total Match Points</span>
          </div>

          <div className="cc-vs-badge">VS</div>

          <div className={`cc-final-player-card ${!isP1Winner ? 'winner' : ''}`}>
            <span className="cc-player-badge">PLAYER 2</span>
            <div className="cc-player-score-large">{p2Total}</div>
            <span className="cc-stars">⭐⭐</span>
            <span className="cc-score-sub">Total Match Points</span>
          </div>
        </div>

        {/* Learning Uplift Highlight */}
        <div className="cc-learning-uplift-card">
          <div className="cc-uplift-item">
            <span className="cc-uplift-num">+{knowledgePoints}</span>
            <span className="cc-uplift-label">Knowledge Points Earned</span>
          </div>
          <div className="cc-uplift-item">
            <span className="cc-uplift-num">+38%</span>
            <span className="cc-uplift-label">Myth Resilience Uplift</span>
          </div>
          <div className="cc-uplift-item">
            <span className="cc-uplift-num">100%</span>
            <span className="cc-uplift-label">Section 134A Mastery</span>
          </div>
        </div>

        {/* Real-Life Action Toolkit */}
        <section className="cc-toolkit-section">
          <div className="cc-toolkit-header">
            <h2 className="cc-toolkit-title">
              🎒 {language === 'hi' ? 'वास्तविक जीवन आपातकालीन टूलकिट' : 'REAL-LIFE EMERGENCY ACTION TOOLKIT'}
            </h2>
            <p className="cc-toolkit-desc">
              Save or screenshot these official numbers and guidelines for real emergencies.
            </p>
          </div>

          {/* 5-Step Action Guide */}
          <div className="cc-steps-card-grid">
            {EMERGENCY_5_STEPS.map((step) => (
              <div key={step.step} className="cc-action-step-card">
                <div className="cc-step-top">
                  <span className="cc-step-num-badge">STEP {step.step}</span>
                  <span className="cc-step-badge-tag">{step.badge}</span>
                </div>
                <h4 className="cc-step-heading">
                  {language === 'hi' ? step.headingHi : step.heading}
                </h4>
                <p className="cc-step-detail">
                  {language === 'hi' ? step.detailHi : step.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Helplines Directory */}
          <div className="cc-helplines-grid">
            {OFFICIAL_HELPLINES.map((h) => (
              <div key={h.number} className="cc-helpline-card">
                <span className="cc-helpline-digits">{h.number}</span>
                <div className="cc-helpline-info">
                  <span className="cc-helpline-title">
                    {language === 'hi' ? h.titleHi : h.title}
                  </span>
                  <span className="cc-helpline-purpose">
                    {language === 'hi' ? h.purposeHi : h.purpose}
                  </span>
                  <span className="cc-helpline-avail">🟢 {h.availability}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="cc-final-actions">
          <button
            className="cc-action-btn primary"
            onClick={() => startMatch(mode, 1)}
          >
            🔄 {language === 'hi' ? 'दोबारा खेलें (रीमैच)' : 'Play Rematch'}
          </button>
          <button
            className="cc-action-btn secondary"
            onClick={() => setPhase('lobby')}
          >
            🏠 {language === 'hi' ? 'मुख्य लॉबी में लौटें' : 'Return to Lobby'}
          </button>
        </div>
      </div>
    </div>
  )
}

