import React, { useState } from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { sound } from '../engine/audio.ts'

export const OperatorDialogueModal: React.FC<{
  store: CivicClashStore
  onClose: () => void
}> = ({ store, onClose }) => {
  const { language, complete112Dispatch } = store
  const [step, setStep] = useState<number>(1)

  const handleNext = () => {
    sound.playClick()
    if (step < 3) {
      setStep((s) => s + 1)
    } else {
      complete112Dispatch()
      onClose()
    }
  }

  return (
    <div className="cc-modal-backdrop">
      <div className="cc-dialogue-window operator-modal">
        <div className="cc-dialogue-header">
          <div className="cc-npc-profile">
            <div className="cc-npc-avatar-circle operator">🚨</div>
            <div>
              <h2 className="cc-npc-name">
                {language === 'hi' ? '112 राष्ट्रीय आपातकालीन ऑपरेटर' : '112 ERSS DISPATCH OPERATOR'}
              </h2>
              <span className="cc-npc-sub">
                {language === 'hi'
                  ? 'पुलिस व 108 एम्बुलेंस एकीकृत सेवा'
                  : 'National Emergency Response Support System'}
              </span>
            </div>
          </div>
          <button className="cc-close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cc-operator-body">
          {step === 1 && (
            <div className="cc-operator-step">
              <span className="cc-bubble-quote">“</span>
              <p className="cc-operator-speech">
                {language === 'hi'
                  ? '112 आपात सेवा। कृपया घटनास्थल का सटीक स्थान बताएं और फोन स्पीकर पर रखें।'
                  : '112 Emergency Services. Please stay calm, keep phone on speaker, and describe your exact location and landmarks.'}
              </p>
              <button className="cc-action-btn primary" onClick={handleNext}>
                {language === 'hi'
                  ? 'स्थान बताएं: "जंक्शन 48, हाईवे ढाबे के सामने"'
                  : 'State Location: "Junction 48, across Highway Dhaba"'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="cc-operator-step">
              <span className="cc-bubble-quote">“</span>
              <p className="cc-operator-speech">
                {language === 'hi'
                  ? 'एम्बुलेंस 108 और हाईवे पेट्रोल रवाना हो गई हैं। क्या घायल व्यक्ति सांस ले रहा है? कृपया गर्दन या रीढ़ को बिल्कुल न हिलाएं।'
                  : 'Ambulance 108 and highway patrol are dispatched. Is the victim breathing? Do NOT move or twist the neck or spine unless in fire danger.'}
              </p>
              <button className="cc-action-btn primary" onClick={handleNext}>
                {language === 'hi'
                  ? 'पुष्टि करें: "सांस चल रही है, रीढ़ को स्थिर रखा गया है"'
                  : 'Confirm: "Breathing steady; victim stabilized, not moved"'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="cc-operator-step">
              <span className="cc-bubble-quote">“</span>
              <p className="cc-operator-speech">
                {language === 'hi'
                  ? 'नेक मददगार के रूप में आप पूरी तरह सुरक्षित हैं। आपका नाम गुप्त रहेगा। कृपया किसी साथी को एम्बुलेंस का मार्गदर्शन करने आगे भेजें।'
                  : 'As a Good Samaritan, you are protected by law. Giving your personal details is optional. Send a bystander to guide the ambulance into the clear lane.'}
              </p>
              <button className="cc-action-btn primary" onClick={handleNext}>
                {language === 'hi'
                  ? 'कॉल समाप्त करें व लेन खाली करवाएं →'
                  : 'Complete Dispatch & Open Ambulance Lane →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
