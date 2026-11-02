import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { getFactById } from '../data/facts.ts'

export const DialogueModal: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const {
    activeWitnessId,
    witnesses,
    rescuer,
    rescuerCloseDialogue,
    rescuerAnswerConcern,
    rescuerAssignTask,
    rescuerCall112Directly,
    dialogueFeedback,
    language
  } = store

  if (!activeWitnessId) return null
  const witness = witnesses.find((w) => w.id === activeWitnessId)
  if (!witness) return null

  const activeConcern = witness.concerns[witness.activeConcernIndex] || 'fears_police'
  const isWilling = witness.hesitation <= 30

  // Matching best law for this concern
  let bestFactId = 'L1-F2' // default MV Act 134A / police anonymity
  let concernTitle = 'Fear of Police Harassment'
  let concernTitleHi = 'पुलिस पूछताछ और थाने के चक्कर का डर'
  let concernQuote = "If I call the police or help him, they will detain me for hours and drag me to court for months!"
  let concernQuoteHi = "अगर मैंने 112 मिलाया या इसे हाथ लगाया तो पुलिस मुझे ही पकड़ लेगी और महीनों चक्कर लगवाएगी!"

  if (activeConcern === 'fears_blame') {
    bestFactId = 'L1-F1'
    concernTitle = 'Fear of Being Blamed for Death'
    concernTitleHi = 'पीड़ित की मृत्यु का दोष मढ़ने का डर'
    concernQuote = "If this injured man dies in my vehicle, his family will file a murder case against me!"
    concernQuoteHi = "अगर मेरी गाड़ी में इसने दम तोड़ दिया तो इसके घरवाले मुझ पर ही केस कर देंगे!"
  } else if (activeConcern === 'fears_bill') {
    bestFactId = 'L1-F4'
    concernTitle = 'Fear of Hospital Deposit Demands'
    concernTitleHi = 'अस्पताल द्वारा अग्रिम जमा राशि मांगने का डर'
    concernQuote = "Private hospitals detain the helper and demand ₹50,000 cash before admitting the patient!"
    concernQuoteHi = "अस्पताल ले जाने वाले को ही पकड़ लेते हैं और 50,000 रुपये नकद जमा करने को कहते हैं!"
  } else if (activeConcern === 'assumes_others_called') {
    bestFactId = 'L1-F8'
    concernTitle = 'Diffusion of Responsibility (Crowd Fog)'
    concernTitleHi = 'भीड़ का संकोच: कोई और फोन कर चुका होगा'
    concernQuote = "Look at all these people standing around! Surely someone else has already called 112."
    concernQuoteHi = "इतने सारे लोग खड़े हैं, किसी न किसी ने तो 112 पर फोन कर ही दिया होगा।"
  } else if (activeConcern === 'wants_to_film') {
    bestFactId = 'L1-F8'
    concernTitle = 'Recording Social Media Video First'
    concernTitleHi = 'पहले सोशल मीडिया के लिए वीडियो बनाने की जिद'
    concernQuote = "Let me finish recording this viral video for Instagram first! Calling 112 won't trend."
    concernQuoteHi = "पहले मुझे वीडियो बनाने दो! सोशल मीडिया पर पोस्ट करूंगी तभी लोगों को पता चलेगा।"
  } else if (activeConcern === 'unsure_of_law') {
    bestFactId = 'L1-F9'
    concernTitle = 'Belief that CCTV Footage is Strictly Confidential'
    concernTitleHi = 'सीसीटीवी फुटेज गोपनीय होने का भ्रम'
    concernQuote = "CCTV recordings are confidential property; sharing them will get my dhaba sealed!"
    concernQuoteHi = "दुकान का सीसीटीवी दिखाना गैरकानूनी है, पुलिस मेरी दुकान सील कर देगी!"
  }

  const bestFact = getFactById(bestFactId)

  return (
    <div className="cc-modal-backdrop" onClick={rescuerCloseDialogue}>
      <div className="cc-dialogue-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cc-dialogue-header">
          <div className="cc-npc-profile">
            <div
              className="cc-npc-avatar-circle"
              style={{ backgroundColor: witness.avatarColor }}
            >
              👤
            </div>
            <div>
              <h2 className="cc-npc-name">
                {language === 'hi' ? witness.nameHi : witness.name}
              </h2>
              <span className="cc-npc-sub">
                {language === 'hi' ? witness.roleDescriptionHi : witness.roleDescription}
              </span>
            </div>
          </div>

          <div className="cc-hesitation-meter">
            <span className="cc-hesitation-label">
              {language === 'hi' ? 'संकोच व हिचकिचाहट:' : 'HESITATION LEVEL:'}
            </span>
            <div className="cc-hesitation-bar">
              <div
                className={`cc-hesitation-fill ${witness.hesitation <= 30 ? 'willing' : witness.hesitation >= 70 ? 'silent' : 'wavering'}`}
                style={{ width: `${witness.hesitation}%` }}
              />
            </div>
            <span className="cc-hesitation-status">
              {isWilling ? '🟢 READY TO HELP!' : `🔴 ${witness.hesitation}% (Hesitant)`}
            </span>
          </div>

          <button className="cc-close-x" onClick={rescuerCloseDialogue}>
            ✕
          </button>
        </div>

        {/* NPC's Spoken Concern Quote */}
        <div className="cc-speech-bubble">
          <div className="cc-concern-tag-badge">
            ⚠ {language === 'hi' ? concernTitleHi : concernTitle}
          </div>
          <p className="cc-bubble-text">
            “{language === 'hi' ? concernQuoteHi : concernQuote}”
          </p>
        </div>

        {/* Feedback Alert if fact was just played */}
        {dialogueFeedback && (
          <div
            className={`cc-dialogue-alert ${dialogueFeedback.isSuccess ? 'success' : 'error'}`}
          >
            <div className="cc-alert-heading">
              <span>{dialogueFeedback.isSuccess ? '✓ REAL INDIAN LAW VERIFIED' : '⚠ NOT ADDRESSING THIS FEAR'}</span>
              {dialogueFeedback.sourceCode && (
                <span className="cc-alert-source">{dialogueFeedback.sourceCode}</span>
              )}
            </div>
            <p className="cc-alert-body">{dialogueFeedback.message}</p>
          </div>
        )}

        {/* SCENARIO A: WITNESS IS WILLING (HESITATION <= 30%) -> DIRECT ACTION! */}
        {isWilling ? (
          <div className="cc-action-selection-box">
            <div className="cc-convinced-banner">
              <span className="cc-convinced-icon">🤝</span>
              <div>
                <h4 className="cc-convinced-title">
                  {witness.name} {language === 'hi' ? 'सहमत हो गए हैं!' : 'is Convinced & Ready to Act!'}
                </h4>
                <p className="cc-convinced-sub">
                  {language === 'hi'
                    ? 'उन्हें सीधे एक स्पष्ट जिम्मेदारी सौंपें:'
                    : 'Assign them a specific task to immediately progress the rescue:'}
                </p>
              </div>
            </div>

            <div className="cc-immediate-tasks-row">
              {/* Task Option 1: Call 112 Dispatch */}
              <button
                className="cc-big-task-btn call-dispatch"
                onClick={() => {
                  rescuerAssignTask(witness.id, 'call_112')
                  rescuerCloseDialogue()
                }}
              >
                <span className="cc-task-btn-icon">📱</span>
                <div className="cc-task-btn-text">
                  <strong>Tell {witness.name}: "Call 112 Dispatch Now!"</strong>
                  <span>Completes Step 2 · Emergency police & 108 ambulance dispatched!</span>
                </div>
              </button>

              {/* Task Option 2: Guide Ambulance or Drive */}
              {witness.id === 'w2' ? (
                <button
                  className="cc-big-task-btn drive-auto"
                  onClick={() => {
                    rescuerAssignTask(witness.id, 'drive_victim')
                    rescuerCloseDialogue()
                  }}
                >
                  <span className="cc-task-btn-icon">🚗</span>
                  <div className="cc-task-btn-text">
                    <strong>Tell Ravi: "Drive Victim in your Auto-Rickshaw!"</strong>
                    <span>Completes Step 4 · Transports victim safely under s.134A immunity!</span>
                  </div>
                </button>
              ) : witness.id === 'w4' ? (
                <button
                  className="cc-big-task-btn secure-cctv"
                  onClick={() => {
                    rescuerAssignTask(witness.id, 'secure_cctv')
                    rescuerCloseDialogue()
                  }}
                >
                  <span className="cc-task-btn-icon">📹</span>
                  <div className="cc-task-btn-text">
                    <strong>Tell Ganesh: "Secure Dhaba CCTV Recording!"</strong>
                    <span>Secures Hit-and-Run video proof token before overwrite!</span>
                  </div>
                </button>
              ) : (
                <button
                  className="cc-big-task-btn guide-amb"
                  onClick={() => {
                    rescuerAssignTask(witness.id, 'guide_ambulance')
                    rescuerCloseDialogue()
                  }}
                >
                  <span className="cc-task-btn-icon">🚨</span>
                  <div className="cc-task-btn-text">
                    <strong>Tell {witness.name}: "Guide the Arriving Ambulance!"</strong>
                    <span>Stands at intersection to wave emergency vehicles into lane!</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* SCENARIO B: WITNESS IS HESITANT -> CLEAR, INTUITIVE CHOICES */
          <div className="cc-dialogue-choices-panel">
            <span className="cc-choices-heading">
              {language === 'hi'
                ? 'साक्षी का डर दूर करने के लिए क्या कहेंगे?'
                : 'WHAT WILL YOU SAY TO OVERCOME THEIR HESITATION?'}
            </span>

            {/* CHOICE 1: THE RECOMMENDED REAL STATUTORY LAW */}
            {bestFact && (
              <button
                className="cc-law-choice-card recommended"
                onClick={() => rescuerAnswerConcern(witness.id, bestFact.id)}
              >
                <div className="cc-choice-card-header">
                  <span className="cc-recommended-badge">⭐ RECOMMENDED LEGAL SHIELD</span>
                  <span className="cc-choice-law-code">{bestFact.source.code}</span>
                </div>
                <h4 className="cc-choice-card-title">
                  {language === 'hi' ? bestFact.titleHi : bestFact.title}
                </h4>
                <p className="cc-choice-card-plain">
                  "{language === 'hi' ? bestFact.plainHi : bestFact.plain}"
                </p>
                <span className="cc-choice-card-impact">
                  🎯 <strong>Impact:</strong> {language === 'hi' ? 'संकोच 0% हो जाएगा और साक्षी मदद करेगा!' : 'Dispels fear immediately (-50% hesitation) & grants Resolute immunity!'}
                </span>
              </button>
            )}

            {/* CHOICE 2 & 3: TONE RESPONSES */}
            <div className="cc-tone-choices-row">
              <button
                className="cc-tone-choice-btn empathy"
                onClick={() => rescuerAnswerConcern(witness.id, undefined, 'empathy')}
              >
                <span className="cc-tone-icon">🤝</span>
                <div>
                  <strong>{language === 'hi' ? 'सहानुभूति व ढांढस' : 'Show Empathy & Stay Beside Them'}</strong>
                  <span>"I understand you're scared, but you won't be alone. We'll handle this together." (-10% fear)</span>
                </div>
              </button>

              <button
                className="cc-tone-choice-btn pressure"
                onClick={() => rescuerAnswerConcern(witness.id, undefined, 'pressure')}
              >
                <span className="cc-tone-icon">⚠️</span>
                <div>
                  <strong>{language === 'hi' ? 'दबाव व गुस्सा (गलत तरीका)' : 'Confront & Pressure Them'}</strong>
                  <span>"Why are you standing there doing nothing?! You have to help!" (+15% fear, Annoyed)</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Direct Call Alternative Helper Banner */}
        <div className="cc-dialogue-footer-helper">
          <span>
            💡 <strong>Want to report right away yourself?</strong> You can also dial emergency services directly:
          </span>
          <button
            className="cc-direct-call-pill-btn"
            onClick={() => {
              rescuerCloseDialogue()
              rescuerCall112Directly()
            }}
          >
            📞 Call 112 Directly on Speakerphone
          </button>
        </div>
      </div>
    </div>
  )
}
