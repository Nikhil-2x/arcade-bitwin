import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { getFactById } from '../data/facts.ts'

export const RescuerHUD: React.FC<{
  store: CivicClashStore
  onOpenCaseFile: () => void
}> = ({ store, onOpenCaseFile }) => {
  const {
    rescuer,
    rescueChain,
    raiseVoiceCooldown,
    readRoomCooldown,
    rescuerRaiseVoice,
    rescuerReadRoom,
    rescuerPlaceCone,
    language
  } = store

  return (
    <aside className="cc-rescuer-hud">
      {/* 1. Rescue Chain Checklist */}
      <div className="cc-chain-card">
        <div className="cc-card-title">
          <span>{language === 'hi' ? 'बचाव श्रृंखला' : 'RESCUE CHAIN'}</span>
          <span className="cc-chain-counter">
            {rescueChain.filter((s) => s.completed).length}/5
          </span>
        </div>
        <div className="cc-chain-steps">
          {rescueChain.map((step) => (
            <div
              key={step.id}
              className={`cc-chain-step ${step.completed ? 'completed' : ''}`}
            >
              <span className="cc-step-badge">
                {step.completed ? '✓' : step.stepNumber}
              </span>
              <div className="cc-step-info">
                <span className="cc-step-name">
                  {language === 'hi' ? step.titleHi : step.title}
                </span>
                <span className="cc-step-desc">
                  {language === 'hi' ? step.instructionHi : step.instruction}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Composure Meter & Cones */}
      <div className="cc-resource-panel">
        <div className="cc-meter-group">
          <div className="cc-meter-label">
            <span>{language === 'hi' ? 'धैर्य व संयम' : 'COMPOSURE'}</span>
            <span>{Math.round(rescuer.composure)}%</span>
          </div>
          <div className="cc-meter-bar">
            <div
              className="cc-meter-fill composure"
              style={{ width: `${rescuer.composure}%` }}
            />
          </div>
        </div>

        <div className="cc-cones-indicator">
          <span className="cc-cones-label">
            {language === 'hi' ? 'चेतावनी कोन:' : 'CONES:'}
          </span>
          <div className="cc-cones-icons">
            {[1, 2, 3].map((num) => (
              <span
                key={num}
                className={`cc-cone-icon ${num <= rescuer.conesRemaining ? 'available' : 'used'}`}
              >
                ⚠️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Action Hotkeys */}
      <div className="cc-hotkeys-row">
        <button
          className={`cc-hotkey-btn ${raiseVoiceCooldown > 0 || rescuer.composure < 25 ? 'disabled' : ''}`}
          onClick={rescuerRaiseVoice}
          title="Raise Voice to clear Crowd Fog (-15 Hesitation within 6 tiles)"
        >
          <kbd className="cc-kbd">Q</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'आवाज उठाएं' : 'RAISE VOICE'}
          </span>
          {raiseVoiceCooldown > 0 && <span className="cc-cd">{raiseVoiceCooldown}s</span>}
        </button>

        <button
          className={`cc-hotkey-btn ${readRoomCooldown > 0 || rescuer.composure < 15 ? 'disabled' : ''}`}
          onClick={rescuerReadRoom}
          title="Read the Room: Reveals Hesitation % and fears for 4s"
        >
          <kbd className="cc-kbd">R</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'माहौल परखें' : 'READ ROOM'}
          </span>
          {readRoomCooldown > 0 && <span className="cc-cd">{readRoomCooldown}s</span>}
        </button>

        <button
          className={`cc-hotkey-btn ${rescuer.conesRemaining <= 0 ? 'disabled' : ''}`}
          onClick={rescuerPlaceCone}
          title="Deploy Traffic Cone to open emergency corridor"
        >
          <kbd className="cc-kbd">C</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'कोन लगाएं' : 'PLACE CONE'}
          </span>
        </button>

        <button className="cc-hotkey-btn case-file" onClick={onOpenCaseFile}>
          <kbd className="cc-kbd">TAB</kbd>
          <span className="cc-btn-text">
            {language === 'hi' ? 'केस फाइल' : 'CASE FILE'}
          </span>
        </button>
      </div>

      {/* 4. Discovered Fact Cards Hand */}
      <div className="cc-facts-tray">
        <span className="cc-tray-heading">
          {language === 'hi' ? 'आपके कानूनी व प्राथमिक उपचार तथ्य' : 'COLLECTED FACT CARDS (E TO USE)'}
        </span>
        <div className="cc-fact-cards-scroll">
          {rescuer.collectedFactIds.map((factId) => {
            const fact = getFactById(factId)
            if (!fact) return null
            return (
              <div key={fact.id} className="cc-fact-pill" title={fact.why}>
                <span className="cc-fact-code">{fact.source.code}</span>
                <span className="cc-fact-title">
                  {language === 'hi' ? fact.titleHi : fact.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

