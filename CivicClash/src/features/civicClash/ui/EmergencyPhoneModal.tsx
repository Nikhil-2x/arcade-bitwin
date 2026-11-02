import React, { useState } from 'react'
import { sound } from '../engine/audio.ts'

interface EmergencyPhoneModalProps {
  onDispatch: () => void
  onClose: () => void
}

export const EmergencyPhoneModal: React.FC<EmergencyPhoneModalProps> = ({
  onDispatch,
  onClose
}) => {
  const [isCalling, setIsCalling] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleCall = () => {
    sound.playSiren()
    setIsCalling(true)
    setTimeout(() => {
      setIsCalling(false)
      setIsComplete(true)
      onDispatch()
    }, 1800)
  }

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-dialogue-window phone-window" onClick={(e) => e.stopPropagation()}>
        {/* Terminal Header */}
        <div className="cc-dialogue-header">
          <div>
            <span className="cc-dossier-kicker">CENTRAL EMERGENCY HELPLINE (ERSS 112)</span>
            <h2 className="cc-npc-name">Emergency Call Terminal</h2>
          </div>
          <button className="cc-close-x" onClick={onClose}>✕</button>
        </div>

        <div className="cc-terminal-body">
          {/* Dispatch Info Cards */}
          <div className="cc-terminal-row">
            <span className="cc-terminal-label">INCIDENT TYPE:</span>
            <strong className="cc-terminal-val">Motor Vehicle Collision (Hit-and-Run)</strong>
          </div>

          <div className="cc-terminal-row">
            <span className="cc-terminal-label">GPS LOCATION:</span>
            <strong className="cc-terminal-val">Junction 48 · North Highway Crossroad</strong>
          </div>

          <div className="cc-terminal-row">
            <span className="cc-terminal-label">CASUALTY STATUS:</span>
            <strong className="cc-terminal-val text-red">1 Injured (Arjun, Severe Leg Bleeding)</strong>
          </div>

          <div className="cc-terminal-row law-note">
            <span className="cc-terminal-label">LEGAL PRIVILEGE:</span>
            <span className="cc-terminal-sub">
              Motor Vehicles Act Section 134A: Helper is NOT required to disclose personal identity or pay fees.
            </span>
          </div>

          {/* Action Area */}
          <div className="cc-terminal-action-area">
            {isComplete ? (
              <div className="cc-dispatched-banner">
                <span className="cc-dispatched-icon">🚑</span>
                <div>
                  <strong>112 EMERGENCY DISPATCH CONFIRMED!</strong>
                  <p>Ambulance and traffic unit dispatched to Junction 48.</p>
                </div>
              </div>
            ) : isCalling ? (
              <div className="cc-calling-animation">
                <span className="cc-calling-pulse" />
                <span>CONNECTING TO 112 OPERATOR...</span>
              </div>
            ) : (
              <button className="cc-action-btn emergency large full-width" onClick={handleCall}>
                📞 TRANSMIT EMERGENCY 112 REQUEST
              </button>
            )}
          </div>
        </div>

        <div className="cc-casefile-footer">
          <button className="cc-action-btn ghost small" onClick={onClose}>
            {isComplete ? 'Close Terminal' : 'Cancel Call'}
          </button>
        </div>
      </div>
    </div>
  )
}

