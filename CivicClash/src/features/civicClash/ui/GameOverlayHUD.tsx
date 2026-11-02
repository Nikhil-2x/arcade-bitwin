import React from 'react'
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
  telemetry?: GameTelemetryM2 | null
  matchState?: MatchState | null
  onOpenInfoLog: () => void
  onOpenPhoneModal?: () => void
  onUseAbility?: (abilityId: string) => void
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
  onStartEscape,
  onCancelEscape,
  onLeaveMatch
}) => {
  const isRunner = localRole === 'runner'

  // Default fallback objectives if telemetry not yet received
  const runnerObjectives = telemetry?.runnerObjectives || [
    { id: 'ro_1', title: "Assess & Stabilize Arjun", description: 'Check victim at Accident Zone and apply bandage', completed: false },
    { id: 'ro_2', title: 'Summon 112 Dispatch', description: 'Use Emergency Phone or task Amit to call 112', completed: false },
    { id: 'ro_3', title: 'Gain Ramesh’s Cooperation', description: 'Persuade Ramesh to unlock the CCTV footage', completed: false },
    { id: 'ro_4', title: 'Interview Eyewitness Priya', description: 'Collect vehicle fleeing direction & license plate', completed: false },
    { id: 'ro_5', title: 'File Report with Officer Sharma', description: 'Submit verified vehicle clues to trigger intercept', completed: false }
  ]

  const saboteurObjectives = telemetry?.saboteurObjectives || [
    { id: 'so_1', title: 'Mislead Eyewitness Priya', description: 'Convince Priya she did not see license plate', completed: false },
    { id: 'so_2', title: 'Interfere with Shop CCTV', description: 'Discourage Ramesh or disable CCTV console', completed: false },
    { id: 'so_3', title: 'Disperse Bystanders', description: 'Spread fear or stage distraction so bystanders leave', completed: false },
    { id: 'so_4', title: 'Slip Away Unaccountable', description: 'Reach North-East escape zone and channel escape', completed: false }
  ]

  const coopVal = telemetry ? Math.min(100, Math.max(0, telemetry.communityCooperation)) : 40
  const energyVal = telemetry ? Math.min(100, Math.max(0, telemetry.sabotageEnergy)) : 100
  const suspicionVal = telemetry ? Math.min(100, Math.max(0, telemetry.suspicionLevel)) : 10
  const inventory = telemetry?.inventory || []
  const abilities = telemetry?.saboteurAbilities || []
  const eventFeed = telemetry?.eventFeed || []
  const escapeProgress = telemetry?.escapeProgress

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
    <div className="cc-game-hud-layer">
      {/* PAUSE OVERLAY */}
      {matchState?.isPaused && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏸️</div>
          <h2 style={{ color: '#f59e0b', margin: '0 0 8px 0', fontSize: '1.8rem' }}>MATCH PAUSED</h2>
          <p style={{ maxWidth: 440, textAlign: 'center', color: '#cbd5e1', fontSize: '0.95rem' }}>
            {matchState.pauseReason || 'A player disconnected. Waiting 45 seconds for reconnection...'}
          </p>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: 8,
            padding: '8px 20px',
            marginTop: 12
          }}>
            ⏱️ {matchState.pausedRemainingSec ?? 45}s remaining
          </div>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <div className="cc-top-hud">
        {/* Left: Role and Player Name */}
        <div className="cc-hud-left-group">
          <div className={`cc-hud-role-pill ${isRunner ? 'runner' : 'saboteur'}`}>
            <span className="cc-role-icon">{isRunner ? '🏃' : '🕵️'}</span>
            <div className="cc-role-details">
              <strong>{isRunner ? 'OBJECTIVE RUNNER' : 'SABOTEUR'}</strong>
              <small>{localName} ({localScore} pts)</small>
            </div>
          </div>

          <div className="cc-room-badge">
            <span className="cc-badge-label">ROOM:</span>
            <span className="cc-badge-val">{roomCode}</span>
          </div>
        </div>

        {/* Center: Match Phase & Timer Capsule */}
        <div className="cc-objective-hud-capsule" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="cc-obj-step-badge" style={{ background: '#f59e0b', color: '#000', fontWeight: 800 }}>
            L{matchState?.currentLevel || 1} · R{matchState?.currentRound || 1}/2
          </span>
          <span className="cc-obj-title-text" style={{ fontSize: '1.1rem', fontWeight: 800, color: timeSec < 30 ? '#ef4444' : '#fff' }}>
            ⏱️ {formattedTime}
          </span>
        </div>

        {/* Right: Peer Info & Leave button */}
        <div className="cc-hud-right-group">
          <div className="cc-peer-card">
            <span className="cc-peer-dot" />
            <span className="cc-peer-text">
              VS: <strong>{remoteName || 'Connected Player'}</strong> ({remoteScore} pts)
            </span>
          </div>

          <button className="cc-hud-btn" onClick={onLeaveMatch} title="Leave this match">
            ✕ Exit
          </button>
        </div>
      </div>

      {/* 2. EVENT FEED (TOP RIGHT TICKER) */}
      {eventFeed.length > 0 && (
        <div className="cc-event-feed-container">
          <div className="cc-event-feed-header">CIVIC INCIDENT DISPATCH</div>
          <div className="cc-event-feed-list">
            {eventFeed.slice(0, 3).map((item) => (
              <div key={item.id} className={`cc-event-feed-item ${item.type}`}>
                <span className="cc-event-feed-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ASYMMETRIC HUD PANEL */}
      <div className="cc-asymmetric-hud-panel">
        <div className="cc-hud-panel-title">
          <strong>{isRunner ? 'Civic Mission Protocol' : 'Sabotage Infiltration'}</strong>
          <span className={`cc-hud-role-accent ${isRunner ? 'runner' : 'saboteur'}`}>
            {isRunner ? 'CIVIC DEFENDER' : 'OBSTRUCTIONIST'}
          </span>
        </div>

        {/* Meter Display */}
        {isRunner ? (
          <div className="cc-hud-meter-wrap">
            <div className="cc-hud-meter-header">
              <span>COMMUNITY COOPERATION</span>
              <span>{Math.round(coopVal)}%</span>
            </div>
            <div className="cc-hud-meter-track">
              <div className="cc-hud-meter-fill coop" style={{ width: `${coopVal}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="cc-hud-meter-wrap">
              <div className="cc-hud-meter-header">
                <span>SABOTAGE ENERGY</span>
                <span>{Math.round(energyVal)} / 100</span>
              </div>
              <div className="cc-hud-meter-track">
                <div className="cc-hud-meter-fill energy" style={{ width: `${energyVal}%` }} />
              </div>
            </div>

            <div className="cc-hud-meter-wrap" style={{ marginTop: '6px' }}>
              <div className="cc-hud-meter-header">
                <span style={{ color: suspicionVal > 50 ? '#f87171' : '#cbd5e1' }}>
                  {suspicionVal > 50 ? '⚠️ SUSPICION LEVEL (HIGH)' : 'SUSPICION LEVEL'}
                </span>
                <span>{Math.round(suspicionVal)}%</span>
              </div>
              <div className="cc-hud-meter-track">
                <div
                  className="cc-hud-meter-fill"
                  style={{
                    width: `${suspicionVal}%`,
                    background:
                      suspicionVal > 60
                        ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                        : suspicionVal > 30
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #10b981, #059669)'
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Inventory Item for Runner */}
        {isRunner && (
          <div style={{ margin: '6px 0 10px 0', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>INVENTORY: </span>
            {inventory.includes('First-Aid Medical Box') ? (
              <span style={{ color: '#4ade80', fontWeight: 800 }}>💊 First-Aid Kit (Carried)</span>
            ) : inventory.includes('First-Aid Kit (Applied)') ? (
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>🩹 First-Aid Applied to Victim</span>
            ) : (
              <span style={{ color: '#64748b' }}>Empty (Find Medical Box near Dhaba)</span>
            )}
          </div>
        )}

        {/* Objectives Checklist */}
        <div className="cc-hud-obj-list">
          {(isRunner ? runnerObjectives : saboteurObjectives).map((obj) => (
            <div key={obj.id} className={`cc-hud-obj-item ${obj.completed ? 'completed' : ''}`}>
              <span>{obj.completed ? '✅' : '⬜'}</span>
              <div>
                <strong>{obj.title}</strong>
                <p>{obj.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons for Runner / Saboteur */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <button className="cc-info-binder-btn" onClick={onOpenInfoLog}>
            📋 Incident Information & Evidence Binder
          </button>

          {isRunner && onOpenPhoneModal && (
            <button className="cc-hud-action-btn phone" onClick={onOpenPhoneModal}>
              📞 112 Emergency Dispatch Terminal
            </button>
          )}

          {!isRunner && (
            <div style={{ marginTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 8 }}>
              <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 800, marginBottom: 4 }}>
                SABOTEUR ACTIVE ABILITIES (CLICK TO DEPLOY)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {abilities.map((ab) => (
                  <button
                    key={ab.id}
                    className="cc-ability-btn"
                    disabled={ab.currentCooldownSec > 0 || energyVal < ab.energyCost}
                    onClick={() => onUseAbility && onUseAbility(ab.id)}
                    title={ab.description}
                  >
                    <span>{ab.icon} {ab.name}</span>
                    <small>
                      {ab.currentCooldownSec > 0
                        ? `${ab.currentCooldownSec}s`
                        : `${ab.energyCost}⚡`}
                    </small>
                  </button>
                ))}
              </div>

              {/* Escape Channeling Bar */}
              <div style={{ marginTop: 10, background: 'rgba(0, 0, 0, 0.4)', padding: 8, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: '#fca5a5', fontWeight: 700 }}>HIGHWAY ESCAPE CHANNEL</span>
                  <span>{escapeProgress?.progressSec || 0} / 5s</span>
                </div>
                <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${((escapeProgress?.progressSec || 0) / 5) * 100}%`,
                      background: '#ef4444',
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                {escapeProgress?.isEscaping ? (
                  <button
                    className="cc-action-btn secondary small full-width"
                    onClick={onCancelEscape}
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  >
                    🛑 Cancel Channeling
                  </button>
                ) : (
                  <button
                    className="cc-action-btn primary small full-width"
                    onClick={onStartEscape}
                    disabled={escapeProgress?.isCompleted}
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  >
                    {escapeProgress?.isCompleted ? '✓ ESCAPED' : '🏃‍♂️ Channel Escape at North Border'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. PROMPT IN BOTTOM-CENTER */}
      {nearestPrompt && (
        <div className="cc-interact-prompt-capsule">
          <span className="cc-interact-key">E</span>
          <span className="cc-interact-text">{nearestPrompt}</span>
        </div>
      )}

      {/* 5. BOTTOM HUD TELEMETRY */}
      <div className="cc-bottom-hud">
        <div className="cc-controls-pill">
          <span>[W A S D] Move</span>
          <span>·</span>
          <span>[Shift] Sprint</span>
          <span>·</span>
          <span>[Mouse] Pan Camera</span>
          <span>·</span>
          <span>[E] Interact / Talk</span>
        </div>

        <div className="cc-telemetry-pill cc-telemetry-badge">
          <span>X: {coordinates.x.toFixed(1)}</span>
          <span>Z: {coordinates.z.toFixed(1)}</span>
          <span>·</span>
          <span className={`cc-status-dot ${isMoving ? 'active' : ''}`} />
          <span>{isSprinting ? 'SPRINT' : isMoving ? 'WALK' : 'IDLE'}</span>
        </div>
      </div>
    </div>
  )
}
