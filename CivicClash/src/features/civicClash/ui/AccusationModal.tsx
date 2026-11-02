import React, { useState } from 'react'
import type { EvidenceCard, DefenseNarrativeCard } from '../network/milestone6Types.ts'
import type { PlayerRole } from '../network/networkTypes.ts'
import './AccusationModal.css'

interface AccusationModalProps {
  role: PlayerRole
  timeRemainingSec: number
  availableEvidence: EvidenceCard[]
  availableDefenseNarratives?: DefenseNarrativeCard[]
  hostName: string
  guestName: string
  hostId: string
  guestId: string
  onSubmitVerdict: (data: {
    suspectId: string
    selectedEvidenceIds: string[]
    counterNarrativeId?: string
  }) => void
}

export const AccusationModal: React.FC<AccusationModalProps> = ({
  role,
  timeRemainingSec,
  availableEvidence,
  availableDefenseNarratives = [],
  hostName,
  guestName,
  hostId,
  guestId,
  onSubmitVerdict
}) => {
  const isRunner = role === 'runner'

  const [selectedSuspect, setSelectedSuspect] = useState<string>('')
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([])
  const [selectedNarrative, setSelectedNarrative] = useState<string>(
    availableDefenseNarratives[0]?.id || ''
  )
  const [isLockedIn, setIsLockedIn] = useState<boolean>(false)

  const toggleEvidence = (id: string) => {
    if (selectedEvidence.includes(id)) {
      setSelectedEvidence(selectedEvidence.filter((e) => e !== id))
    } else {
      if (selectedEvidence.length < 2) {
        setSelectedEvidence([...selectedEvidence, id])
      }
    }
  }

  const handleSubmit = () => {
    setIsLockedIn(true)
    onSubmitVerdict({
      suspectId: selectedSuspect || 'insufficient_evidence',
      selectedEvidenceIds: selectedEvidence,
      counterNarrativeId: isRunner ? undefined : selectedNarrative
    })
  }

  return (
    <div className="cc-modal-backdrop cc-accusation-backdrop">
      <div className="cc-accusation-modal">
        <div className="cc-accusation-header">
          <div className="cc-accusation-badge">
            {isRunner ? '⚖️ FORMAL CIVIC INQUIRY' : '🎭 CRIME INVESTIGATION DEFENSE'}
          </div>
          <h2>SEALED FINAL VERDICT</h2>
          <p className="cc-accusation-subtitle">
            {isRunner
              ? 'Review all gathered evidence and formally identify the individual responsible.'
              : 'Mount a credible defense narrative to deflect suspicion and protect your cover.'}
          </p>
          <div className="cc-accusation-timer">
            ⏱️ Time to Lock Verdict: <strong>{timeRemainingSec}s</strong>
          </div>
        </div>

        {isLockedIn ? (
          <div className="cc-accusation-locked-state">
            <div className="cc-spinner-pulse">🔒</div>
            <h3>VERDICT SEALED & SUBMITTED</h3>
            <p>Your confidential decision is securely locked in the court register.</p>
            <p className="cc-waiting-hint">Awaiting co-participant's sealed verdict...</p>
          </div>
        ) : (
          <div className="cc-accusation-content">
            {isRunner ? (
              <>
                {/* 1. Suspect Selection */}
                <div className="cc-acc-section">
                  <div className="cc-section-label">1. SELECT SUSPECT TO ACCUSE</div>
                  <div className="cc-suspect-grid">
                    <button
                      type="button"
                      className={`cc-suspect-card ${selectedSuspect === hostId ? 'selected' : ''}`}
                      onClick={() => setSelectedSuspect(hostId)}
                    >
                      <div className="cc-suspect-ico">👤</div>
                      <div className="cc-suspect-name">{hostName}</div>
                      <div className="cc-suspect-label">Co-Participant A</div>
                    </button>

                    <button
                      type="button"
                      className={`cc-suspect-card ${selectedSuspect === guestId ? 'selected' : ''}`}
                      onClick={() => setSelectedSuspect(guestId)}
                    >
                      <div className="cc-suspect-ico">👤</div>
                      <div className="cc-suspect-name">{guestName}</div>
                      <div className="cc-suspect-label">Co-Participant B</div>
                    </button>

                    <button
                      type="button"
                      className={`cc-suspect-card ${
                        selectedSuspect === 'insufficient_evidence' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedSuspect('insufficient_evidence')}
                    >
                      <div className="cc-suspect-ico">❓</div>
                      <div className="cc-suspect-name">Insufficient Evidence</div>
                      <div className="cc-suspect-label">Cannot Confidently Accuse</div>
                    </button>
                  </div>
                </div>

                {/* 2. Evidence Selection */}
                <div className="cc-acc-section">
                  <div className="cc-section-label">
                    2. ATTACH EVIDENCE (SELECT UP TO 2 PIECES)
                    <span className="cc-ev-counter">
                      {selectedEvidence.length}/2 Selected
                    </span>
                  </div>

                  {availableEvidence.length === 0 ? (
                    <div className="cc-no-evidence-box">
                      No verified evidence cards collected during active response.
                    </div>
                  ) : (
                    <div className="cc-evidence-grid">
                      {availableEvidence.map((ev) => {
                        const isSelected = selectedEvidence.includes(ev.id)
                        return (
                          <div
                            key={ev.id}
                            className={`cc-evidence-card ${isSelected ? 'selected' : ''} ${
                              ev.isContradiction ? 'contradiction' : ''
                            }`}
                            onClick={() => toggleEvidence(ev.id)}
                          >
                            <div className="cc-ev-header">
                              <span className="cc-ev-source">📌 {ev.source}</span>
                              <span className={`cc-ev-badge ${ev.reliability.toLowerCase()}`}>
                                {ev.reliability} RELIABILITY
                              </span>
                            </div>
                            <div className="cc-ev-title">{ev.title}</div>
                            <div className="cc-ev-desc">{ev.description}</div>
                            <div className="cc-ev-footer">
                              {isSelected ? '✓ ATTACHED' : '+ CLICK TO ATTACH'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Saboteur Defense Options */
              <div className="cc-acc-section">
                <div className="cc-section-label">SELECT YOUR COUNTER-DEFENSE NARRATIVE</div>
                <div className="cc-narrative-grid">
                  {availableDefenseNarratives.map((nar) => {
                    const isSelected = selectedNarrative === nar.id
                    return (
                      <div
                        key={nar.id}
                        className={`cc-narrative-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedNarrative(nar.id)}
                      >
                        <div className="cc-nar-header">
                          <span className="cc-nar-credibility">
                            🛡️ {nar.credibility} CREDIBILITY
                          </span>
                        </div>
                        <div className="cc-nar-title">{nar.title}</div>
                        <div className="cc-nar-desc">{nar.description}</div>
                        <div className="cc-nar-footer">
                          {isSelected ? '✓ CHOSEN ALIBI' : 'SELECT NARRATIVE'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="cc-accusation-footer">
              <button
                type="button"
                className="cc-lock-verdict-btn"
                disabled={isRunner && !selectedSuspect}
                onClick={handleSubmit}
              >
                🔒 LOCK IN SEALED VERDICT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
