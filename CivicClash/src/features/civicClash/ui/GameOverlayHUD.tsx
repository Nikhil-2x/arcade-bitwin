import React, { useState } from 'react'
import type { PlayerRole } from '../network/networkTypes.ts'
import type { GameTelemetryM2 } from '../network/milestone2Types.ts'
import type { MatchState } from '../network/milestone4Types.ts'

interface GameOverlayHUDProps {
  roomCode: string
  localRole: PlayerRole
  localName: string
  remoteName: string
  localPlayerId?: string
  coordinates: { x: number; y: number; z: number }
  isSprinting: boolean
  isMoving: boolean
  nearestPrompt?: string | null
  telemetry?: GameTelemetryM2 | any | null
  matchState?: MatchState | null
  onOpenInfoLog: () => void
  onOpenPhoneModal?: () => void
  onUseAbility?: (abilityId: string) => void
  onUseRunnerTool?: (tool: 'scan' | 'lock' | 'verify' | 'help', targetId?: string) => void
  onStartEscape?: () => void
  onCancelEscape?: () => void
  onLeaveMatch: () => void
}

export const GameOverlayHUD: React.FC<GameOverlayHUDProps> = ({
  roomCode,
  localRole,
  localName,
  remoteName,
  localPlayerId,
  coordinates,
  isSprinting,
  isMoving,
  nearestPrompt,
  telemetry,
  matchState,
  onOpenInfoLog,
  onOpenPhoneModal,
  onUseAbility,
  onUseRunnerTool,
  onStartEscape,
  onCancelEscape,
  onLeaveMatch
}) => {
  const isRunner = localRole === 'runner'
  const [isTasksOpen, setIsTasksOpen] = useState<boolean>(true)

  // Default fallback objectives if telemetry not yet received
  const runnerObjectives = telemetry?.runnerObjectives || [
    { id: 'ro_1', title: 'Assess & Stabilize Arjun', description: 'Approach accident zone with first-aid medical kit', completed: false },
    { id: 'ro_2', title: 'Summon 112 Dispatch', description: 'Use Emergency Pillar or direct Amit to dial 112', completed: false },
    { id: 'ro_3', title: "Gain Ramesh's CCTV Cooperation", description: 'Explain Good Samaritan Law § 134A to unseal DVR', completed: false },
    { id: 'ro_4', title: 'Interview Eyewitness Priya', description: 'Collect vehicle fleeing direction & license plate clue', completed: false },
    { id: 'ro_5', title: 'File Intercept with Officer Sharma', description: 'Submit verified vehicle clues for highway roadblock', completed: false }
  ]

  const saboteurObjectives = telemetry?.saboteurObjectives || [
    { id: 'so_1', title: 'Mislead Eyewitness Priya', description: 'Confound eyewitness memory of fleeing vehicle plate', completed: false },
    { id: 'so_2', title: 'Interfere with Shop CCTV', description: 'Sow fear with Ramesh or disable CCTV breaker', completed: false },
    { id: 'so_3', title: 'Disperse Bystanders', description: 'Stage diversions or trigger blackout so crowd flees', completed: false },
    { id: 'so_4', title: 'Slip Away Unaccountable', description: 'Reach North-East highway perimeter and channel escape', completed: false }
  ]

  const activeObjectives = isRunner ? runnerObjectives : saboteurObjectives
  const completedCount = activeObjectives.filter((o: any) => o.completed).length
  const totalCount = activeObjectives.length
  const primaryTask = activeObjectives.find((o: any) => !o.completed) || activeObjectives[0]

  const coopVal = telemetry ? Math.min(100, Math.max(0, telemetry.communityCooperation ?? 40)) : 40
  const energyVal = telemetry ? Math.min(100, Math.max(0, telemetry.sabotageEnergy ?? 100)) : 100
  const inventory = telemetry?.inventory || []
  const abilities = telemetry?.saboteurAbilities || []
  const eventFeed = telemetry?.eventFeed || []
  const escapeProgress = telemetry?.escapeProgress

  // Strategy layer (Patch C)
  const strategy = telemetry?.strategy
  const runnerTools = strategy?.tools || {
    scan: { uses: 3, cooldownSec: 0 },
    lock: { uses: 2, cooldownSec: 0 },
    verify: { uses: 3, cooldownSec: 0 },
    help: { uses: 1, cooldownSec: 0 }
  }
  const heatVal = strategy?.heat ?? (telemetry?.suspicionLevel ?? 10)
  const heatBand = strategy?.band || (heatVal >= 85 ? 'EXPOSED' : heatVal >= 65 ? 'HOT' : heatVal >= 40 ? 'WATCHED' : 'COLD')
  const lockoutSec = strategy?.lockoutSec || 0

  const timeSec = matchState?.timeRemainingSec ?? (telemetry?.timeRemainingSec ?? 240)
  const minutes = Math.floor(timeSec / 60)
  const seconds = timeSec % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  // Scores
  let localScore = 0
  let remoteScore = 0
  if (matchState?.players) {
    for (const [pid, p] of Object.entries(matchState.players)) {
      if (pid === localPlayerId) localScore = p.totalScore
      else remoteScore = p.totalScore
    }
  }

  return (
    <div className="cc-game-hud-layer cc-game-hud-decluttered">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP STATUS BAR (Modern, Clean, Glassmorphism)
      ───────────────────────────────────────────────────────────── */}
      <div className="cc-top-hud cc-top-hud-clean">
        {/* Left: Role, Live Score, Room */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`cc-hud-role-pill ${isRunner ? 'runner' : 'saboteur'}`}>
            <span style={{ fontSize: '1.25rem' }}>{isRunner ? '🏃' : '🕵️'}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                {isRunner ? 'OBJECTIVE RUNNER' : 'SABOTEUR'}
              </strong>
              <small style={{ fontSize: '0.72rem', color: isRunner ? '#93c5fd' : '#fca5a5' }}>
                {localName} · <strong>{localScore} PTS</strong>
              </small>
            </div>
          </div>

          <div className="cc-room-badge" style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginRight: 4 }}>ROOM:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b' }}>{roomCode}</span>
          </div>
        </div>

        {/* Center: Match Phase & High-Visibility Countdown Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '6px 16px',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}>
          <span style={{
            background: '#f59e0b',
            color: '#000',
            fontWeight: 800,
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 12
          }}>
            LEVEL {matchState?.currentLevel || 1} · R{matchState?.currentRound || 1}/2
          </span>

          <span style={{
            fontSize: '1.2rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: timeSec < 30 ? '#ef4444' : timeSec < 60 ? '#f59e0b' : '#38bdf8',
            letterSpacing: '0.05em'
          }}>
            ⏱️ {formattedTime}
          </span>
        </div>

        {/* Right: Head-to-Head Opponent & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 12px',
            borderRadius: 8
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              VS: <strong style={{ color: '#fff' }}>{remoteName || 'Opponent'}</strong> ({remoteScore} pts)
            </span>
          </div>

          <button
            className="cc-hud-btn"
            onClick={onOpenInfoLog}
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid #3b82f6',
              color: '#93c5fd',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📋 Case File
          </button>

          <button className="cc-hud-btn" onClick={onLeaveMatch} title="Leave Match" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
            ✕ Exit
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. RIGHT COMPACT DIRECTIVE CARD (Replaces Cluttered Task Panel)
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 64,
        right: 16,
        width: 320,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 14,
        padding: '12px 14px',
        color: '#fff',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        zIndex: 20
      }}>
        {/* Header with Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1rem' }}>{isRunner ? '🚨' : '⚡'}</span>
            <strong style={{ fontSize: '0.8rem', letterSpacing: '0.04em', color: isRunner ? '#38bdf8' : '#f87171' }}>
              {isRunner ? 'CIVIC RESCUE PROTOCOL' : 'COVERT SABOTAGE GOALS'}
            </strong>
          </div>
          <button
            onClick={() => setIsTasksOpen(!isTasksOpen)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            {isTasksOpen ? 'Hide ▲' : `${completedCount}/${totalCount} ▼`}
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%',
            width: `${(completedCount / totalCount) * 100}%`,
            background: isRunner ? 'linear-gradient(90deg, #38bdf8, #22c55e)' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Primary Priority Objective */}
        <div style={{
          background: isRunner ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderLeft: `3px solid ${isRunner ? '#38bdf8' : '#ef4444'}`,
          padding: '8px 10px',
          borderRadius: '0 8px 8px 0',
          marginBottom: isTasksOpen ? 10 : 0
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isRunner ? '#7dd3fc' : '#fca5a5', textTransform: 'uppercase', marginBottom: 2 }}>
            CURRENT PRIORITY OBJECTIVE:
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
            {primaryTask?.title}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: 3 }}>
            {primaryTask?.description}
          </div>
        </div>

        {/* Secondary Objectives List (Collapsible) */}
        {isTasksOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {activeObjectives.map((obj: any) => (
              <div
                key={obj.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: '0.75rem',
                  opacity: obj.completed ? 0.5 : 1,
                  padding: '4px 0',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <span>{obj.completed ? '✅' : '⬜'}</span>
                <div>
                  <strong style={{ color: obj.completed ? '#94a3b8' : '#f1f5f9' }}>{obj.title}</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inventory Item / Phone Button */}
        {isRunner && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              🎒 {inventory.includes('First-Aid Medical Box') ? (
                <span style={{ color: '#4ade80', fontWeight: 800 }}>First-Aid Kit (Ready)</span>
              ) : inventory.includes('First-Aid Kit (Applied)') ? (
                <span style={{ color: '#38bdf8' }}>First-Aid Applied to Victim</span>
              ) : (
                <span style={{ color: '#64748b' }}>No First-Aid Kit (Search Dhaba)</span>
              )}
            </div>

            {onOpenPhoneModal && (
              <button
                onClick={onOpenPhoneModal}
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid #22c55e',
                  color: '#4ade80',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📞 Dial 112
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CENTER INTERACTION PROMPT (High-Visibility with Counterplay Hint)
      ───────────────────────────────────────────────────────────── */}
      {nearestPrompt && (
        <div className={`cc-interact-prompt-capsule ${nearestPrompt.toLowerCase().includes('sabotage') || nearestPrompt.toLowerCase().includes('jammed') || nearestPrompt.toLowerCase().includes('cut') ? 'counterplay-prompt' : ''}`}
          style={{
            position: 'absolute',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            background: nearestPrompt.toLowerCase().includes('jammed') || nearestPrompt.toLowerCase().includes('repair') || nearestPrompt.toLowerCase().includes('override')
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))'
              : 'rgba(15, 23, 42, 0.92)',
            border: nearestPrompt.toLowerCase().includes('repair') || nearestPrompt.toLowerCase().includes('override')
              ? '2px solid #facc15'
              : '1px solid #3b82f6',
            borderRadius: 30,
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 30
          }}
        >
          <span style={{
            background: '#facc15',
            color: '#000',
            fontWeight: 900,
            fontSize: '0.85rem',
            padding: '3px 9px',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            E
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
            {nearestPrompt}
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM ACTION & COUNTERPLAY TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 25
      }}>
        {/* RUNNER COUNTERPLAY TOOLS BAR */}
        {isRunner ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 16,
            padding: '8px 14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>
              🛡️ COUNTERPLAY TOOLS:
            </span>

            {/* Tool 1: SCAN */}
            <button
              onClick={() => onUseRunnerTool && onUseRunnerTool('scan')}
              disabled={runnerTools.scan.uses <= 0 || runnerTools.scan.cooldownSec > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: runnerTools.scan.uses > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #38bdf8',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: runnerTools.scan.uses > 0 ? 'pointer' : 'default',
                opacity: runnerTools.scan.uses <= 0 ? 0.4 : 1
              }}
              title="Scan nearby objects or citizens for tampering traces. Reveals sabotage and logs verified evidence!"
            >
              <span>[1] 🔍 Scan Area</span>
              <span style={{ background: '#0284c7', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem' }}>
                {runnerTools.scan.cooldownSec > 0 ? `${runnerTools.scan.cooldownSec}s` : `${runnerTools.scan.uses} left`}
              </span>
            </button>

            {/* Tool 2: LOCK / PROTECT */}
            <button
              onClick={() => onUseRunnerTool && onUseRunnerTool('lock')}
              disabled={runnerTools.lock.uses <= 0 || runnerTools.lock.cooldownSec > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: runnerTools.lock.uses > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #22c55e',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: runnerTools.lock.uses > 0 ? 'pointer' : 'default',
                opacity: runnerTools.lock.uses <= 0 ? 0.4 : 1
              }}
              title="Lock down nearby object for 30s. If Saboteur tampers with it, sabotage fails and culprit is exposed!"
            >
              <span>[2] 🔒 Lock Object</span>
              <span style={{ background: '#16a34a', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem' }}>
                {runnerTools.lock.cooldownSec > 0 ? `${runnerTools.lock.cooldownSec}s` : `${runnerTools.lock.uses} left`}
              </span>
            </button>

            {/* Tool 3: VERIFY CLUE */}
            <button
              onClick={() => onUseRunnerTool && onUseRunnerTool('verify')}
              disabled={runnerTools.verify.uses <= 0 || runnerTools.verify.cooldownSec > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: runnerTools.verify.uses > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #eab308',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: runnerTools.verify.uses > 0 ? 'pointer' : 'default',
                opacity: runnerTools.verify.uses <= 0 ? 0.4 : 1
              }}
              title="Verify evidence clues or debunk planted false leads (+Heat to Saboteur, +Points to Runner)!"
            >
              <span>[3] ⚖️ Verify Clues</span>
              <span style={{ background: '#ca8a04', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem' }}>
                {runnerTools.verify.cooldownSec > 0 ? `${runnerTools.verify.cooldownSec}s` : `${runnerTools.verify.uses} left`}
              </span>
            </button>

            {/* Tool 4: EMERGENCY HELP */}
            <button
              onClick={() => onUseRunnerTool && onUseRunnerTool('help')}
              disabled={runnerTools.help.uses <= 0 || runnerTools.help.cooldownSec > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: runnerTools.help.uses > 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #a855f7',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: runnerTools.help.uses > 0 ? 'pointer' : 'default',
                opacity: runnerTools.help.uses <= 0 ? 0.4 : 1
              }}
              title="Call Emergency Response to speed up repairs by 10s and calm panicked civilian witnesses!"
            >
              <span>[4] 📢 Call Help</span>
              <span style={{ background: '#9333ea', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem' }}>
                {runnerTools.help.uses > 0 ? 'Ready' : 'Used'}
              </span>
            </button>
          </div>
        ) : (
          /* SABOTEUR ACTION BAR */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 16,
            padding: '8px 14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Heat Meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: heatVal >= 65 ? '#ef4444' : heatVal >= 40 ? '#f59e0b' : '#10b981' }}>
                🔥 HEAT: {Math.round(heatVal)}% ({heatBand})
              </span>
              <div style={{ width: 60, height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${heatVal}%`,
                  background: heatVal >= 85 ? '#dc2626' : heatVal >= 65 ? '#ef4444' : heatVal >= 40 ? '#f59e0b' : '#10b981',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>

            {/* Saboteur Abilities */}
            <div style={{ display: 'flex', gap: 6 }}>
              {abilities.slice(0, 3).map((ab: any, idx: number) => {
                const onCooldown = ab.currentCooldownSec > 0 || lockoutSec > 0
                const cantAfford = energyVal < ab.energyCost

                return (
                  <button
                    key={ab.id}
                    className="cc-ability-btn"
                    disabled={onCooldown || cantAfford}
                    onClick={() => onUseAbility && onUseAbility(ab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      borderRadius: 10,
                      padding: '6px 12px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: onCooldown || cantAfford ? 'default' : 'pointer',
                      opacity: onCooldown || cantAfford ? 0.45 : 1
                    }}
                    title={`${ab.name}: ${ab.description}`}
                  >
                    <span>[{idx + 1}] {ab.icon} {ab.name}</span>
                    <span style={{ background: '#b91c1c', padding: '1px 5px', borderRadius: 8, fontSize: '0.68rem' }}>
                      {lockoutSec > 0 ? `LOCK ${lockoutSec}s` : ab.currentCooldownSec > 0 ? `${ab.currentCooldownSec}s` : `${ab.energyCost}⚡`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Escape Channeling Button */}
            {escapeProgress?.isEscaping ? (
              <button
                onClick={onCancelEscape}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🛑 Cancel Escape ({escapeProgress.progressSec}/5s)
              </button>
            ) : (
              <button
                onClick={onStartEscape}
                disabled={escapeProgress?.isCompleted || timeSec > 140}
                style={{
                  background: timeSec <= 140 && !escapeProgress?.isCompleted ? '#b91c1c' : 'rgba(255, 255, 255, 0.08)',
                  color: timeSec <= 140 && !escapeProgress?.isCompleted ? '#fff' : '#64748b',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: timeSec <= 140 && !escapeProgress?.isCompleted ? 'pointer' : 'default'
                }}
                title={timeSec > 140 ? 'Escape unlocked later in the round' : 'Channel escape at northeast border'}
              >
                🏃 Escape Route
              </button>
            )}
          </div>
        )}

        {/* Minimal Controls Hint */}
        <div style={{
          fontSize: '0.72rem',
          color: '#94a3b8',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '2px 10px',
          borderRadius: 12,
          letterSpacing: '0.04em'
        }}>
          [W A S D] Move · [Shift] Sprint · [E] Interact / Reverse Sabotage · [1-4] Tools
        </div>
      </div>
    </div>
  )
}
