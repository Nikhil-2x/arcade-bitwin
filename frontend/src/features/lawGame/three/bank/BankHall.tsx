/*
Made from "The Bank Hall" by `npm run model:bank` (see scripts/optimize-bank.mjs).
Author: Veterock (https://sketchfab.com/windofglass)
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/the-bank-hall-7ff86c154ac843c48c4b0ec0149d4321
*/
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import * as THREE from 'three'
import { COLLIDER_MATERIAL, GLASS_COLLIDER_MATERIAL } from './bankLayout.ts'

export const BANK_MODEL_URL = '/models/the_bank_hall-optimized.glb'
/** Geometry is packed with meshopt, whose decoder comes with useGLTF: no Draco decoder to fetch. */
const USE_DRACO = false
/** Keeps the floor's pattern sharp where it runs away from the player. */
const ANISOTROPY = 4

const TEXTURE_SLOTS = ['map', 'normalMap', 'emissiveMap'] as const

const prepared = new WeakSet<THREE.Object3D>()

/** Runs once per model, before the game builds its queries from it. */
function prepare(scene: THREE.Object3D) {
  if (prepared.has(scene)) return
  prepared.add(scene)
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.userData.fromModel = true
    const { name } = o.material as THREE.Material
    if (name === COLLIDER_MATERIAL || name === GLASS_COLLIDER_MATERIAL) o.visible = false
  })
}

export function BankHall() {
  const { scene } = useGLTF(BANK_MODEL_URL, USE_DRACO)
  const gl = useThree((s) => s.gl)
  prepare(scene)

  // Everything goes to the GPU while the loading screen is still up. Left to itself, three.js
  // uploads a texture the first time it comes into view, and each one is a hitch as the player turns.
  useLayoutEffect(() => {
    const seen = new Set<THREE.Material>()
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      const material = o.material as THREE.MeshStandardMaterial
      if (seen.has(material)) return
      seen.add(material)
      for (const slot of TEXTURE_SLOTS) {
        const texture = material[slot]
        if (!texture) continue
        texture.anisotropy = ANISOTROPY
        gl.initTexture(texture)
      }
    })
  }, [scene, gl])

  // The same model is handed to the hide and search screens' separate canvases: never dispose of it.
  return <primitive object={scene} dispose={null} />
}

useGLTF.preload(BANK_MODEL_URL, USE_DRACO)
