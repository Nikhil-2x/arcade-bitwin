import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { getFactById } from '../data/facts.ts'

export const CaseFileModal: React.FC<{
  store: CivicClashStore
  onClose: () => void
}> = ({ store, onClose }) => {
  const { rescuer, proofTokens, rescueChain, level, language } = store

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-casefile-window" onClick={(e) => e.stopPropagation()}>
        <div className="cc-casefile-header">
          <div>
            <span className="cc-dossier-kicker">
              OFFICIAL CASE DOSSIER · LEVEL {level.id}
            </span>
            <h1 className="cc-casefile-title">
              {language === 'hi' ? level.titleHi : level.title}
            </h1>
          </div>
          <button className="cc-close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cc-casefile-body">
          {/* Column 1: Secured Proof Tokens & Accountability */}
          <div className="cc-casefile-section">
            <h3 className="cc-section-title">
              {language === 'hi' ? 'जमा किए गए साक्ष्य व प्रमाण' : 'SECURED PROOF TOKENS'}
            </h3>
            <div className="cc-tokens-list">
              {proofTokens.map((token) => (
                <div
                  key={token.id}
                  className={`cc-token-item ${token.secured ? 'secured' : 'unsecured'}`}
                >
                  <span className="cc-token-status">
                    {token.secured ? '✓ SECURED' : '⭕ MISSING'}
                  </span>
                  <span className="cc-token-name">
                    {language === 'hi' ? token.titleHi : token.title}
                  </span>
                  <span className="cc-token-desc">
                    {language === 'hi' ? token.descriptionHi : token.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Legal Knowledge Repository */}
          <div className="cc-casefile-section">
            <h3 className="cc-section-title">
              {language === 'hi' ? 'खोजे गए कानूनी व प्राथमिक उपचार तथ्य' : 'DISCOVERED LEGAL FACTS'}
            </h3>
            <div className="cc-facts-dossier-list">
              {rescuer.collectedFactIds.map((fId) => {
                const fact = getFactById(fId)
                if (!fact) return null
                return (
                  <div key={fact.id} className="cc-fact-dossier-card">
                    <div className="cc-dossier-top">
                      <span className="cc-dossier-code">{fact.source.code}</span>
                      <span className="cc-dossier-cat">{fact.category.toUpperCase()}</span>
                    </div>
                    <h4 className="cc-dossier-heading">
                      {language === 'hi' ? fact.titleHi : fact.title}
                    </h4>
                    <p className="cc-dossier-plain">
                      {language === 'hi' ? fact.plainHi : fact.plain}
                    </p>
                    <span className="cc-dossier-why">
                      💡 {language === 'hi' ? fact.whyHi : fact.why}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="cc-casefile-footer">
          <span className="cc-footer-note">
            Press [TAB] or click close to return to the simulation.
          </span>
          <button className="cc-action-btn secondary" onClick={onClose}>
            Back to Match
          </button>
        </div>
      </div>
    </div>
  )
}

