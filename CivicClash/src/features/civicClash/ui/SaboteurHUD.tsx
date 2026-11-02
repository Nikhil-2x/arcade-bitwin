import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { MYTH_CARDS } from '../data/myths.ts'

export const SaboteurHUD: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const {
    saboteur,
    level,
    saboteurDistractCooldown,
    saboteurShiftCooldown,
    saboteurDistract,
    saboteurShiftBarrier,
    saboteurBlendIn,
    saboteurSlipAway,
    language
  } = store

  // Available myths for this level
  const mythCards = MYTH_CARDS.filter((m) => m.level === level.id).slice(0, 3)

  return (
    <aside className="cc-saboteur-hud">
      {/* 1. Influence & Exposure Bars */}
      <div className="cc-resource-panel saboteur">
        <div className="cc-meter-group">
          <div className="cc-meter-label">
            <span>{language === 'hi' ? 'प्रभाव शक्ति' : 'INFLUENCE'}</span>
            <span>{Math.round(saboteur.influence)}%</span>
          </div>
          <div className="cc-meter-bar">
            <div
              className="cc-meter-fill influence"
              style={{ width: `${saboteur.influence}%` }}
            />
          </div>
        </div>

        <div className="cc-meter-group">
          <div className="cc-meter-label">
            <span>
              {language === 'hi' ? 'पहचान जोखिम' : 'EXPOSURE RISK'}
              {saboteur.isCalledOut && ' 🚨 CALLED OUT!'}
            </span>
            <span className={saboteur.exposure > 70 ? 'danger-text' : ''}>
              {Math.round(saboteur.exposure)}%
            </span>
          </div>
          <div className="cc-meter-bar">
            <div
              className="cc-meter-fill exposure"
              style={{ width: `${saboteur.exposure}%` }}
            />
          </div>
        </div>

        <div className="cc-stats-row">
          <div className="cc-stat-chip">
            <span className="cc-stat-label">
              {language === 'hi' ? 'फुसफुसाहट:' : 'WHISPERS:'}
            </span>
            <span className="cc-stat-val">{saboteur.whispersRemaining}/10</span>
          </div>
          <div className="cc-stat-chip">
            <span className="cc-stat-label">
              {language === 'hi' ? 'अफवाह टोकन:' : 'RUMOR TOKENS:'}
            </span>
            <span className="cc-stat-val">{saboteur.rumorTokens}/3</span>
          </div>
        </div>
      </div>

      {/* 2. Myth Hand (Active Deceptions) */}
      <div className="cc-myths-tray">
        <span className="cc-tray-heading">
          {language === 'hi' ? 'झूठ व भ्रामक प्रचार (E पास जाकर)' : 'ACTIVE MYTH CARDS (APPROACH & E)'}
        </span>
        <div className="cc-myth-cards-list">
          {mythCards.map((myth) => (
            <div key={myth.id} className="cc-myth-card">
              <div className="cc-myth-top">
                <span className="cc-myth-title">
                  {language === 'hi' ? myth.titleHi : myth.title}
                </span>
                <span className="cc-myth-cost">⚡ {myth.influenceCost}</span>
              </div>
              <p className="cc-myth-whisper">
                "{language === 'hi' ? myth.whisperTextHi : myth.whisperText}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Saboteur Action Abilities */}
      <div className="cc-hotkeys-row saboteur">
        <button
          className={`cc-hotkey-btn ${saboteurDistractCooldown > 0 || saboteur.influence < 25 ? 'disabled' : ''}`}
          onClick={saboteurDistract}
          title="Stage Distraction: Halts nearby tasks for 5s"
        >
          <kbd className="cc-kbd">F</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'हंगामा करें' : 'DISTRACT'}
          </span>
          {saboteurDistractCooldown > 0 && <span className="cc-cd">{saboteurDistractCooldown}s</span>}
        </button>

        <button
          className={`cc-hotkey-btn ${saboteurShiftCooldown > 0 || saboteur.influence < 15 ? 'disabled' : ''}`}
          onClick={() => saboteurShiftBarrier('env_ambulance_lane')}
          title="Shift Barrier: Obstruct ambulance lane or pathways"
        >
          <kbd className="cc-kbd">G</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'रास्ता रोकें' : 'SHIFT BARRIER'}
          </span>
          {saboteurShiftCooldown > 0 && <span className="cc-cd">{saboteurShiftCooldown}s</span>}
        </button>

        <button
          className={`cc-hotkey-btn ${saboteur.blendInActiveTimer > 0 ? 'disabled' : ''}`}
          onClick={saboteurBlendIn}
          title="Blend In: Conceal identity and reduce exposure"
        >
          <kbd className="cc-kbd">V</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'भीड़ में छिपें' : 'BLEND IN'}
          </span>
        </button>

        <button
          className="cc-hotkey-btn escape"
          onClick={saboteurSlipAway}
          title="Slip Away: Escape via exit point"
        >
          <kbd className="cc-kbd">B</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'फरार हों' : 'SLIP AWAY'}
          </span>
        </button>
      </div>
    </aside>
  )
}

