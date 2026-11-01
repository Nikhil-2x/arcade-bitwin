import * as THREE from 'three'
import { MODEL_SCALE } from '../config.ts'
import { Classroom } from './Classroom.tsx'
import { ClassroomLights } from './ClassroomLights.tsx'
import type { LoadedEnvironment } from './environments.ts'
import { RoomQueries } from './RoomQueries.ts'

const SPAWN_BACK = 0.7

const classroom: LoadedEnvironment = {
  Scenery: Classroom,
  Lights: ClassroomLights,
  scale: MODEL_SCALE,
  createQueries: (root) => new RoomQueries(root),
  spawn: (q) => ({ x: q.floor.getCenter(new THREE.Vector3()).x, z: q.floor.max.z - SPAWN_BACK, yaw: 0 }),
  itemsRestOn: 'TeachersDeskMat',
}

export default classroom
