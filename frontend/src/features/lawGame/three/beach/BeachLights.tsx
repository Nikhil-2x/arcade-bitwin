import { HAZE, SUN_DIRECTION } from './beachLayout.ts'

/** Only the props and people use these: the scan carries its own light. */
export function BeachLights() {
  return (
    <>
      <fog attach="fog" args={[HAZE, 180, 1300]} />
      <ambientLight intensity={1.15} color="#fff6e6" />
      <hemisphereLight args={['#bfe6ff', '#c9b28c', 1.3]} />
      <directionalLight position={[SUN_DIRECTION[0] * 100, SUN_DIRECTION[1] * 100, SUN_DIRECTION[2] * 100]} intensity={2.6} color="#fff0d2" />
    </>
  )
}
