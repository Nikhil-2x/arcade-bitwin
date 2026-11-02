import React from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import type { WitnessNPC, NPCTaskType } from '../types.ts'

export const TaskAssignModal: React.FC<{
  store: CivicClashStore
  witness: WitnessNPC
  onClose: () => void
}> = ({ store, witness, onClose }) => {
  const { rescuerAssignTask, language, level } = store

  const tasks: Array<{
    type: NPCTaskType
    title: string
    titleHi: string
    desc: string
    descHi: string
    duration: string
  }> = [
    {
      type: 'call_112',
      title: 'Call 112 Dispatch',
      titleHi: '112 आपातकालीन कॉल करें',
      desc: 'Speak to ERSS operator while you attend to the victim.',
      descHi: 'ऑपरेटर को घटना की जानकारी दें जबकि आप घायल के पास रहें।',
      duration: '10s'
    },
    {
      type: 'guide_ambulance',
      title: 'Guide Arriving Ambulance',
      titleHi: 'एम्बुलेंस को रास्ता दिखाएं',
      desc: 'Stand at the intersection and wave emergency vehicle through.',
      descHi: 'चौराहे पर खड़े होकर एम्बुलेंस को सही लेन में ले जाएं।',
      duration: '12s'
    },
    {
      type: 'drive_victim',
      title: 'Drive Victim in Vehicle',
      titleHi: 'घायल को अस्पताल ले जाएं',
      desc: 'Transport victim directly to emergency care under Section 134A immunity.',
      descHi: 'धारा 134A की सुरक्षा में घायल को तुरंत अस्पताल पहुंचाएं।',
      duration: '15s'
    },
    {
      type: 'secure_cctv',
      title: 'Preserve CCTV Video',
      titleHi: 'सीसीटीवी रिकॉर्डिंग सुरक्षित करें',
      desc: 'Lock DVR timestamp footage before loop overwrite occurs.',
      descHi: 'कैमरे की रिकॉर्डिंग को ओवरराइट होने से पहले सेव करें।',
      duration: '8s'
    },
    {
      type: 'clear_lane',
      title: 'Hold Traffic Cones',
      titleHi: 'ट्रैफिक कोन संभालें',
      desc: 'Prevent commuter vehicles from blocking the rescue corridor.',
      descHi: 'आते-जाते वाहनों को एम्बुलेंस लेन में आने से रोकें।',
      duration: '10s'
    }
  ]

  return (
    <div className="cc-modal-backdrop">
      <div className="cc-dialogue-window task-assign">
        <div className="cc-dialogue-header">
          <div>
            <h2 className="cc-npc-name">
              {language === 'hi'
                ? `${witness.nameHi} को जिम्मेदारी सौंपें`
                : `DELEGATE TASK TO ${witness.name.toUpperCase()}`}
            </h2>
            <span className="cc-npc-sub">
              {language === 'hi'
                ? 'भीड़ के प्रभाव को तोड़ने का सबसे कारगर तरीका: नाम लेकर काम सौंपना।'
                : 'The real-life golden rule: assign a specific person a specific job.'}
            </span>
          </div>
          <button className="cc-close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cc-tasks-grid">
          {tasks.map((task) => (
            <button
              key={task.type}
              className="cc-task-option-card"
              onClick={() => {
                rescuerAssignTask(witness.id, task.type)
                onClose()
              }}
            >
              <div className="cc-task-top">
                <span className="cc-task-title">
                  {language === 'hi' ? task.titleHi : task.title}
                </span>
                <span className="cc-task-duration">⏱ {task.duration}</span>
              </div>
              <p className="cc-task-desc">
                {language === 'hi' ? task.descHi : task.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

