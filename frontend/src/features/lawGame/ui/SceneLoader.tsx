import { useProgress } from '@react-three/drei'

/** Covers the screen while the classroom model streams in (it is a large file). */
export function SceneLoader() {
  const { active, progress } = useProgress()
  if (!active && progress >= 100) return null
  return (
    <div className="lg-loading" role="status">
      <h2>Opening the classroom</h2>
      <div className="lg-bar-track">
        <i style={{ width: `${progress}%` }} />
      </div>
      <span className="lg-dim">{Math.round(progress)}%</span>
    </div>
  )
}
