import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const REFLECTIONS = 0.42

/** Daylight from the high windows and a soft reflection, so that brass and chrome read as metal. No point lights: each one costs every pixel of a hall this big. */
export function BankLights() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    const { gl, scene } = get()
    // Made from a little room of boxes, so that the reflections cost no download.
    const generator = new THREE.PMREMGenerator(gl)
    const reflection = generator.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = reflection.texture
    scene.environmentIntensity = REFLECTIONS
    generator.dispose()
    return () => {
      scene.environment = null
      reflection.dispose()
    }
  }, [get])

  return (
    <>
      <fog attach="fog" args={['#e6d6b8', 80, 260]} />
      <ambientLight intensity={0.55} color="#fff0dc" />
      <hemisphereLight args={['#fff4e0', '#8c7a63', 1.15]} />
      <directionalLight position={[-14, 34, 12]} intensity={1.15} color="#fff1d8" />
    </>
  )
}
