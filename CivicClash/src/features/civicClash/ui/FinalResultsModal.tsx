import React from 'react'
import type { MatchState, FinalMatchResult } from '../network/milestone4Types.ts'
import { sound } from '../engine/audio.ts'

interface FinalResultsModalProps {
  matchState: MatchState
  localPlayerId: string
  onRematch: () => void
  onReturnToLobby: () => void
}

export const FinalResultsModal: React.FC<FinalResultsModalProps> = ({
  matchState,
  localPlayerId,
  onRematch,
  onReturnToLobby
}) => {
  const finalResult: FinalMatchResult | null = matchState.finalResult
  const hasVotedRematch = matchState.rematchVotes[localPlayerId] || false

  if (!finalResult) return null

  const pA = finalResult.playerA
  const pB = finalResult.playerB
  const isWinner = localPlayerId === finalResult.winnerId
  const isDraw = finalResult.isDraw

  return (
    <div className="cc-menu-overlay" style={{ zIndex: 130 }}>
      <div className="cc-lobby-card" style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Victory / Draw Header Banner */}
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 4 }}>
            {isDraw ? '🤝' : isWinner ? '🏆' : '🎖️'}
          </div>
          <span className="cc-menu-kicker" style={{ color: '#f59e0b', letterSpacing: 2 }}>
            CIVIC CLASH · MATCH FINALE
          </span>
          <h1 style={{
            fontSize: '2.2rem',
            margin: '4px 0 8px 0',
            fontWeight: 900,
            color: isDraw ? '#e2e8f0' : isWinner ? '#22c55e' : '#f59e0b'
          }}>
            {isDraw
              ? 'HONORABLE CIVIC DRAW!'
              : `${finalResult.winnerName?.toUpperCase()} WINS THE MATCH!`}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto' }}>
            {finalResult.totalRoundsPlayed} rounds played across {matchState.totalLevels} civic emergency scenarios with alternating asymmetric roles.
          </p>
        </div>

        {/* 2 Player Comparison Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0' }}>
          {/* Player A Card */}
          <div style={{
            background: pA.playerId === finalResult.winnerId ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `2px solid ${pA.playerId === finalResult.winnerId ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: 10,
            padding: 16,
            textAlign: 'center'
          }}>
            {pA.playerId === finalResult.winnerId && (
              <span style={{ background: '#22c55e', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                MATCH CHAMPION
              </span>
            )}
            <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', color: '#f8fafc' }}>{pA.playerName}</h3>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
              {pA.totalScore}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>TOTAL POINTS</span>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: 10,
              fontSize: '0.8rem',
              textAlign: 'left'
            }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Runner Score:</span>
                <strong style={{ display: 'block', color: '#4ade80' }}>{pA.runnerScore} pts</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Saboteur Score:</span>
                <strong style={{ display: 'block', color: '#f87171' }}>{pA.saboteurScore} pts</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Civic Objectives:</span>
                <strong style={{ display: 'block', color: '#e2e8f0' }}>{pA.objectivesCompleted} completed</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Sabotage Acts:</span>
                <strong style={{ display: 'block', color: '#e2e8f0' }}>{pA.sabotageActionsExecuted} executed</strong>
              </div>
            </div>
          </div>

          {/* Player B Card */}
          <div style={{
            background: pB.playerId === finalResult.winnerId ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `2px solid ${pB.playerId === finalResult.winnerId ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: 10,
            padding: 16,
            textAlign: 'center'
          }}>
            {pB.playerId === finalResult.winnerId && (
              <span style={{ background: '#22c55e', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                MATCH CHAMPION
              </span>
            )}
            <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', color: '#f8fafc' }}>{pB.playerName}</h3>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
              {pB.totalScore}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>TOTAL POINTS</span>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: 10,
              fontSize: '0.8rem',
              textAlign: 'left'
            }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Runner Score:</span>
                <strong style={{ display: 'block', color: '#4ade80' }}>{pB.runnerScore} pts</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Saboteur Score:</span>
                <strong style={{ display: 'block', color: '#f87171' }}>{pB.saboteurScore} pts</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Civic Objectives:</span>
                <strong style={{ display: 'block', color: '#e2e8f0' }}>{pB.objectivesCompleted} completed</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Sabotage Acts:</span>
                <strong style={{ display: 'block', color: '#e2e8f0' }}>{pB.sabotageActionsExecuted} executed</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Round History Mini-Table */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 8,
          padding: 12,
          margin: '12px 0'
        }}>
          <strong style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
            ROUND-BY-ROUND BREAKDOWN:
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {finalResult.roundHistory.map((rh, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 4
              }}>
                <span style={{ color: '#94a3b8' }}>Level {rh.level} · Round {rh.round}</span>
                <span style={{ color: '#4ade80' }}>🏃 {rh.runnerName}: +{rh.runnerScore}</span>
                <span style={{ color: '#f87171' }}>🕵️ {rh.saboteurName}: +{rh.saboteurScore}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rematch & Lobby Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            className="cc-action-btn primary large"
            style={{ flex: 1 }}
            disabled={hasVotedRematch}
            onClick={() => {
              sound.playSuccess()
              onRematch()
            }}
          >
            {hasVotedRematch ? '✓ VOTED REMATCH · WAITING FOR OPPONENT' : '🔄 REMATCH (NEW 6-ROUND MATCH)'}
          </button>

          <button
            className="cc-action-btn secondary large"
            onClick={() => {
              sound.playClick()
              onReturnToLobby()
            }}
          >
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
