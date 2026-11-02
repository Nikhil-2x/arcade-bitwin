import React from 'react'
import type { MatchState, LevelSummary } from '../network/milestone4Types.ts'
import { sound } from '../engine/audio.ts'

interface LevelSummaryModalProps {
  matchState: MatchState
  localPlayerId: string
  isHost?: boolean
  onContinue: () => void
  onChooseLevel?: (level: number) => void
}

export const LevelSummaryModal: React.FC<LevelSummaryModalProps> = ({
  matchState,
  localPlayerId,
  isHost = false,
  onContinue,
  onChooseLevel
}) => {
  const isReady = matchState.readyStatus[localPlayerId] || false
  const summaries = matchState.levelSummaries
  const currentSummary: LevelSummary | undefined = summaries[summaries.length - 1]

  if (!currentSummary) return null

  const isPlayerAWinner = currentSummary.winnerName === currentSummary.playerAName && !currentSummary.isDraw
  const isPlayerBWinner = currentSummary.winnerName === currentSummary.playerBName && !currentSummary.isDraw
  const isDraw = currentSummary.isDraw || currentSummary.playerAScore === currentSummary.playerBScore

  return (
    <div className="cc-menu-overlay" style={{ zIndex: 125 }}>
      <div className="cc-lobby-card" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="cc-lobby-header">
          <div>
            <span className="cc-menu-kicker" style={{ color: '#38bdf8' }}>
              LEVEL {currentSummary.level} COMPLETED · 2 ASYMMETRIC ROUNDS PLAYED
            </span>
            <h2 className="cc-lobby-title" style={{ fontSize: '1.6rem', marginTop: 4 }}>
              {currentSummary.title}
            </h2>
          </div>
          <span style={{
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: 12,
            alignSelf: 'flex-start'
          }}>
            📍 {currentSummary.location}
          </span>
        </div>

        {/* 🏆 EXPLICIT LEVEL WINNER ANNOUNCEMENT BANNER */}
        <div style={{
          background: isDraw
            ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(71, 85, 105, 0.25))'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.28))',
          border: isDraw
            ? '2px solid rgba(148, 163, 184, 0.4)'
            : '2px solid #f59e0b',
          borderRadius: 10,
          padding: '16px 20px',
          margin: '12px 0 16px 0',
          textAlign: 'center',
          boxShadow: isDraw ? 'none' : '0 0 24px rgba(245, 158, 11, 0.25)'
        }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 4 }}>
            {isDraw ? '⚖️' : '🏆'}
          </div>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isDraw ? '#94a3b8' : '#fbbf24'
          }}>
            {isDraw ? `LEVEL ${currentSummary.level} MATCH RESULT` : `OFFICIAL LEVEL ${currentSummary.level} CHAMPION`}
          </span>
          <h2 style={{
            fontSize: '1.9rem',
            fontWeight: 900,
            margin: '4px 0 6px 0',
            color: isDraw ? '#f1f5f9' : '#ffffff',
            letterSpacing: '0.02em'
          }}>
            {isDraw ? "IT'S A DRAW!" : `${currentSummary.winnerName} WINS LEVEL ${currentSummary.level}!`}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 500
          }}>
            {currentSummary.winnerText || (
              isDraw
                ? `Both players finished tied with ${currentSummary.playerAScore} points across both rounds.`
                : `${currentSummary.winnerName} secured victory by +${currentSummary.margin || Math.abs(currentSummary.playerAScore - currentSummary.playerBScore)} points.`
            )}
          </p>
        </div>

        {/* Level Points Standings Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          margin: '12px 0'
        }}>
          {/* Player A Card */}
          <div style={{
            background: isPlayerAWinner ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 0, 0, 0.25)',
            border: isPlayerAWinner ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: 14,
            textAlign: 'center',
            position: 'relative'
          }}>
            {isPlayerAWinner && (
              <span style={{
                position: 'absolute',
                top: -10,
                right: 12,
                background: '#f59e0b',
                color: '#000',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4
              }}>
                👑 LEVEL WINNER
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
              {currentSummary.playerAName}
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
              +{currentSummary.playerAScore}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Level Points</span>
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.78rem',
              color: '#cbd5e1'
            }}>
              <span>Runner: <strong>{currentSummary.playerARunnerScore ?? '-'} pts</strong></span>
              <span>Saboteur: <strong>{currentSummary.playerASaboteurScore ?? '-'} pts</strong></span>
            </div>
          </div>

          {/* Player B Card */}
          <div style={{
            background: isPlayerBWinner ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 0, 0, 0.25)',
            border: isPlayerBWinner ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: 14,
            textAlign: 'center',
            position: 'relative'
          }}>
            {isPlayerBWinner && (
              <span style={{
                position: 'absolute',
                top: -10,
                right: 12,
                background: '#f59e0b',
                color: '#000',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4
              }}>
                👑 LEVEL WINNER
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
              {currentSummary.playerBName}
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
              +{currentSummary.playerBScore}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Level Points</span>
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.78rem',
              color: '#cbd5e1'
            }}>
              <span>Runner: <strong>{currentSummary.playerBRunnerScore ?? '-'} pts</strong></span>
              <span>Saboteur: <strong>{currentSummary.playerBSaboteurScore ?? '-'} pts</strong></span>
            </div>
          </div>
        </div>

        {/* Civic Debrief & Legal Takeaways */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 8,
          padding: 14,
          margin: '12px 0'
        }}>
          <strong style={{ color: '#38bdf8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
            📖 CIVIC DEBRIEF & REAL-WORLD LEGAL LESSONS:
          </strong>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            {currentSummary.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {takeaway}
              </li>
            ))}
          </ul>
        </div>

        {/* Cumulative Scoreboard */}
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
          <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>OVERALL TOURNAMENT SCORE:</strong>
          {Object.values(matchState.players).map((p) => (
            <div key={p.playerId} style={{ fontSize: '0.9rem' }}>
              <span style={{ color: '#e2e8f0' }}>{p.playerName}: </span>
              <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{p.totalScore} pts</strong>
            </div>
          ))}
        </div>

        {/* HOST LEVEL SELECTION SHORTCUTS */}
        {isHost && onChooseLevel && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '10px 12px',
            margin: '12px 0'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
              👑 HOST LEVEL OVERRIDE · JUMP TO ANY LEVEL:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[1, 2, 3].map((lvlNum) => (
                <button
                  key={lvlNum}
                  onClick={() => {
                    sound.playClick()
                    onChooseLevel(lvlNum)
                  }}
                  style={{
                    background: currentSummary.level === lvlNum ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: currentSummary.level === lvlNum ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: currentSummary.level === lvlNum ? '#38bdf8' : '#e2e8f0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Level {lvlNum} {lvlNum === 1 ? '(Hit & Run)' : lvlNum === 2 ? '(Market Fire)' : '(Construction)'}
                </button>
              ))}
            </div>
          </div>
        )}

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
            {isReady
              ? '✓ READY · WAITING FOR OPPONENT...'
              : matchState.currentLevel < matchState.totalLevels
              ? `ADVANCE TO LEVEL ${matchState.currentLevel + 1} →`
              : 'PROCEED TO FINAL MATCH RESULTS →'}
          </button>
        </div>
      </div>
    </div>
  )
}
