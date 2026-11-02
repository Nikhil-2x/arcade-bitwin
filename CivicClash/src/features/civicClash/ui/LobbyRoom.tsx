import React, { useState, useEffect } from 'react'
import type { RoomState, PlayerRole } from '../network/networkTypes.ts'
import { sound } from '../engine/audio.ts'

interface LobbyRoomProps {
  room: RoomState
  localRole: PlayerRole
  selectedLevel?: number
  onSelectLevel?: (level: number) => void
  onToggleReady: (ready: boolean) => void
  onAddBot?: () => void
  onRemoveBot?: () => void
  onStartMatch: (chosenLevel?: number) => void
  onLeaveRoom: () => void
}

const MISSION_LEVELS = [
  {
    level: 1,
    title: 'Level 1: Hit & Run — First Response',
    location: 'Urban Crossroad & Dhaba',
    topic: 'Good Samaritan Protection (§134A)',
    description: 'First response to accident victim, preservation of scene evidence, 112 emergency calls.',
    icon: '🚨',
    badgeColor: '#38bdf8'
  },
  {
    level: 2,
    title: 'Level 2: Marketplace Fire — Evacuation',
    location: 'Dense Commercial Bazaar',
    topic: 'Electrical Hazard Isolation & Fire Protocols',
    description: 'Electrical breaker shutdown, manual fire pull sirens, smoke containment, crowd evacuation.',
    icon: '🔥',
    badgeColor: '#f59e0b'
  },
  {
    level: 3,
    title: 'Level 3: Construction Site — Statutory Reporting',
    location: 'High-Rise Construction Site',
    topic: 'BOCW Act Mandatory Accident Filing',
    description: 'Mandatory statutory incident filing under Section 38 BOCW Act, high-rise alarms, worker safety.',
    icon: '🏗️',
    badgeColor: '#10b981'
  }
]

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  room,
  localRole,
  selectedLevel = 1,
  onSelectLevel,
  onToggleReady,
  onAddBot,
  onRemoveBot,
  onStartMatch,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const activeLevel = room.selectedLevel || selectedLevel || 1

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    sound.playClick()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = localRole === 'runner'
  const isLocalReady = isHost ? (room.host?.ready || false) : (room.guest?.ready || false)
  const isBothReady = !!(room.host && room.guest && room.host.ready && room.guest.ready)
  const isGuestBot = !!(room.guest?.id && room.guest.id.startsWith('bot_'))

  // Automatic match launch countdown when both players are ready
  useEffect(() => {
    if (isBothReady) {
      setCountdown(2)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null
          if (prev <= 1) {
            clearInterval(timer)
            onStartMatch(activeLevel)
            return null
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        clearInterval(timer)
      }
    } else {
      setCountdown(null)
    }
  }, [isBothReady, activeLevel])

  return (
    <div className="cc-menu-overlay">
      <div className="cc-lobby-card">
        {/* Header */}
        <div className="cc-lobby-header" style={{ marginBottom: 10 }}>
          <div>
            <span className="cc-menu-kicker">CIVIC CLASH · MULTIPLAYER LOBBY</span>
            <h2 className="cc-lobby-title" style={{ fontSize: '1.35rem', margin: '2px 0 0 0' }}>MISSION STAGING ROOM</h2>
          </div>
          <button className="cc-leave-btn" onClick={onLeaveRoom}>
            ✕ Leave
          </button>
        </div>

        {/* Room Code Display */}
        <div className="cc-room-code-box">
          <div className="cc-code-details">
            <span className="cc-code-label">SHARE ROOM CODE WITH OPPONENT:</span>
            <span className="cc-code-display">{room.code}</span>
          </div>
          <button className="cc-copy-btn" onClick={copyCode}>
            {copied ? '✓ COPIED' : '📋 COPY CODE'}
          </button>
        </div>

        {/* Match Structure Note */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 12px',
          margin: '6px 0 8px 0',
          fontSize: '0.78rem',
          color: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚔️ <strong>Format:</strong> 3 Levels · 2 Rounds Per Level (6 Rounds Total)</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔄 Roles Switch Every Round</span>
        </div>

        {/* HOST LEVEL SELECTION CARDS */}
        <div style={{ margin: '6px 0 10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
              {isHost ? '🎮 SELECT STARTING MISSION LEVEL (HOST CONTROL):' : '🎮 MISSION LEVEL (SELECTED BY HOST):'}
            </span>
            <span style={{ fontSize: '0.7rem', color: isHost ? '#38bdf8' : '#a855f7', fontWeight: 600 }}>
              {isHost ? '⚡ Click any level card below' : '🔒 Host controls level'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {MISSION_LEVELS.map((lvl) => {
              const isSelected = activeLevel === lvl.level
              return (
                <div
                  key={lvl.level}
                  onClick={() => {
                    if (isHost && onSelectLevel) {
                      sound.playClick()
                      onSelectLevel(lvl.level)
                    }
                  }}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected
                      ? `2px solid ${lvl.badgeColor}`
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    cursor: isHost ? 'pointer' : 'default',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? `0 0 16px ${lvl.badgeColor}33` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 64
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1.1rem' }}>{lvl.icon}</span>
                    {isSelected && (
                      <span style={{
                        background: lvl.badgeColor,
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '0.62rem',
                        padding: '1px 5px',
                        borderRadius: 4
                      }}>
                        {isHost ? '✓ SELECTED' : '👑 HOST PICK'}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      marginTop: 2
                    }}>
                      Level {lvl.level}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.2, display: 'block' }}>
                      {lvl.location}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2-Player Slots */}
        <div className="cc-slots-container">
          {/* Slot 1: Host / Runner */}
          <div className="cc-player-slot host">
            <div className="cc-slot-badge runner">PLAYER 1 (HOST) · RUNNER</div>
            <div className="cc-slot-avatar">🏃</div>
            <div className="cc-slot-info">
              <strong className="cc-player-name">{room.host?.name || 'Citizen Rescuer'}</strong>
              <span className="cc-role-desc">Starts as Responsible Citizen</span>
            </div>
            <span className={`cc-ready-tag ${room.host?.ready ? 'ready' : 'waiting'}`}>
              {room.host?.ready ? '✓ READY' : '⏳ NOT READY'}
            </span>
          </div>

          <div className="cc-slot-vs" style={{ margin: '2px 0' }}>VS</div>

          {/* Slot 2: Guest / Saboteur */}
          <div className={`cc-player-slot guest ${room.guest ? 'occupied' : 'empty'}`}>
            <div className="cc-slot-badge saboteur">PLAYER 2 (GUEST) · SABOTEUR</div>
            <div className="cc-slot-avatar">{room.guest ? (isGuestBot ? '🤖' : '🕵️') : '⏳'}</div>
            <div className="cc-slot-info">
              {room.guest ? (
                <>
                  <strong className="cc-player-name">
                    {room.guest.name} {isGuestBot && <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>(AI BOT)</span>}
                  </strong>
                  <span className="cc-role-desc">Starts as Hit-and-Run Driver</span>
                  {isHost && isGuestBot && onRemoveBot && (
                    <button
                      className="cc-action-btn secondary small"
                      style={{ marginTop: 2, padding: '2px 6px', fontSize: '0.68rem', color: '#f87171' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        sound.playClick()
                        onRemoveBot()
                      }}
                    >
                      ✕ Remove AI Bot
                    </button>
                  )}
                </>
              ) : (
                <>
                  <strong className="cc-player-name waiting">Waiting for Player 2...</strong>
                  <span className="cc-role-desc">Share code <strong>{room.code}</strong> or add AI</span>
                  {isHost && onAddBot && (
                    <button
                      className="cc-action-btn secondary small"
                      style={{ marginTop: 2, padding: '2px 8px', fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        sound.playClick()
                        onAddBot()
                      }}
                    >
                      🤖 Add AI Opponent
                    </button>
                  )}
                </>
              )}
            </div>
            {room.guest ? (
              <span className={`cc-ready-tag ${room.guest.ready ? 'ready' : 'waiting'}`}>
                {room.guest.ready ? '✓ READY' : '⏳ NOT READY'}
              </span>
            ) : (
              <span className="cc-ready-tag waiting">WAITING (1/2)</span>
            )}
          </div>
        </div>

        {/* AUTO-START COUNTDOWN / READY STATUS BANNER */}
        {countdown !== null ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)',
            border: '2px solid #22c55e',
            borderRadius: 12,
            padding: '10px 14px',
            margin: '8px 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.5rem' }}>🚀</span>
              <div>
                <strong style={{ color: '#4ade80', fontSize: '0.95rem', display: 'block' }}>
                  BOTH PLAYERS READY · LAUNCHING LEVEL {activeLevel}!
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#bbf7d0' }}>
                  Starting in <strong style={{ fontSize: '1.1rem', color: '#facc15' }}>{countdown}</strong> second{countdown > 1 ? 's' : ''}...
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="cc-action-btn primary small"
                style={{ padding: '8px 14px', fontWeight: 800, background: '#22c55e', color: '#0f172a' }}
                onClick={() => {
                  sound.playSuccess()
                  onStartMatch(activeLevel)
                }}
              >
                ▶ LAUNCH NOW
              </button>
              <button
                className="cc-action-btn secondary small"
                style={{ padding: '8px 10px', fontSize: '0.75rem' }}
                onClick={() => {
                  sound.playClick()
                  setCountdown(null)
                  onToggleReady(false)
                }}
              >
                ✕ CANCEL
              </button>
            </div>
          </div>
        ) : (
          /* Ready Toggle & Quick Actions */
          <div style={{ display: 'flex', gap: 10, margin: '10px 0' }}>
            <button
              className={`cc-action-btn ${isLocalReady ? 'secondary' : 'primary'}`}
              style={{ flex: 1, padding: '10px 16px', fontWeight: 700, fontSize: '0.92rem' }}
              onClick={() => {
                sound.playClick()
                onToggleReady(!isLocalReady)
              }}
            >
              {isLocalReady ? '✕ CANCEL READY' : '✓ I AM READY'}
            </button>

            {isHost && !room.guest && onAddBot && (
              <button
                className="cc-action-btn secondary"
                style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem' }}
                onClick={() => {
                  sound.playClick()
                  onAddBot()
                }}
              >
                🤖 ADD AI BOT
              </button>
            )}

            {isHost && (
              <button
                className="cc-action-btn primary"
                style={{
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  background: isBothReady ? '#22c55e' : undefined
                }}
                onClick={() => {
                  sound.playSuccess()
                  onStartMatch(activeLevel)
                }}
              >
                {!room.guest ? '🤖 START PRACTICE' : isBothReady ? '🚀 LAUNCH MATCH' : '🚀 FORCE START'}
              </button>
            )}

            {!isHost && isBothReady && (
              <button
                className="cc-action-btn primary"
                style={{ padding: '10px 18px', fontWeight: 700, fontSize: '0.88rem', background: '#22c55e' }}
                onClick={() => {
                  sound.playSuccess()
                  onStartMatch(activeLevel)
                }}
              >
                🚀 LAUNCH MATCH
              </button>
            )}
          </div>
        )}

        {/* Footer Guidance Note */}
        {!isBothReady && (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
            {!room.guest
              ? '💡 Play solo against AI immediately with "START PRACTICE", or share room code above for 2-player match.'
              : isLocalReady
              ? '✓ Waiting for other player to click ready...'
              : '👉 Click "✓ I AM READY" above. The match will automatically begin once both players are ready.'}
          </div>
        )}
      </div>
    </div>
  )
}
