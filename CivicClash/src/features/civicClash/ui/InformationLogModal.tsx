import React from 'react'
import type { InformationEntry } from '../network/milestone2Types.ts'

interface InformationLogModalProps {
  entries: InformationEntry[]
  onClose: () => void
}

export const InformationLogModal: React.FC<InformationLogModalProps> = ({
  entries,
  onClose
}) => {
  const hasContradiction =
    entries.some((e) => e.id === 'info_priya') && entries.some((e) => e.id === 'info_false_lead')

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-dialogue-window dossier-window" onClick={(e) => e.stopPropagation()}>
        <div className="cc-dialogue-header">
          <div>
            <span className="cc-dossier-kicker">CIVIC CASE FILE & EVIDENCE</span>
            <h2 className="cc-npc-name">Incident Information Log [I]</h2>
          </div>
          <button className="cc-close-x" onClick={onClose}>✕</button>
        </div>

        {/* Contradiction Warning Banner if Saboteur planted false lead */}
        {hasContradiction && (
          <div className="cc-contradiction-alert">
            <span className="cc-alert-icon">⚠️</span>
            <div className="cc-alert-text">
              <strong>CONTRADICTORY EVIDENCE DETECTED:</strong>
              <p>Priya observed a fleeing dark sedan (DL-04-C***), but an anonymous rumor mentions a green auto. Cross-reference with Dhaba CCTV to establish verified truth!</p>
            </div>
          </div>
        )}

        <div className="cc-information-list">
          {entries.length === 0 ? (
            <div className="cc-empty-info">No information collected yet. Interview witnesses or inspect CCTV!</div>
          ) : (
            entries.map((entry) => {
              const isHigh = entry.reliability === 'HIGH'
              const isMed = entry.reliability === 'MEDIUM'

              return (
                <div key={entry.id} className="cc-info-card">
                  <div className="cc-info-header">
                    <strong className="cc-info-title">{entry.title}</strong>
                    <div className="cc-info-tags">
                      <span className={`cc-reliability-badge ${isHigh ? 'high' : isMed ? 'med' : 'low'}`}>
                        {entry.reliability} RELIABILITY
                      </span>
                      <span className={`cc-verified-badge ${entry.verified ? 'verified' : 'unverified'}`}>
                        {entry.verified ? '✓ VERIFIED' : '⚠️ UNVERIFIED'}
                      </span>
                    </div>
                  </div>

                  <p className="cc-info-desc">{entry.description}</p>

                  <div className="cc-info-footer">
                    <span className="cc-info-source">SOURCE: <strong>{entry.source}</strong></span>
                    <span className="cc-info-time">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="cc-casefile-footer">
          <span className="cc-footer-note">Press [I] or [ESC] to close dossier</span>
          <button className="cc-action-btn primary small" onClick={onClose}>
            Close Log
          </button>
        </div>
      </div>
    </div>
  )
}

