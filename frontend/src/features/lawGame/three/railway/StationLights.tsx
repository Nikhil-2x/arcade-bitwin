const FOG = '#3a1c46'

/** Dusk from the sky, warm pools under the lamps. Few real lights: each one costs every pixel. */
export function StationLights() {
  return (
    <>
      <fog attach="fog" args={[FOG, 35, 190]} />
      <ambientLight intensity={0.8} color="#d6d2f0" />
      <hemisphereLight args={['#b0aef0', '#5a4650', 1]} />
      <directionalLight position={[60, 16, -30]} intensity={1.5} color="#ffb27a" />
      <pointLight position={[-14.5, 5, 10.9]} intensity={38} distance={26} color="#ffd9a0" />
      <pointLight position={[-2.5, 5, 10.9]} intensity={38} distance={26} color="#ffd9a0" />
      <pointLight position={[11.1, 5, 10.9]} intensity={38} distance={26} color="#ffd9a0" />
      <pointLight position={[-3, 3.3, 5.6]} intensity={22} distance={18} color="#fff3d6" />
      <pointLight position={[11, 3.3, 5.6]} intensity={22} distance={18} color="#fff3d6" />
      {/* The boarding coaches, lit from within: it is what makes the windows glow from outside. */}
      <pointLight position={[-14, 2.3, 3.2]} intensity={7} distance={11} color="#fff0d0" />
      <pointLight position={[-5, 2.3, 3.2]} intensity={7} distance={11} color="#fff0d0" />
    </>
  )
}
