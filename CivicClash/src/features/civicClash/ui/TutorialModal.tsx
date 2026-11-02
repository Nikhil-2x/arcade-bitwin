import React from 'react'

export const TutorialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-dialogue-window tutorial-window" onClick={(e) => e.stopPropagation()}>
        <div className="cc-dialogue-header">
          <div>
            <span className="cc-dossier-kicker">CIVICCLASH QUICK GUIDE</span>
            <h2 className="cc-npc-name">How to Play & Save a Life in the Golden Hour</h2>
          </div>
          <button className="cc-close-x" onClick={onClose}>✕</button>
        </div>

        <div className="cc-tutorial-content">
          <div className="cc-tutorial-step-card">
            <span className="cc-tutorial-num">STEP 1</span>
            <div className="cc-tutorial-text">
              <h4>Assess Scene & Victim Safely</h4>
              <p>Walk to the injured person on the road and press <strong>[E]</strong> or click them. Check breathing and apply pressure to bleeding. <strong>CRITICAL: Do NOT move or twist the neck/spine!</strong></p>
            </div>
          </div>

          <div className="cc-tutorial-step-card">
            <span className="cc-tutorial-num">STEP 2</span>
            <div className="cc-tutorial-text">
              <h4>Call 112 Emergency Dispatch</h4>
              <p>Either click the red <strong>[📞 CALL 112 DIRECTLY]</strong> button in your top bar, or approach shopkeeper Mr. Sharma, explain <strong>Section 134A Good Samaritan Law</strong>, and tell him to call 112!</p>
            </div>
          </div>

          <div className="cc-tutorial-step-card">
            <span className="cc-tutorial-num">STEP 3</span>
            <div className="cc-tutorial-text">
              <h4>Open the Emergency Ambulance Lane</h4>
              <p>Press <strong>[C]</strong> or click <strong>[⚠️ PLACE CONE]</strong> to set 3 warning cones in the yellow lane so oncoming traffic does not block the arriving ambulance!</p>
            </div>
          </div>

          <div className="cc-tutorial-step-card">
            <span className="cc-tutorial-num">STEP 4</span>
            <div className="cc-tutorial-text">
              <h4>Victim in Care</h4>
              <p>Talk to auto-driver Ravi, explain that helpers cannot be billed, and have him transport the victim, or guide the arriving 108 ambulance!</p>
            </div>
          </div>

          <div className="cc-tutorial-step-card">
            <span className="cc-tutorial-num">STEP 5</span>
            <div className="cc-tutorial-text">
              <h4>Hospital Handover (Core Mission Complete)</h4>
              <p>Walk to the City Hospital Gate at the east end of the road to complete the admission handover under Good Samaritan rights!</p>
            </div>
          </div>

          {/* SABOTEUR OBSTACLES & COUNTER-PLAY INTEL */}
          <div className="cc-saboteur-intel-box">
            <h3 className="cc-intel-title">😈 Watch Out: What Obstacles the Saboteur Creates</h3>
            <div className="cc-obstacle-grid">
              <div className="cc-obstacle-item">
                <span className="cc-obstacle-badge">1. MISINFORMATION</span>
                <p><strong>Whispering Myths:</strong> Saboteur tells bystanders that police will arrest them or seize their cars.</p>
                <span className="cc-counter-pill">💡 Counter: Show Section 134A to reduce fear to 0%</span>
              </div>
              <div className="cc-obstacle-item">
                <span className="cc-obstacle-badge">2. ROADBLOCK</span>
                <p><strong>Blocking Ambulance Lane:</strong> Saboteur drops heavy barricades into the road to delay the ambulance.</p>
                <span className="cc-counter-pill">💡 Counter: Walk up and press [E] to clear roadblock (+30 pts)</span>
              </div>
              <div className="cc-obstacle-item">
                <span className="cc-obstacle-badge">3. KICKING CONES</span>
                <p><strong>Destroying Safety Corridor:</strong> Saboteur kicks down your placed traffic cones.</p>
                <span className="cc-counter-pill">💡 Counter: Press [C] or click Place Cone to replace it</span>
              </div>
              <div className="cc-obstacle-item">
                <span className="cc-obstacle-badge">4. CONFRONTATION</span>
                <p><strong>Expose the Driver:</strong> Walk up to the Saboteur and click them or press [SPACE].</p>
                <span className="cc-counter-pill">💡 Reward: Stuns Saboteur for 8s & lowers crowd fear</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cc-casefile-footer">
          <span className="cc-footer-note">Controls: W A S D to walk (or click anywhere on ground with mouse). Click any entity to interact.</span>
          <button className="cc-action-btn primary small" onClick={onClose}>Got it, Let's Play!</button>
        </div>
      </div>
    </div>
  )
}

