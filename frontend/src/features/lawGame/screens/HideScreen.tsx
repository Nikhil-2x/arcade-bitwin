import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { PLAYER_NAMES } from '../config.ts'
import { useLawGame } from '../store/useLawGame.ts'
import { RoomScene, type Vec3 } from '../three/RoomScene.tsx'
import type { RoomQueries } from '../three/RoomQueries.ts'
import type { Placement } from '../types.ts'
import { LawNote } from '../ui/LawNote.tsx'
import { SceneLoader } from '../ui/SceneLoader.tsx'
import { clock, useCountdown } from '../ui/useCountdown.ts'

const MOVED_EPS = 0.02

/** First person in the classroom: carry the evidence off the teacher's desk and hide it. */
export function HideScreen() {
  const { theCase, finishHide, criminal } = useLawGame()
  const queries = useRef<RoomQueries | null>(null)
  const start = useRef<Record<string, Vec3> | null>(null)
  const latest = useRef<Record<string, Vec3>>({})
  const [carried, setCarried] = useState<string | null>(null)
  const [moved, setMoved] = useState<string[]>([])
  const [prompt, setPrompt] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const warned = useRef(false)
  const [started, setStarted] = useState(false)
  const [showLaw, setShowLaw] = useState(false)
  const [ready, setReady] = useState(false)
  const finished = useRef(false)
  const used = useRef(0)

  const finish = useCallback(() => {
    const q = queries.current
    if (finished.current || !q) return
    finished.current = true
    const placements: Placement[] = theCase.evidences.map((e) => {
      const p = latest.current[e.id] ?? start.current?.[e.id] ?? [0, 0, 0]
      const home = start.current?.[e.id]
      const didMove = !home || Math.hypot(p[0] - home[0], p[1] - home[1], p[2] - home[2]) > MOVED_EPS
      return { evidenceId: e.id, position: p, concealment: q.concealment(new THREE.Vector3(...p)), moved: didMove }
    })
    finishHide(placements, used.current)
  }, [theCase, finishHide])

  const { left } = useCountdown(theCase.timing.hide, ready && started, finish, used)

  const onItems = useCallback(
    (positions: Record<string, Vec3>, inHand: string | null) => {
      start.current ??= positions
      latest.current = positions
      setCarried(inHand)
      setMoved(
        theCase.evidences
          .filter((e) => {
            const a = positions[e.id]
            const b = start.current![e.id]
            return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > MOVED_EPS
          })
          .map((e) => e.id),
      )
      if (inHand && !warned.current) {
        warned.current = true
        setShowLaw(true)
      }
    },
    [theCase],
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

  const onReady = useCallback((q: RoomQueries) => {
    queries.current = q
    setReady(true)
  }, [])

  return (
    <div className="lg-screen">
      <div className="lg-canvas">
        <RoomScene
          mode="hide"
          evidences={theCase.evidences}
          paused={false}
          onItems={onItems}
          onPrompt={setPrompt}
          onReady={onReady}
          onLockChange={(l) => {
            setLocked(l)
            if (l) setStarted(true)
          }}
        />
      </div>
      <div className="lg-hud">
        <div className="lg-top">
          <div className="lg-pill">
            <span className="lg-kicker">{PLAYER_NAMES[criminal()]} · Obstructor</span>
            <ul className="lg-checklist">
              {theCase.evidences.map((e) => (
                <li key={e.id} className={carried === e.id ? 'hand' : moved.includes(e.id) ? 'done' : ''}>
                  <span className="dot" />
                  {e.name}
                </li>
              ))}
            </ul>
          </div>
          <div className={`lg-pill lg-time ${left <= 15 ? 'low' : ''}`}>{ready ? clock(left) : '--:--'}</div>
        </div>

        <div className="lg-cross" />
        {prompt && <div className="lg-prompt">{prompt}</div>}
        {showLaw && (
          <div className="lg-toast">
            <LawNote
              label="Reality check"
              law={{
                act: 'Bharatiya Nyaya Sanhita, 2023',
                section: 'Section 238',
                title: 'Causing disappearance of evidence',
                summary: 'In real life, moving or hiding evidence to shield an offender is a crime. Here it is a game; at a real scene, touch nothing.',
              }}
            />
          </div>
        )}
        <div className="lg-help">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Mouse</kbd> look &nbsp; <kbd>E</kbd> pick up / place &nbsp; <kbd>Esc</kbd> free the mouse
        </div>
        <button className="lg-btn lg-done" onClick={finish} disabled={!ready}>
          Done hiding <span className="lg-dim">(Enter)</span>
        </button>
        {ready && !locked && (
          <div className="lg-lock" onClick={() => document.querySelector<HTMLCanvasElement>('.lg-canvas canvas')?.requestPointerLock()}>
            <h2>Click to step in</h2>
            <p className="lg-dim">
              Hide all {theCase.evidences.length} items before time runs out. Relevant or not, you decide what stays in sight.
            </p>
          </div>
        )}
      </div>
      <SceneLoader />
    </div>
  )
}
