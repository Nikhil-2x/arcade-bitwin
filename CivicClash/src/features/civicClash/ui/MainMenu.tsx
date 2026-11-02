import React, { useState } from 'react'
import { sound } from '../engine/audio.ts'

interface MainMenuProps {
  playerName: string
  setPlayerName: (name: string) => void
  isConnected: boolean
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
  errorMessage?: string
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  isConnected,
  onCreateRoom,
  onJoinRoom,
  errorMessage
}) => {
  const [joinCode, setJoinCode] = useState('')
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    sound.playClick()
    onJoinRoom(joinCode.trim())
  }

  const handleCreate = () => {
    sound.playClick()
    onCreateRoom()
  }

  return (
    <div className="cc-menu-overlay">
      <div className="cc-menu-card">
        {/* Header Title */}
        <div className="cc-menu-header">
          <span className="cc-menu-kicker">3D ASYMMETRIC MULTIPLAYER HACKATHON MVP</span>
          <h1 className="cc-menu-title">CIVIC CLASH</h1>
          <p className="cc-menu-tagline">Truth is a responsibility. Deception is a strategy.</p>
        </div>

        {/* Server Connection Status */}
        <div className="cc-connection-status">
          <span className={`cc-status-dot ${isConnected ? 'online' : 'offline'}`} />
          <span className="cc-status-text">
            {isConnected ? 'Socket.IO Server Connected (Port 8788)' : 'Connecting to Server...'}
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="cc-menu-error-pill">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Player Name Input */}
        <div className="cc-input-group">
          <label className="cc-input-label">YOUR CALLSIGN / NAME</label>
          <input
            type="text"
            className="cc-text-input"
            value={playerName}
            maxLength={18}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
          />
        </div>

        {/* Room Action Buttons */}
        <div className="cc-menu-actions">
          {/* Create Room */}
          <button
            className="cc-menu-btn primary"
            disabled={!isConnected}
            onClick={handleCreate}
          >
            <span className="cc-btn-icon">⚡</span>
            <div className="cc-btn-text-col">
              <strong>CREATE ROOM</strong>
              <small>Host match as Objective Runner</small>
            </div>
          </button>

          {/* Join Room Form */}
          <form className="cc-join-form" onSubmit={handleJoin}>
            <input
              type="text"
              className="cc-code-input"
              value={joinCode}
              maxLength={5}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
            />
            <button
              type="submit"
              className="cc-menu-btn secondary"
              disabled={!isConnected || joinCode.length < 3}
            >
              JOIN ROOM
            </button>
          </form>
        </div>

        {/* Footer controls & How to play */}
        <div className="cc-menu-footer">
          <button
            type="button"
            className="cc-guide-link"
            onClick={() => setShowHowToPlay(true)}
          >
            ❓ Milestone 1 Controls & Rules
          </button>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="cc-modal-backdrop" onClick={() => setShowHowToPlay(false)}>
          <div className="cc-dialogue-window tutorial-window" onClick={(e) => e.stopPropagation()}>
            <div className="cc-dialogue-header">
              <div>
                <span className="cc-dossier-kicker">MILESTONE 1 VERIFICATION GUIDE</span>
                <h2 className="cc-npc-name">Controls & Multiplayer Architecture</h2>
              </div>
              <button className="cc-close-x" onClick={() => setShowHowToPlay(false)}>✕</button>
            </div>

            <div className="cc-tutorial-content">
              <div className="cc-tutorial-step-card">
                <span className="cc-tutorial-num">01</span>
                <div className="cc-tutorial-text">
                  <h4>2-Player Synchronized Session</h4>
                  <p>Open this URL in two separate browser windows. Window 1 creates a room; Window 2 enters the 5-character code and clicks Join.</p>
                </div>
              </div>

              <div className="cc-tutorial-step-card">
                <span className="cc-tutorial-num">02</span>
                <div className="cc-tutorial-text">
                  <h4>WASD & Third-Person Camera</h4>
                  <p>Hold <strong>W, A, S, D</strong> to walk. Click and drag with mouse to orbit the camera around your character in full 3D.</p>
                </div>
              </div>

              <div className="cc-tutorial-step-card">
                <span className="cc-tutorial-num">03</span>
                <div className="cc-tutorial-text">
                  <h4>Sprint & Collision Detection</h4>
                  <p>Hold <strong>Shift</strong> while moving to sprint. Walk towards city buildings or street lamps to verify collision response and wall-sliding.</p>
                </div>
              </div>

              <div className="cc-tutorial-step-card">
                <span className="cc-tutorial-num">04</span>
                <div className="cc-tutorial-text">
                  <h4>Real-Time Network Sync</h4>
                  <p>Move your character in Window 1 and observe the smooth 60 FPS interpolated motion and nametag in Window 2 in real time!</p>
                </div>
              </div>
            </div>

            <div className="cc-casefile-footer">
              <button
                className="cc-action-btn primary small"
                onClick={() => setShowHowToPlay(false)}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

