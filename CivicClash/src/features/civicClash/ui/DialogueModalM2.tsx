import React, { useEffect, useRef, useState } from 'react'
import type {
  DialogueSession,
  DialogueOption,
  DialogueOutcome,
  DialogueStatDelta
} from '../network/milestone2Types.ts'
import { sound } from '../engine/audio.ts'
import './DialogueModalM2.css'

interface DialogueModalM2Props {
  session: DialogueSession
  statusMessage?: string
  sabotageEnergy: number
  onSelectOption: (optionId: string) => void
  onClose: () => void
}

interface LogEntry {
  said: string
  npcSays: string
  outcome: DialogueOutcome
  effects: DialogueStatDelta
}

const AVATARS: Record<string, string> = {
  npc_arjun: '🤕', npc_ramesh: '👳', npc_priya: '👩‍🎓', npc_amit: '🚶',
  npc_sharma: '👮', npc_rajesh: '👮', npc_deepak: '👨‍💼', npc_sunil: '👨‍🔧',
  npc_meera: '👩‍⚕️', npc_verma: '🚒', npc_kishore: '👴', npc_laxman: '👷',
  npc_gupta: '👨‍💼', npc_bose: '👷‍♂️'
}

const TONE_ICON: Record<string, string> = {
  empathy: '❤️', legal: '⚖️', info: '🔍', action: '⚡', pressure: '⚠️', deceive: '🎭'
}

const OUTCOME_COPY: Record<DialogueOutcome, { icon: string; title: string }> = {
  success: { icon: '✅', title: 'That worked' },
  backfire: { icon: '💢', title: 'That backfired' },
  neutral: { icon: '📝', title: 'Noted' },
  blocked: { icon: '⛔', title: 'Not yet possible' },
  repeat: { icon: '🔁', title: 'Already covered' },
  sabotage: { icon: '🎭', title: 'Sabotage landed' }
}

const STAT_LABEL: Record<string, string> = { trust: 'Trust', fear: 'Fear', cooperation: 'Cooperation' }

// Is a stat change good for the person looking at it?
// Runner wants trust/cooperation up and fear down. Saboteur wants the reverse.
function isGoodFor(role: string, stat: string, delta: number): boolean {
  const upIsGoodForRunner = stat !== 'fear'
  const goodForRunner = delta > 0 ? upIsGoodForRunner : !upIsGoodForRunner
  return role === 'runner' ? goodForRunner : !goodForRunner
}

const StatChips: React.FC<{ effects: DialogueStatDelta; role: string }> = ({ effects, role }) => {
  const entries = (Object.entries(effects) as [string, number | undefined][]).filter(
    ([, v]) => typeof v === 'number' && v !== 0
  ) as [string, number][]
  if (entries.length === 0) return null
  return (
    <>
      {entries.map(([stat, delta]) => (
        <span
          key={stat}
          className={`cc-stat-chip ${isGoodFor(role, stat, delta) ? 'good' : 'bad'}`}
        >
          {STAT_LABEL[stat]} {delta > 0 ? '▲ +' : '▼ '}{delta}
        </span>
      ))}
    </>
  )
}

export const DialogueModalM2: React.FC<DialogueModalM2Props> = ({
  session,
  statusMessage,
  sabotageEnergy,
  onSelectOption,
  onClose
}) => {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingText, setPendingText] = useState<string>('')
  const [log, setLog] = useState<LogEntry[]>([])
  const lastLoggedRef = useRef<unknown>(null)

  const lastResp = session.lastResponse
  const role = session.options[0]?.role ?? 'runner'

  // When a new server result arrives, add it to the conversation log once.
  useEffect(() => {
    if (!lastResp || lastLoggedRef.current === lastResp) return
    lastLoggedRef.current = lastResp
    setLog((prev) => [
      ...prev,
      {
        said: pendingText || 'You spoke.',
        npcSays: lastResp.npcSpoken,
        outcome: lastResp.outcome ?? 'neutral',
        effects: lastResp.effects ?? {}
      }
    ].slice(-4))
    setPendingId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResp])

  const canAfford = (opt: DialogueOption) =>
    !opt.sabotageEnergyCost || sabotageEnergy >= opt.sabotageEnergyCost

  const handleSelect = (opt: DialogueOption) => {
    if (opt.isCompleted || pendingId) return
    if (!canAfford(opt)) {
      sound.playError()
      return
    }
    sound.playClick()
    setPendingId(opt.id)
    setPendingText(opt.text.replace(/^[A-D]\.\s*/, ''))
    onSelectOption(opt.id)
    // Safety net: if the server rejects the choice (e.g. rate limit) never leave the buttons locked.
    window.setTimeout(() => setPendingId((cur) => (cur === opt.id ? null : cur)), 2500)
  }

  // Number keys 1-4 pick an option so the dialogue is fast to play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > session.options.length) return
      handleSelect(session.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pendingId, sabotageEnergy])

  const outcome: DialogueOutcome = lastResp?.outcome ?? 'neutral'
  const outcomeCopy = OUTCOME_COPY[outcome]
  const hasResult = !!lastResp || !!statusMessage
  const allDone = session.options.length > 0 && session.options.every((o) => o.isCompleted)

  const goalHint =
    session.npcId === 'npc_arjun' && !lastResp
      ? 'Goal: stabilise Arjun with the First-Aid Kit'
      : session.npcId === 'npc_ramesh' && session.cooperation < 50
      ? 'Goal: raise Ramesh’s Cooperation to 50%+ to unlock the CCTV'
      : session.npcId === 'npc_amit'
      ? 'Goal: get Amit to dial 112 at the Emergency Pillar'
      : 'Press [ESC] to return to the arena'

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-dialogue-window m2-dialogue cc-dlg2" onClick={(e) => e.stopPropagation()}>
        {/* Header: who you are talking to + live meters */}
        <div className="cc-dlg2-header">
          <div className="cc-dlg2-who">
            <div className="cc-dlg2-avatar">{AVATARS[session.npcId] ?? '👤'}</div>
            <div>
              <h2 className="cc-dlg2-name">{session.npcName}</h2>
              <div className="cc-dlg2-role">{session.npcRole}</div>
            </div>
          </div>
          <div className="cc-dlg2-meters">
            {([
              ['Trust', session.trust, 'trust', 'How much they believe you'],
              ['Fear', session.fear, 'fear', 'High fear makes people go quiet'],
              ['Cooperation', session.cooperation, 'coop', 'How willing they are to help']
            ] as const).map(([label, value, cls, tip]) => (
              <div key={label} className={`cc-dlg2-meter ${cls}`} title={tip}>
                <div className="cc-dlg2-meter-top">
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="cc-dlg2-track">
                  <div className="cc-dlg2-fill" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button className="cc-close-x" onClick={onClose} title="Close (ESC)">✕</button>
        </div>

        {/* What they just said */}
        <div className="cc-dlg2-speech">
          <div className="cc-dlg2-speech-label">💬 {session.npcName} says</div>
          <p>{lastResp?.npcSpoken ? `“${lastResp.npcSpoken}”` : session.promptText}</p>
        </div>

        {/* Earlier turns, so the conversation has memory */}
        {log.length > 1 && (
          <div className="cc-dlg2-log" aria-label="Conversation so far">
            {log.slice(0, -1).map((entry, i) => (
              <div key={i} className={`cc-dlg2-log-row ${entry.outcome}`}>
                <span className="cc-dlg2-log-you">You: {entry.said}</span>
                <span className="cc-dlg2-log-fx">
                  <StatChips effects={entry.effects} role={role} />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Result of the choice just made */}
        {hasResult && (
          <div className={`cc-dlg2-result ${outcome}`}>
            <div className="cc-dlg2-result-head">
              <strong>{outcomeCopy.icon} {outcomeCopy.title}</strong>
              {lastResp?.pointsAwarded ? (
                <span className="cc-dlg2-pts">+{lastResp.pointsAwarded} pts</span>
              ) : null}
            </div>
            {statusMessage && <p className="cc-dlg2-status">{statusMessage}</p>}
            {lastResp?.effects && (
              <div className="cc-dlg2-fx">
                <StatChips effects={lastResp.effects} role={role} />
              </div>
            )}
            {lastResp?.clueUnlocked && (
              <div className="cc-dlg2-clue">📋 New evidence: <strong>{lastResp.clueUnlocked}</strong></div>
            )}
            {lastResp?.learningTip && (
              <div className="cc-dlg2-learn">
                <span>🎓 Real-world rule</span>
                <p>{lastResp.learningTip}</p>
              </div>
            )}
          </div>
        )}

        {/* The choices */}
        <div className="cc-dlg2-choices">
          <div className="cc-dlg2-choices-head">
            <span>{allDone ? 'Nothing new to ask here' : 'What do you say? (press 1–' + session.options.length + ')'}</span>
            <small>Each approach can only pay off once per round</small>
          </div>

          {session.options.map((opt, index) => {
            const p = opt.preview
            const cantAfford = !canAfford(opt)
            const isPending = pendingId === opt.id
            const disabled = !!opt.isCompleted || cantAfford || !!pendingId
            const tone = p?.tone ?? (opt.role === 'saboteur' ? 'deceive' : 'info')
            const hasEffects = p && Object.values(p.effects).some((v) => v)

            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(opt)}
                className={`cc-dlg2-choice tone-${tone} ${opt.isCompleted ? 'done' : ''} ${isPending ? 'pending' : ''}`}
              >
                <div className="cc-dlg2-choice-top">
                  <span className="cc-dlg2-key">{index + 1}</span>
                  <span className="cc-dlg2-tone">
                    {TONE_ICON[tone]} {p?.toneLabel ?? opt.categoryLabel ?? 'Respond'}
                  </span>
                  {opt.isCompleted && <span className="cc-dlg2-done">✓ Done</span>}
                  {isPending && <span className="cc-dlg2-done">Sending…</span>}
                </div>

                <div className="cc-dlg2-choice-text">{opt.text}</div>

                {!opt.isCompleted && p && (
                  <div className="cc-dlg2-preview">
                    {hasEffects && (
                      <div className="cc-dlg2-preview-row">
                        <span className="cc-dlg2-preview-k">Likely effect</span>
                        <StatChips effects={p.effects} role={opt.role} />
                      </div>
                    )}
                    {p.unlocks && <div className="cc-dlg2-line unlock">🔓 {p.unlocks}</div>}
                    {p.counters && <div className="cc-dlg2-line counter">↩ {p.counters}</div>}
                    {p.needs && <div className="cc-dlg2-line needs">🎒 Needs: {p.needs}</div>}
                    {p.risk && <div className="cc-dlg2-line risk">⚠ {p.risk}</div>}
                    {p.heat > 0 && <div className="cc-dlg2-line risk">🔥 Suspicion +{p.heat}</div>}
                    {opt.sabotageEnergyCost ? (
                      <div className={`cc-dlg2-line energy ${cantAfford ? 'lacking' : ''}`}>
                        ⚡ Costs {opt.sabotageEnergyCost} energy{cantAfford ? ' (not enough)' : ''}
                      </div>
                    ) : null}
                  </div>
                )}
                {!opt.isCompleted && !p && opt.consequenceHint && (
                  <div className="cc-dlg2-line unlock">💡 {opt.consequenceHint}</div>
                )}
              </button>
            )
          })}
        </div>

        <div className="cc-dlg2-footer">
          <span>🎯 {goalHint}</span>
          <button className="cc-action-btn primary small" onClick={onClose}>
            Back to the arena
          </button>
        </div>
      </div>
    </div>
  )
}
