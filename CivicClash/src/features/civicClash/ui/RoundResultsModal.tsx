import React from 'react'
import type { MatchState, RoundResult } from '../network/milestone4Types.ts'
import { sound } from '../engine/audio.ts'

interface RoundResultsModalProps {
  matchState: MatchState
  localPlayerId: string
  onContinue: () => void
}

export const RoundResultsModal: React.FC<RoundResultsModalProps> = ({
  matchState,
  localPlayerId,
  onContinue
}) => {
  const isReady = matchState.readyStatus[localPlayerId] || false
  const results = matchState.roundResults
  const currentResult: RoundResult | undefined = results[results.length - 1]

  if (!currentResult) return null

  return (
    <div className="cc-menu-overlay" style={{ zIndex: 120 }}>
      <div className="cc-lobby-card" style={{ maxWidth: 700 }}>
        {/* Header */}
        <div className="cc-lobby-header">
          <div>
            <span className="cc-menu-kicker" style={{ color: '#22c55e' }}>
              ROUND COMPLETE · LEVEL {currentResult.level} · ROUND {currentResult.round} OF {matchState.roundsPerLevel}
            </span>
            <h2 className="cc-lobby-title" style={{ fontSize: '1.6rem', marginTop: 4 }}>
              ROUND EVALUATION & SCORING
            </h2>
          </div>
          <span style={{
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: 12,
            alignSelf: 'flex-start'
          }}>
            ⏱️ {currentResult.durationSec}s played
          </span>
        </div>

        {/* 2 Player Comparison Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0' }}>
          {/* Runner Column */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            padding: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600 }}>RUNNER</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f0fdf4' }}>{currentResult.runnerName}</div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>
                +{currentResult.runnerScore}
              </div>
            </div>

            <div style={{
              display: 'inline-block',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#86efac',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              marginTop: 6
            }}>
              {currentResult.runnerOutcome.replace(/_/g, ' ')}
            </div>

            {/* Score Breakdown List */}
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(34, 197, 94, 0.2)', paddingTop: 8 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                ACHIEVED OBJECTIVES:
              </span>
              {currentResult.runnerScoreEvents.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No objectives logged</div>
              ) : (
                currentResult.runnerScoreEvents.map((evt) => (
                  <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', margin: '4px 0' }}>
                    <span style={{ color: '#e2e8f0' }}>• {evt.description}</span>
                    <strong style={{ color: '#4ade80' }}>+{evt.points}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saboteur Column */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>SABOTEUR</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fef2f2' }}>{currentResult.saboteurName}</div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>
                +{currentResult.saboteurScore}
              </div>
            </div>

            <div style={{
              display: 'inline-block',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              marginTop: 6
            }}>
              {currentResult.saboteurOutcome.replace(/_/g, ' ')}
            </div>

            {/* Score Breakdown List */}
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: 8 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                SABOTAGE ACTIONS:
              </span>
              {currentResult.saboteurScoreEvents.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No sabotage points logged</div>
              ) : (
                currentResult.saboteurScoreEvents.map((evt) => (
                  <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', margin: '4px 0' }}>
                    <span style={{ color: '#e2e8f0' }}>• {evt.description}</span>
                    <strong style={{ color: '#f87171' }}>+{evt.points}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cumulative Match Standings */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '10px 14px',
          margin: '10px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>CUMULATIVE SCOREBOARD:</strong>
          {Object.values(matchState.players).map((p) => (
            <div key={p.playerId} style={{ fontSize: '0.9rem' }}>
              <span style={{ color: '#e2e8f0' }}>{p.playerName}: </span>
              <strong style={{ color: '#f59e0b', fontSize: '1.05rem' }}>{p.totalScore} pts</strong>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 14 }}>
          <button
            className="cc-action-btn primary large full-width"
            disabled={isReady}
            onClick={() => {
              sound.playSuccess()
              onContinue()
            }}
          >
            {isReady ? '✓ READY · WAITING FOR OPPONENT...' : 'CONTINUE TO NEXT PHASE →'}
          </button>
        </div>
      </div>
    </div>
  )
}
