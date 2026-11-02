import React from 'react'
import type { CivicDebriefData } from '../network/milestone6Types.ts'
import './CivicDebriefModal.css'

interface CivicDebriefModalProps {
  debriefData: CivicDebriefData
  onClose: () => void
}

export const CivicDebriefModal: React.FC<CivicDebriefModalProps> = ({ debriefData, onClose }) => {
  return (
    <div className="cc-modal-backdrop cc-debrief-backdrop">
      <div className="cc-debrief-modal">
        <div className="cc-debrief-header">
          <div className="cc-debrief-pill">🏛️ CIVIC EDUCATION DEBRIEF</div>
          <h2>{debriefData.levelTitle}</h2>
          <p className="cc-debrief-sub">
            Practical emergency response lessons and applicable Indian legal frameworks.
          </p>
        </div>

        <div className="cc-debrief-body">
          {/* What was done right */}
          <div className="cc-debrief-card correct">
            <div className="cc-card-hdr">
              <span className="cc-hdr-ico">✓</span>
              <h4>WHAT YOU DID CORRECTLY</h4>
            </div>
            <ul>
              {debriefData.whatYouDidRight.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* What could improve */}
          <div className="cc-debrief-card improve">
            <div className="cc-card-hdr">
              <span className="cc-hdr-ico">⚠️</span>
              <h4>WHAT COULD BE IMPROVED</h4>
            </div>
            <ul>
              {debriefData.whatToImprove.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* The Real-World Takeaway */}
          <div className="cc-debrief-card takeaway">
            <div className="cc-card-hdr">
              <span className="cc-hdr-ico">📜</span>
              <h4>THE REAL-WORLD CIVIC TAKEAWAY</h4>
            </div>
            <p className="cc-takeaway-text">{debriefData.realWorldTakeaway}</p>
            <div className="cc-guidance-ref">
              <strong>Official Guidance:</strong> {debriefData.officialGuidanceRef}
            </div>
          </div>
        </div>

        <div className="cc-debrief-disclaimer">
          Note: This educational simulation is intended for public safety awareness and does not
          constitute formal legal counsel or professional medical triage certification.
        </div>

        <div className="cc-debrief-footer">
          <button type="button" className="cc-debrief-btn" onClick={onClose}>
            CONTINUE MATCH →
          </button>
        </div>
      </div>
    </div>
  )
}
