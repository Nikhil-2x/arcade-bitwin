import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PLAYER_NAMES } from '../config.ts'
import { useLawGame } from '../store/useLawGame.ts'
import { RoomScene, type Vec3 } from '../three/RoomScene.tsx'
import { LawNote } from '../ui/LawNote.tsx'
import { SceneLoader } from '../ui/SceneLoader.tsx'
import { clock, useCountdown } from '../ui/useCountdown.ts'

/** The detective walks the same classroom and collects whatever was left behind. */
export function SearchScreen() {
  const { theCase, world, detective, finishSearch } = useLawGame()
  const [collected, setCollected] = useState<string[]>([])
  const [prompt, setPrompt] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [showLaw, setShowLaw] = useState(false)
  const finished = useRef(false)
  const used = useRef(0)
  const collectedRef = useRef<string[]>([])

  const placed = useMemo(() => {
    const m: Record<string, Vec3> = {}
    for (const p of world?.placements ?? []) m[p.evidenceId] = p.position
    return m
  }, [world])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    finishSearch(collectedRef.current, used.current)
  }, [finishSearch])

  const { left } = useCountdown(theCase.timing.search, ready && started, finish, used)

  const onCollect = useCallback(
    (id: string) => {
      if (collectedRef.current.includes(id)) return
      collectedRef.current = [...collectedRef.current, id]
      setCollected(collectedRef.current)
      if (collectedRef.current.length === 1) setShowLaw(true)
      if (collectedRef.current.length === theCase.evidences.length) window.setTimeout(finish, 1200)
    },
    [theCase, finish],
  )

  useEffect(() => {
    if (!showLaw) return
    const id = window.setTimeout(() => setShowLaw(false), 9000)
    return () => window.clearTimeout(id)
  }, [showLaw])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && document.pointerLockElement) finish()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [finish])

  const total = theCase.evidences.length

  return (
    <div className="lg-screen">
      <div className="lg-canvas">
        <RoomScene
          mode="search"
          evidences={theCase.evidences}
          placed={placed}
          collected={collected}
          onCollect={onCollect}
          paused={false}
          onPrompt={setPrompt}
          onReady={() => setReady(true)}
          onLockChange={(l) => {
            setLocked(l)
            if (l) setStarted(true)
          }}
        />
      </div>
      <div className="lg-hud">
        <div className="lg-top">
          <div className="lg-pill">
            <span className="lg-kicker">{PLAYER_NAMES[detective()]} · Detective</span>
            <ul className="lg-checklist">
              <li className={collected.length === total ? 'done' : ''}>
                <span className="dot" />
                Evidence collected: {collected.length} / {total}
              </li>
            </ul>
          </div>
          <div className={`lg-pill lg-time ${left <= 20 ? 'low' : ''}`}>{ready ? clock(left) : '--:--'}</div>
        </div>

        <div className="lg-cross" />
        {prompt && <div className="lg-prompt">{prompt}</div>}
        {showLaw && (
          <div className="lg-toast">
            <LawNote
              label="At a real scene"
              law={{
                act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
                section: 'Section 176',
                title: 'Forensic visit to the scene',
                summary: 'Real evidence is collected by trained officers and forensic experts, wearing gloves and logging every item. Members of the public should not touch anything.',
              }}
            />
          </div>
        )}
        <div className="lg-help">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Mouse</kbd> look &nbsp; <kbd>E</kbd> collect &nbsp; <kbd>Esc</kbd> free the mouse
        </div>
        <button className="lg-btn lg-done" onClick={finish} disabled={!ready}>
          {collected.length === total ? 'Sort the evidence' : 'Stop searching'} <span className="lg-dim">(Enter)</span>
        </button>
        {ready && !locked && (
          <div className="lg-lock" onClick={() => document.querySelector<HTMLCanvasElement>('.lg-canvas canvas')?.requestPointerLock()}>
            <h2>Click to enter the scene</h2>
            <p className="lg-dim">
              {total} items were left in the room. Some matter, some do not. Find them all, then you will sort them.
            </p>
          </div>
        )}
      </div>
      <SceneLoader />
    </div>
  )
}
