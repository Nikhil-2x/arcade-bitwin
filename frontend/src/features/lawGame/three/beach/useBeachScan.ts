import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { buildBeachGround } from './beachGround.ts'

export const BEACH_MODEL_URL = '/models/karpen_albania__drone_3d_scan.glb'

type GLTFResult = GLTF & {
  nodes: {
    Object_2: THREE.Mesh
    Object_3: THREE.Mesh
    Object_4: THREE.Mesh
  }
  materials: {
    islu: THREE.MeshStandardMaterial
  }
}

/** The scan's meshes, and the ground worked out from them. */
export function useBeachScan() {
  const { nodes, materials } = useGLTF(BEACH_MODEL_URL) as unknown as GLTFResult
  return {
    nodes,
    materials,
    ground: buildBeachGround([nodes.Object_2.geometry, nodes.Object_3.geometry, nodes.Object_4.geometry]),
  }
}
