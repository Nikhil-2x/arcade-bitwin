import React from 'react'
import type { DialogueSession, DialogueOption } from '../network/milestone2Types.ts'
import { sound } from '../engine/audio.ts'

interface DialogueModalM2Props {
  session: DialogueSession
  statusMessage?: string
  sabotageEnergy: number
  onSelectOption: (optionId: string) => void
  onClose: () => void
}

export const DialogueModalM2: React.FC<DialogueModalM2Props> = ({
  session,
  statusMessage,
  sabotageEnergy,
  onSelectOption,
  onClose
}) => {
  const handleSelect = (opt: DialogueOption) => {
    if (opt.sabotageEnergyCost && sabotageEnergy < opt.sabotageEnergyCost) {
      sound.playError()
      return
    }
    sound.playClick()
    onSelectOption(opt.id)
  }

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-dialogue-window m2-dialogue" onClick={(e) => e.stopPropagation()}>
        {/* Header with NPC info & meters */}
        <div className="cc-dialogue-header">
          <div className="cc-npc-profile">
            <div className="cc-dialogue-avatar">
              {session.npcId === 'npc_arjun' ? '🤕' : session.npcId === 'npc_ramesh' ? '👳' : session.npcId === 'npc_priya' ? '👩‍🎓' : session.npcId === 'npc_amit' ? '🚶' : '👮'}
            </div>
            <div>
              <h2 className="cc-npc-name">{session.npcName}</h2>
              <span className="cc-npc-role-tag">{session.npcRole}</span>
            </div>
          </div>

          {/* Psychological Meters */}
          <div className="cc-psyche-meters">
            <div className="cc-meter-chip trust" title="Trust Level (0-100)">
              <span className="cc-meter-name">TRUST</span>
              <div className="cc-meter-track">
                <div className="cc-meter-bar trust" style={{ width: `${session.trust}%` }} />
              </div>
              <span className="cc-meter-num">{session.trust}%</span>
            </div>

            <div className="cc-meter-chip fear" title="Fear Level (0-100)">
              <span className="cc-meter-name">FEAR</span>
              <div className="cc-meter-track">
                <div className="cc-meter-bar fear" style={{ width: `${session.fear}%` }} />
              </div>
              <span className="cc-meter-num">{session.fear}%</span>
            </div>

            <div className="cc-meter-chip coop" title="Cooperation Level (0-100)">
              <span className="cc-meter-name">COOP</span>
              <div className="cc-meter-track">
                <div className="cc-meter-bar coop" style={{ width: `${session.cooperation}%` }} />
              </div>
              <span className="cc-meter-num">{session.cooperation}%</span>
            </div>
          </div>

          <button className="cc-close-x" onClick={onClose}>✕</button>
        </div>

        {/* NPC Dialogue Prompt Speech Bubble */}
        <div className="cc-speech-bubble">
          <p className="cc-speech-text">{session.promptText}</p>
        </div>

        {/* Action Status Feedback */}
        {statusMessage && (
          <div className="cc-dialogue-feedback-pill">
            <span>✨ {statusMessage}</span>
          </div>
        )}

        {/* Response Choices */}
        <div className="cc-choices-section">
          <span className="cc-choices-kicker">CHOOSE YOUR RESPONSE:</span>
          <div className="cc-choices-list">
            {session.options.map((opt) => {
              const isCostly = !!opt.sabotageEnergyCost
              const cantAfford = isCostly && sabotageEnergy < (opt.sabotageEnergyCost || 0)

              return (
                <button
                  key={opt.id}
                  className={`cc-dialogue-choice-btn ${opt.role} ${cantAfford ? 'disabled' : ''}`}
                  disabled={cantAfford}
                  onClick={() => handleSelect(opt)}
                >
                  <div className="cc-choice-main">
                    <span className="cc-choice-text">{opt.text}</span>
                    {opt.consequenceHint && (
                      <small className="cc-choice-hint">💡 {opt.consequenceHint}</small>
                    )}
                  </div>

                  {isCostly && (
                    <span className={`cc-energy-cost-badge ${cantAfford ? 'lacking' : ''}`}>
                      ⚡ {opt.sabotageEnergyCost} Energy
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="cc-casefile-footer">
          <span className="cc-footer-note">Press [ESC] to end conversation</span>
          <button className="cc-action-btn ghost small" onClick={onClose}>
            End Conversation
          </button>
        </div>
      </div>
    </div>
  )
}

