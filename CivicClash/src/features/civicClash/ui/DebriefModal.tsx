import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'

export const DebriefModal: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const { level, setPhase, language, roundNumber } = store

  return (
    <div className="cc-modal-backdrop">
      <div className="cc-debrief-window">
        <div className="cc-debrief-header">
          <span className="cc-debrief-badge">POST-ROUND DEBRIEF</span>
          <h1 className="cc-debrief-title">
            {language === 'hi' ? 'वास्तविक जीवन में आपकी सुरक्षा' : 'WHAT ACTUALLY PROTECTS YOU'}
          </h1>
          <p className="cc-debrief-sub">
            {language === 'hi'
              ? 'अफवाहों और कानूनी सच्चाइयों के बीच का अंतर समझिए'
              : 'Knowledge is the shield that defeats fear and misinformation.'}
          </p>
        </div>

        <div className="cc-debrief-cards-grid">
          {level.id === 1 && (
            <>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">⚖️</span>
                <h3 className="cc-lesson-title">Motor Vehicles Act Section 134A</h3>
                <p className="cc-lesson-text">
                  Good Samaritans who assist accident victims in good faith are completely immune from civil or criminal liability. Hospitals cannot demand advance payments or detain you.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">📞</span>
                <h3 className="cc-lesson-title">National Emergency 112 & Anonymity</h3>
                <p className="cc-lesson-text">
                  You are NEVER forced to disclose your name, phone number, or address when calling 112. Anonymous reporting is explicitly protected by Supreme Court guidelines.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">👥</span>
                <h3 className="cc-lesson-title">Bystander Mobilisation Technique</h3>
                <p className="cc-lesson-text">
                  Diffusion of responsibility freezes crowds. Point directly at one person and give them a single clear job ("You in the blue shirt, dial 112 now") to break the crowd fog.
                </p>
              </div>
            </>
          )}

          {level.id === 2 && (
            <>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">💳</span>
                <h3 className="cc-lesson-title">1930 Cyber Fraud Helpline</h3>
                <p className="cc-lesson-text">
                  Dial 1930 within the Golden Hour to place an immediate temporary freeze on defrauded funds across banks and digital payment intermediaries.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">🔒</span>
                <h3 className="cc-lesson-title">UPI PIN is ONLY for Debiting</h3>
                <p className="cc-lesson-text">
                  Entering your UPI PIN or sharing an SMS OTP always sends money OUT of your bank account. You never enter a PIN to receive payments or refunds.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">🛒</span>
                <h3 className="cc-lesson-title">Consumer Protection Act 2019</h3>
                <p className="cc-lesson-text">
                  Selling above printed MRP is illegal. Citizens can file complaints themselves on plain paper or on the e-Jagriti portal without paying an advocate.
                </p>
              </div>
            </>
          )}

          {level.id === 3 && (
            <>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">📝</span>
                <h3 className="cc-lesson-title">Zero FIR Mandate (BNSS Section 173)</h3>
                <p className="cc-lesson-text">
                  Police cannot reject a cognizable crime report by saying "not our jurisdiction". They must register a Zero FIR and transfer it to the concerned station.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">📄</span>
                <h3 className="cc-lesson-title">Free Stamped FIR Copy</h3>
                <p className="cc-lesson-text">
                  Under BNSS Section 173(2), an informant is entitled to receive an official copy of the registered FIR immediately and completely free of cost.
                </p>
              </div>
              <div className="cc-lesson-card">
                <span className="cc-lesson-icon">🏛️</span>
                <h3 className="cc-lesson-title">Escalation to District SP</h3>
                <p className="cc-lesson-text">
                  If a station officer refuses to register your cognizable complaint, write directly by post or email to the Superintendent of Police under BNSS Section 173(4).
                </p>
              </div>
            </>
          )}
        </div>

        <div className="cc-disclaimer-strip">
          <span>
            ⚠ <strong>Legal Disclaimer:</strong> CivicClash: Golden Hour is educational gameplay. Laws and schemes vary by jurisdiction. Always verify with official government sources.
          </span>
        </div>

        <div className="cc-debrief-actions">
          <button
            className="cc-action-btn primary"
            onClick={() => setPhase('quiz')}
          >
            {language === 'hi'
              ? 'पॉप क्विज़ मुकाबला शुरू करें (+50 अंक) →'
              : 'Enter Pop Quiz Showdown (+50 pts each) →'}
          </button>
        </div>
      </div>
    </div>
  )
}

