import React from 'react'
import type { MatchState } from '../network/milestone4Types.ts'
import { sound } from '../engine/audio.ts'

interface RoleSwitchModalProps {
  matchState: MatchState
  localPlayerId: string
  isHost?: boolean
  onConfirmReady: () => void
  onForceStart?: () => void
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  matchState,
  localPlayerId,
  isHost = false,
  onConfirmReady,
  onForceStart
}) => {
  const isReady = matchState.readyStatus[localPlayerId] || false
  const localRole = matchState.playerRoles[localPlayerId] || 'runner'

  return (
    <div className="cc-menu-overlay" style={{ zIndex: 125 }}>
      <div className="cc-lobby-card" style={{ maxWidth: 620, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8, animation: 'spin 1s ease-in-out' }}>
          🔄
        </div>
        <span className="cc-menu-kicker" style={{ color: '#f59e0b' }}>
          LEVEL {matchState.currentLevel} · ROUND 2
        </span>
        <h2 className="cc-lobby-title" style={{ fontSize: '1.8rem', margin: '4px 0 12px 0' }}>
          ROLES ARE SWITCHING!
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 16px auto' }}>
          In Civic Clash, true competitive mastery requires playing both sides. The environment and objectives have been fully reset.
        </p>

        {/* Local Role Card */}
        <div style={{
          background: localRole === 'runner' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `2px solid ${localRole === 'runner' ? '#22c55e' : '#ef4444'}`,
          borderRadius: 12,
          padding: 16,
          margin: '14px 0'
        }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>
            YOUR NEW ASSIGNMENT:
          </span>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: localRole === 'runner' ? '#4ade80' : '#f87171',
            margin: '6px 0'
          }}>
            {localRole === 'runner' ? '🏃 RESPONSIBLE CITIZEN (RUNNER)' : '🕵️ HIT-AND-RUN DRIVER (SABOTEUR)'}
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#f8fafc' }}>
            {localRole === 'runner'
              ? 'Stabilize victim Arjun, dispatch 112, secure the CCTV, and file the official report with Officer Sharma.'
              : 'Plant doubt in witnesses, tamper with CCTV feed, disperse bystanders, and escape across the highway.'}
          </p>
        </div>

        {/* Ready Indicators */}
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

        <div style={{ marginTop: 14 }}>
          <button
            className="cc-action-btn primary large full-width"
            disabled={isReady}
            onClick={() => {
              sound.playSuccess()
              onConfirmReady()
            }}
          >
            {isReady ? '✓ READY · WAITING FOR OPPONENT...' : '🚀 I AM READY FOR ROUND 2'}
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
              ⚡ FORCE START ROUND 2 (BYPASS WAITING)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
