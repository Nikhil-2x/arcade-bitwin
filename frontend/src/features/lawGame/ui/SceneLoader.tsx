import { useProgress } from '@react-three/drei'
import { useLawGame } from '../store/useLawGame.ts'

/** Covers the screen while the classroom model streams in (it is a large file). */
export function SceneLoader() {
  const { active, progress } = useProgress()
  const label = useLawGame((s) => s.theCase.copy.loading)
  if (!active && progress >= 100) return null
  return (
    <div className="lg-loading" role="status">
      <h2>{label}</h2>
      <div className="lg-bar-track">
        <i style={{ width: `${progress}%` }} />
      </div>
      <span className="lg-dim">{Math.round(progress)}%</span>
    </div>
  )
}
