import type { ThreeElements } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import { MODEL_URL } from '../config.ts'

/** [glTF node number, material name] for every mesh in lowpoly_stylized_classroom.glb. */
const PARTS: ReadonlyArray<readonly [number, string]> = [
  [2, 'Bag2Mat.001'],
  [3, 'Bag1Mat'],
  [4, 'BoardMat'],
  [5, 'Bag5Mat'],
  [6, 'Book1Mat'],
  [7, 'Bag3Mat.001'],
  [8, 'BooksMat'],
  [9, 'BookShelfMat'],
  [10, 'CellingMat'],
  [11, 'ClockMat'],
  [12, 'CardboardBoxMat'],
  [13, 'CracksMat'],
  [14, 'DecalsMat'],
  [15, 'FloorMat'],
  [16, 'GlassMat'],
  [17, 'LockerMat'],
  [18, 'Lights'],
  [19, 'GlobeMat'],
  // 20 is the outline, drawn as line segments below
  [21, 'MapMat'],
  [22, 'None'],
  [23, 'Pencil1Mat'],
  [24, 'PencilsMat'],
  [25, 'Plant3Mat'],
  [26, 'TeachersDeskMat'],
  [27, 'TeachersDeskMat.001'],
  [28, 'WinodwsMat'],
  [29, 'WallPartsMat'],
  [30, 'WallsMat'],
  [31, 'TrashBinMat'],
  [32, 'chalkboardMat'],
  [33, 'Bag4Mat'],
  [34, 'CurtainMat'],
  [35, 'Desk1Mat'],
  [36, 'Desk2Mat'],
  [37, 'Desk3Mat'],
  [38, 'Desk4Mat'],
  [39, 'DoorMat.002'],
  [40, 'Outline'],
  [41, 'Outline'],
  [42, 'Outline'],
  [43, 'Outline'],
  [44, 'Outline'],
  [45, 'Outline'],
  [46, 'Outline'],
  [47, 'Outline'],
  [48, 'Outline'],
  [49, 'Outline'],
  [50, 'PapersMat'],
  [51, 'PapersMat'],
  [52, 'Plant1Mat'],
  [53, 'Plant2Mat'],
  [54, 'Plant4Mat'],
  [55, 'TeachersChairMat'],
]

type Nodes = Record<string, THREE.Mesh | THREE.LineSegments>
type Materials = Record<string, THREE.Material>

export function Classroom(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF(MODEL_URL) as unknown as { nodes: Nodes; materials: Materials }
  const geometry = (n: number) => nodes[`Object_${n}`].geometry

  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {PARTS.map(([n, material]) => (
          <mesh key={n} castShadow receiveShadow geometry={geometry(n)} material={materials[material]} />
        ))}
        <lineSegments geometry={geometry(20)} material={materials.Outline} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
