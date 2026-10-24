import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { Net } from '../game/net/Net.ts'
import { SceneBridge } from '../game/sceneBridge.ts'
import { GameState } from '../game/state/GameState.ts'
import { useGameScene } from '../hooks/useGameScene.ts'
import { PATHS } from '../routes/paths.ts'

const SCENES = ['Room'] as const
const CODE_LENGTH = 6

/** Two-player setup: open a room, join one by its code, or share one keyboard. */
export default function RoomPage() {
  useGameScene(SCENES, 'Room')
  const navigate = useNavigate()
  const status = useSyncExternalStore(Net.subscribe, Net.getStatus)
  const scene = useSyncExternalStore(SceneBridge.subscribe, () => SceneBridge.active)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const leave = () => Net.leaveRoom()
  const playHere = () => {
    // opened straight from a link the session may still be solo
    if (GameState.mode !== 'duo') GameState.newGame('duo')
    void navigate(PATHS.levels)
  }
  const copy = () => {
    void navigator.clipboard?.writeText(status.code).then(() => setCopied(true))
  }

  // on a cold load the loading screen's "click to enter" comes first
  if (scene !== 'Room') return null

  let body
  if (status.role === 'host') {
    body = (
      <section className="room-card">
        <p className="room-eyebrow">YOUR ROOM CODE</p>
        <button type="button" className="room-code" onClick={copy} title="Copy the code">
          {status.code}
        </button>
        <p className="room-note">{copied ? 'Copied. ' : ''}Player 2 enters this code on their computer.</p>
        {status.phase === 'paired' ? (
          <>
            <p className="room-status is-ready">Player 2 is in. You are Player 1.</p>
            <button type="button" className="room-btn is-amber" onClick={() => navigate(PATHS.levels)}>
              CHOOSE A NIGHT
            </button>
          </>
        ) : (
          <p className="room-status is-waiting">Waiting for Player 2...</p>
        )}
        <button type="button" className="room-btn is-muted" onClick={leave}>
          CLOSE ROOM
        </button>
      </section>
    )
  } else if (status.role === 'guest') {
    body = (
      <section className="room-card">
        <p className="room-eyebrow">ROOM {status.code}</p>
        <p className="room-status is-ready">You are in. You are Player 2.</p>
        <p className="room-note">Player 1 is choosing the night. The game starts on both screens together.</p>
        <p className="room-status is-waiting">Waiting for Player 1...</p>
        <button type="button" className="room-btn is-muted" onClick={leave}>
          LEAVE ROOM
        </button>
      </section>
    )
  } else {
    const busy = status.phase === 'connecting'
    const ready = code.length === CODE_LENGTH
    body = (
      <div className="room-choices">
        <section className="room-card">
          <p className="room-eyebrow">TWO COMPUTERS</p>
          <h2 className="room-title">CREATE A ROOM</h2>
          <p className="room-note">You get a code to share. You will be Player 1 and choose the night.</p>
          <button type="button" className="room-btn is-amber" disabled={busy} onClick={() => Net.createRoom()}>
            CREATE ROOM
          </button>
        </section>
        <section className="room-card">
          <p className="room-eyebrow">TWO COMPUTERS</p>
          <h2 className="room-title">JOIN A ROOM</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (ready) Net.joinRoom(code)
            }}
          >
            <input
              className="room-input"
              aria-label="Room code"
              placeholder="CODE"
              value={code}
              maxLength={CODE_LENGTH}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <button type="submit" className="room-btn is-cyan" disabled={busy || !ready}>
              JOIN ROOM
            </button>
          </form>
        </section>
        <section className="room-card">
          <p className="room-eyebrow">ONE COMPUTER</p>
          <h2 className="room-title">SAME KEYBOARD</h2>
          <p className="room-note">Both players share this keyboard and screen.</p>
          <button type="button" className="room-btn is-muted" onClick={playHere}>
            PLAY HERE
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="room">
      <title>Play together | Circle of Allies</title>
      <h1 className="room-heading">PLAY TOGETHER</h1>
      {status.phase === 'connecting' && <p className="room-status is-waiting">Connecting...</p>}
      {status.error && <p className="room-error">{status.error}</p>}
      {body}
      {status.role === 'offline' && (
        <button type="button" className="room-back" onClick={() => navigate(PATHS.menu)}>
          BACK
        </button>
      )}
    </div>
  )
}
