import React, { useState } from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import type { GameMode, Language } from '../types.ts'

export const LobbyScreen: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const { startMatch, setLanguage, language } = store

  const [selectedLevelId, setSelectedLevelId] = useState<number>(1)
  const [roomCodeInput, setRoomCodeInput] = useState<string>('')
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false)

  return (
    <div className="cc-lobby-container">
      {/* Background Synthwave Sky */}
      <div className="cc-lobby-bg" aria-hidden>
        <div className="cc-stars-field" />
        <div className="cc-ambient-sun" />
      </div>

      <header className="cc-lobby-hero">
        <span className="cc-hero-kicker">
          {language === 'hi' ? 'नागरिक जागरूकता खेल' : 'CIVIC CLASH ARCADE EDITION'}
        </span>
        <h1 className="cc-hero-title">CivicClash</h1>
        <h2 className="cc-hero-subtitle">GOLDEN HOUR: WHO STEPS FORWARD?</h2>
        <p className="cc-hero-tagline">
          {language === 'hi'
            ? 'आगे बढ़ें। आवाज उठाएं। किसी की जान बचाएं।'
            : 'Walk in. Speak up. Save a life.'}
        </p>

        {/* Language Switcher */}
        <div className="cc-lang-toggle">
          <button
            className={`cc-lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
          <button
            className={`cc-lang-btn ${language === 'hi' ? 'active' : ''}`}
            onClick={() => setLanguage('hi')}
          >
            हिन्दी
          </button>
        </div>
      </header>

      <main className="cc-lobby-main">
        {/* Level Select Cards */}
        <section className="cc-levels-section">
          <h3 className="cc-section-label">
            {language === 'hi' ? 'स्तर चुनें:' : 'SELECT SCENARIO LEVEL:'}
          </h3>
          <div className="cc-level-cards-row">
            <button
              className={`cc-level-select-card ${selectedLevelId === 1 ? 'selected' : ''}`}
              onClick={() => setSelectedLevelId(1)}
            >
              <span className="cc-level-num">LEVEL 1</span>
              <h4 className="cc-level-card-title">Junction 48 — Hit-and-Run</h4>
              <p className="cc-level-card-sub">
                Good Samaritan protections, 112/108 ERSS, scene safety, ambulance corridor.
              </p>
            </button>

            <button
              className={`cc-level-select-card ${selectedLevelId === 2 ? 'selected' : ''}`}
              onClick={() => setSelectedLevelId(2)}
            >
              <span className="cc-level-num">LEVEL 2</span>
              <h4 className="cc-level-card-title">Bazaar & Bank — Phishing Net</h4>
              <p className="cc-level-card-sub">
                1930 Cyber Fraud Helpline, OTP security, bank freeze hold, MRP consumer rights.
              </p>
            </button>

            <button
              className={`cc-level-select-card ${selectedLevelId === 3 ? 'selected' : ''}`}
              onClick={() => setSelectedLevelId(3)}
            >
              <span className="cc-level-num">LEVEL 3</span>
              <h4 className="cc-level-card-title">Station House — Know Your Rights</h4>
              <p className="cc-level-card-sub">
                Zero FIR (BNSS 173), free FIR copy, escalation to District SP, legal aid 15100.
              </p>
            </button>
          </div>
        </section>

        {/* Game Mode Cards */}
        <section className="cc-modes-section">
          <h3 className="cc-section-label">
            {language === 'hi' ? 'खेल मोड चुनें:' : 'CHOOSE PLAY MODE:'}
          </h3>

          <div className="cc-mode-buttons-grid">
            {/* Solo Practice vs AI Bot */}
            <div className="cc-mode-card">
              <span className="cc-mode-icon">🤖</span>
              <h4 className="cc-mode-title">Solo vs AI Saboteur</h4>
              <p className="cc-mode-desc">
                Play as the Good Samaritan Rescuer against an intelligent AI Saboteur who spreads rumours and manipulates witnesses.
              </p>
              <button
                className="cc-action-btn primary"
                onClick={() => startMatch('solo_rescuer', selectedLevelId)}
              >
                Play as Rescuer →
              </button>
            </div>

            {/* Solo as Saboteur */}
            <div className="cc-mode-card">
              <span className="cc-mode-icon">🕵️</span>
              <h4 className="cc-mode-title">Solo as Saboteur</h4>
              <p className="cc-mode-desc">
                Play as the Saboteur attempting to create doubts and slip away while an AI Good Samaritan tries to mobilise bystanders.
              </p>
              <button
                className="cc-action-btn secondary"
                onClick={() => startMatch('solo_saboteur', selectedLevelId)}
              >
                Play as Saboteur →
              </button>
            </div>

            {/* 2-Player Local / Shared Screen */}
            <div className="cc-mode-card">
              <span className="cc-mode-icon">👥</span>
              <h4 className="cc-mode-title">2-Player Shared Screen</h4>
              <p className="cc-mode-desc">
                Two players on the same machine! Player 1 (Rescuer) uses WASD, Player 2 (Saboteur) uses Arrow Keys. Swap roles each round.
              </p>
              <button
                className="cc-action-btn primary"
                onClick={() => startMatch('local_2p', selectedLevelId)}
              >
                Start 2-Player Match →
              </button>
            </div>

            {/* 2-Player Online Room */}
            <div className="cc-mode-card">
              <span className="cc-mode-icon">🌐</span>
              <h4 className="cc-mode-title">2-Player Online Room</h4>
              <p className="cc-mode-desc">
                Play with a friend across two browsers using a 5-letter room code via the built-in WebSocket relay.
              </p>
              <div className="cc-room-join-row">
                <input
                  type="text"
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="cc-room-input"
                />
                <button
                  className="cc-action-btn ghost"
                  onClick={() => startMatch('online', selectedLevelId)}
                >
                  Join / Host
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Controls Quick Guide */}
        <section className="cc-controls-guide">
          <div className="cc-guide-col">
            <h5 className="cc-guide-title">RESCUER CONTROLS</h5>
            <p><strong>W A S D:</strong> Walk in 8 directions (Hold <strong>Shift</strong> to hurry)</p>
            <p><strong>E:</strong> Inspect objects, talk to witnesses, open boards</p>
            <p><strong>Q:</strong> Raise Voice (Address crowd, clear Crowd Fog)</p>
            <p><strong>R:</strong> Read the Room (Inspect bystander hesitation)</p>
            <p><strong>C:</strong> Place Traffic Cone to secure ambulance lane</p>
            <p><strong>TAB:</strong> Open Case File & legal fact dossier</p>
          </div>
          <div className="cc-guide-col">
            <h5 className="cc-guide-title">SABOTEUR CONTROLS</h5>
            <p><strong>Arrow Keys / WASD:</strong> Walk freely</p>
            <p><strong>E (near NPC):</strong> Channel Whisper to plant myth</p>
            <p><strong>F:</strong> Stage Distraction (honk/drop crate)</p>
            <p><strong>G:</strong> Shift Barrier / Cones</p>
            <p><strong>V:</strong> Blend In (conceal identity, lower exposure)</p>
            <p><strong>B (at exit):</strong> Slip Away and escape the scene</p>
          </div>
        </section>
      </main>
    </div>
  )
}

