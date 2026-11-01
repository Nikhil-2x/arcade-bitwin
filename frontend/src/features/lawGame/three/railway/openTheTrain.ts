import * as THREE from 'three'
import { DOORS, DOOR_HALF_WIDTH } from './RailwayQueries.ts'

/**
 * The model's train is a hollow shell, but its windows and doors are solid. Rather than ship a
 * second model, cut those triangles out of the index when the model first loads:
 *  - window panes are the only pure black surfaces on the trains;
 *  - door panels are found by position on the side facing the platform.
 * Runs once per geometry, before the collision tree is built, so rays pass through the holes too.
 */
const PANE_MAX_BRIGHTNESS = 12
/** Where the trains are, in model units. Black elsewhere (signs, lamp posts) stays. */
const TRAIN_MIN_Z = -5.6
const TRAIN_MAX_Z = 4.35
const PANE_MIN_Y = 0.1
const PANE_MAX_Y = 1.5
const DOOR_MIN_Y = -0.2
const DOOR_MAX_Y = 1.5
const DOOR_FACE_MIN_Z = 4.05

const done = new WeakSet<THREE.BufferGeometry>()

function readPalette(texture: THREE.Texture | null | undefined) {
  const image = texture?.image as CanvasImageSource & { width: number; height: number }
  if (!image) return null
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0)
  const { data, width, height } = context.getImageData(0, 0, image.width, image.height)
  return (u: number, v: number) => {
    // glTF textures load unflipped, so v already counts down from the top row.
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)))
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)))
    const i = (y * width + x) * 4
    return Math.max(data[i], data[i + 1], data[i + 2])
  }
}

export function openTheTrain(meshes: THREE.Mesh[]) {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const centre = new THREE.Vector3()

  for (const mesh of meshes) {
    const { geometry } = mesh
    if (done.has(geometry)) continue
    done.add(geometry)
    const index = geometry.index
    if (!index) continue
    mesh.updateMatrix()
    const position = geometry.attributes.position
    const uv = geometry.attributes.uv as THREE.BufferAttribute | undefined
    const brightness = readPalette((mesh.material as THREE.MeshStandardMaterial).map)
    const kept: number[] = []

    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i)
      const ib = index.getX(i + 1)
      const ic = index.getX(i + 2)
      a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrix)
      b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrix)
      c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrix)
      centre.copy(a).add(b).add(c).divideScalar(3)

      const onTrain = centre.z > TRAIN_MIN_Z && centre.z < TRAIN_MAX_Z
      const isPane = !!(onTrain && uv && brightness && centre.y > PANE_MIN_Y && centre.y < PANE_MAX_Y && brightness(uv.getX(ia), uv.getY(ia)) <= PANE_MAX_BRIGHTNESS)
      const isDoor =
        centre.z > DOOR_FACE_MIN_Z &&
        centre.z < TRAIN_MAX_Z &&
        centre.y > DOOR_MIN_Y &&
        centre.y < DOOR_MAX_Y &&
        DOORS.some((x) => Math.abs(centre.x - x) < DOOR_HALF_WIDTH + 0.02)

      if (!isPane && !isDoor) kept.push(ia, ib, ic)
    }
    geometry.setIndex(kept)
    geometry.computeBoundingSphere()
  }
}
