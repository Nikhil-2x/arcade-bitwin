import React from 'react'
import type { PlayerRole } from '../network/networkTypes.ts'
import type { MatchState } from '../network/milestone4Types.ts'
import { sound } from '../engine/audio.ts'

interface LevelIntroModalProps {
  matchState: MatchState
  localPlayerId: string
  localRole: PlayerRole
  isHost?: boolean
  onConfirmReady: () => void
  onForceStart?: () => void
}

export const LevelIntroModal: React.FC<LevelIntroModalProps> = ({
  matchState,
  localPlayerId,
  localRole,
  isHost = false,
  onConfirmReady,
  onForceStart
}) => {
  const isReady = matchState.readyStatus[localPlayerId] || false
  const levelNum = matchState.currentLevel
  const roundNum = matchState.currentRound

  // Briefing descriptions
  const levelData: Record<number, { title: string; location: string; law: string; runnerTask: string; saboteurTask: string }> = {
    1: {
      title: 'HIT & RUN EMERGENCY RESPONSE',
      location: 'Sector 4 Urban Intersection',
      law: 'Motor Vehicles (Amendment) Act 2019 — Section 134A (Good Samaritan Protection)',
      runnerTask: 'Stabilize victim Arjun with First Aid Kit, call 112 dispatch, unlock CCTV with Ramesh, get plate clue from Priya, and file report with Officer Sharma within the Golden Hour.',
      saboteurTask: 'Mislead eyewitness Priya, intimidate shopkeeper Ramesh or disable CCTV console, distract bystanders, plant false rumors, and escape via the North Highway perimeter.'
    },
    2: {
      title: 'CYBER FRAUD & DIGITAL PROTECTION',
      location: 'Metro Commercial Hub & Cyber Services Zone',
      law: 'Information Technology Act 2000 (Section 66D) & 1930 Cyber Financial Crime Helpline',
      runnerTask: 'Secure fraudulent transaction logs, report phishing URLs to the 1930 helpline, educate shopkeepers, and prevent victims from transferring funds.',
      saboteurTask: 'Spread false refund URLs, plant phishing QR codes, confuse digital kiosks, and delay cyber crime reporting.'
    },
    3: {
      title: 'CIVIC INTEGRITY & PUBLIC SAFETY',
      location: 'Municipal Ward 12 & Infrastructure Hazard Site',
      law: 'Right to Information Act 2005 (RTI) & Municipal Corporation Public Safety Duty',
      runnerTask: 'Inspect construction safety violations, document substandard materials, verify municipal permits, and submit an emergency civic intervention petition.',
      saboteurTask: 'Hide non-compliance logs, tamper with hazard signage, intimidate civic auditors, and escape before official inspection.'
    }
  }

  const currentInfo = levelData[levelNum] || levelData[1]

  return (
    <div className="cc-menu-overlay" style={{ zIndex: 120 }}>
      <div className="cc-lobby-card" style={{ maxWidth: 640 }}>
        <div className="cc-lobby-header">
          <div>
            <span className="cc-menu-kicker" style={{ color: '#f59e0b' }}>
              LEVEL {levelNum} OF {matchState.totalLevels} · ROUND {roundNum} OF {matchState.roundsPerLevel}
            </span>
            <h2 className="cc-lobby-title" style={{ fontSize: '1.6rem', marginTop: 4 }}>
              {currentInfo.title}
            </h2>
          </div>
          <span style={{
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: 12,
            alignSelf: 'flex-start'
          }}>
            📍 {currentInfo.location}
          </span>
        </div>

        {/* Civic Law Kicker */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          borderLeft: '4px solid #3b82f6',
          padding: '10px 14px',
          borderRadius: '0 8px 8px 0',
          margin: '12px 0',
          fontSize: '0.85rem'
        }}>
          <strong style={{ color: '#93c5fd', display: 'block', marginBottom: 2 }}>LEGAL FOUNDATION & CIVIC RIGHT:</strong>
          <span style={{ color: '#e2e8f0' }}>{currentInfo.law}</span>
        </div>

        {/* Assigned Role Briefing */}
        <div style={{
          background: localRole === 'runner' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${localRole === 'runner' ? '#22c55e' : '#ef4444'}`,
          borderRadius: 8,
          padding: 14,
          margin: '12px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.5rem' }}>{localRole === 'runner' ? '🏃‍♂️' : '🕵️‍♂️'}</span>
            <div>
              <strong style={{
                color: localRole === 'runner' ? '#4ade80' : '#f87171',
                fontSize: '1.1rem',
                textTransform: 'uppercase'
              }}>
                YOUR ROLE THIS ROUND: {localRole === 'runner' ? 'RESPONSIBLE CITIZEN' : 'SABOTEUR'}
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {localRole === 'runner' ? 'Uphold the law and rescue the community' : 'Disrupt civic response and avoid accountability'}
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, color: '#f8fafc' }}>
            {localRole === 'runner' ? currentInfo.runnerTask : currentInfo.saboteurTask}
          </p>
        </div>

        {/* Dual Ready Check Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '10px 14px',
          borderRadius: 8,
          margin: '14px 0'
        }}>
          {Object.entries(matchState.players).map(([pid, p]) => {
            const role = matchState.playerRoles[pid] || 'runner'
            const ready = matchState.readyStatus[pid] || false
            return (
              <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <span>{role === 'runner' ? '🏃' : '🕵️'} {p.playerName}:</span>
                <span style={{ color: ready ? '#22c55e' : '#eab308', fontWeight: 600 }}>
                  {ready ? '✓ READY' : '⏳ AWAITING READY'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 14 }}>
          <button
            className="cc-action-btn primary large full-width"
            disabled={isReady}
            onClick={() => {
              sound.playSuccess()
              onConfirmReady()
            }}
          >
            {isReady ? '✓ CONFIRMED READY · WAITING FOR OPPONENT...' : '🚀 I AM READY · START ACTIVE ROUND'}
          </button>

          {isReady && isHost && onForceStart && (
            <button
              className="cc-action-btn secondary small full-width"
              style={{ marginTop: 8, padding: '8px 12px', fontSize: '0.85rem' }}
              onClick={() => {
                sound.playSuccess()
                onForceStart()
              }}
            >
              ⚡ FORCE START ROUND NOW (BYPASS WAITING)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
