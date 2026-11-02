/**
 * Rebuilds public/models/the_bank_hall-optimized.glb from the 166 MB source.
 *
 *   npm run model:bank
 *
 * The source goes in model-sources/, which is ignored by git and left out of the build: everything
 * under public/ is deployed, and GitHub refuses files over 100 MB. Its weight is split between
 * 1.28M triangles in 611 meshes and 203 textures, so each gets its own treatment:
 *   - Each mesh is simplified on its own, as a tolerance relative to its own size keeps small props intact.
 *   - Meshes are joined by material, which takes the scene from over 600 draw calls to about 100.
 *   - Textures shrink and become WebP, and normal maps survive only on surfaces big enough to show them.
 *   - Meshopt packs the geometry. Its decoder is fast and is already bundled with drei's useGLTF.
 *
 * It also adds one mesh that is never drawn: a collider. The game casts many rays a frame, and a tree
 * over the full hall would stall the first frame for seconds, so the rays get a welded low-poly copy.
 *
 * Every position comes out in metres with the banking floor at y = 0.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join as joinPath, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Accessor, Node, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions'
import { clearNodeTransform, dedup, flatten, join, listTextureSlots, meshopt, prune, simplifyPrimitive, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const frontend = resolve(here, '..')
const source = joinPath(frontend, 'model-sources/the_bank_hall.glb')
const target = joinPath(frontend, 'public/models/the_bank_hall-optimized.glb')

/** The source is in metres after its root scale, with the banking floor this far up. */
const FLOOR_Y = 6
/** Names the game looks for. Keep in step with bankLayout.ts. */
const COLLIDER_MATERIAL = 'BankCollider'
/** Stops the player, but does not hide anything from view. */
const GLASS_COLLIDER_MATERIAL = 'BankGlassCollider'
/** These move in the game, so they stay separate meshes and stay out of the colliders. */
const MOVING = /^(SlideDoor|BronzeDoor)/

/** How far a surface may move: a fraction of a prop's own size, but never more than a set distance on the huge hall meshes. */
const VISUAL_ERROR = 0.004
const VISUAL_MAX_METRES = 0.012
const VISUAL_RATIO = 0.3
/** The collider only needs to be right to about a centimetre, over the whole hall. */
const COLLIDER_ERROR = 0.00018
const COLLIDER_RATIO = 0.12
/** Only what a person could bump into or put something on. */
const COLLIDER_TOP = 3.2
const COLLIDER_BOTTOM = -0.15

const BASE_SIZE = 1024
const SMALL_BASE_SIZE = 512
const NORMAL_SIZE = 512
const EMISSIVE_SIZE = 512
/** Materials covering less triangles than this lose their normal map: nobody sees it on a stapler. */
const KEEP_NORMAL_TRIANGLES = 9000

/** The hall's untextured stone, which would otherwise glare pure white. */
const STONE = [0.8, 0.76, 0.69, 1]
/** The source's flags are of another country: these become the bank's own banner. */
const BANNER = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#123a5e"/><rect y="0" width="512" height="44" fill="#c9a24a"/><rect y="234" width="512" height="44" fill="#c9a24a"/><rect y="468" width="512" height="44" fill="#c9a24a"/></svg>`
const FLAG_MATERIALS = ['440_MAT_23', '440_MAT_29']

/** The source lost these materials on export: everything on them is flat white. Its node names remember what they were. */
const LOST_MATERIALS = {
  golden: { color: [0.83, 0.62, 0.26, 1], metallic: 1, roughness: 0.32 },
  chrome: { color: [0.8, 0.82, 0.85, 1], metallic: 1, roughness: 0.18 },
  metal2: { color: [0.32, 0.31, 0.3, 1], metallic: 0.85, roughness: 0.45 },
  plastic: { color: [0.08, 0.08, 0.09, 1], metallic: 0, roughness: 0.55 },
  bolts: { color: [0.25, 0.25, 0.26, 1], metallic: 0.9, roughness: 0.5 },
  ClearGlass: { color: [0.78, 0.88, 0.9, 0.2], metallic: 0, roughness: 0.08, blend: true },
  EmissiveGlass: { color: [1, 0.96, 0.88, 1], metallic: 0, roughness: 0.4, emissive: [1, 0.93, 0.8] },
  Lights: { color: [1, 0.97, 0.9, 1], metallic: 0, roughness: 0.4, emissive: [1, 0.95, 0.82] },
}
const lostMaterialOf = (name) => Object.keys(LOST_MATERIALS).find((k) => name.includes(`${k}_`))

const triangles = (root) =>
  root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)

if (!existsSync(source)) throw new Error(`Put the original model at ${source}`)

await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(source)
const root = doc.getRoot()
const startTriangles = triangles(root)

// The source's invisible blockers.
for (const node of root.listNodes()) {
  if (/Invisible_M/i.test(node.getName())) node.dispose()
}

// Give back the materials the export flattened.
const made = new Map()
for (const node of root.listNodes()) {
  const kind = lostMaterialOf(node.getName())
  const mesh = node.getMesh()
  if (!kind || !mesh) continue
  let material = made.get(kind)
  if (!material) {
    const def = LOST_MATERIALS[kind]
    material = doc.createMaterial(`Bank_${kind}`).setBaseColorFactor(def.color).setMetallicFactor(def.metallic).setRoughnessFactor(def.roughness).setDoubleSided(true)
    if (def.blend) material.setAlphaMode('BLEND')
    if (def.emissive) material.setEmissiveFactor(def.emissive)
    made.set(kind, material)
  }
  for (const prim of mesh.listPrimitives()) if (prim.getMaterial()?.getName() === 'Merged_materials') prim.setMaterial(material)
}

root.listMaterials().find((m) => m.getName() === 'Merged_materials')?.setBaseColorFactor(STONE)

// Bake everything into world space, with the floor at zero.
await doc.transform(flatten())
for (const node of root.listNodes()) {
  const m = node.getWorldMatrix().slice()
  m[13] -= FLOOR_Y
  node.setMatrix(m)
  // Repeated props share a mesh: each copy needs its own, or the shared one would be moved once per copy.
  const shared = node.getMesh()
  if (shared && shared.listParents().filter((p) => p instanceof Node).length > 1) node.setMesh(shared.clone())
  clearNodeTransform(node)
}

// The colliders, taken before anything is simplified. Glass is a wall to the player, yet hides nothing.
function addCollider(name, wanted) {
  const positions = []
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh || MOVING.test(node.getName())) continue
    for (const prim of mesh.listPrimitives()) {
      if (!wanted(prim.getMaterial()?.getName())) continue
      const array = prim.getAttribute('POSITION').getArray()
      const indices = prim.getIndices()?.getArray()
      const count = indices ? indices.length : array.length / 3
      for (let i = 0; i + 2 < count; i += 3) {
        const corners = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2]
        const heights = corners.map((c) => array[c * 3 + 1])
        if (Math.min(...heights) > COLLIDER_TOP || Math.max(...heights) < COLLIDER_BOTTOM) continue
        for (const c of corners) positions.push(array[c * 3], array[c * 3 + 1], array[c * 3 + 2])
      }
    }
  }
  const position = doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(positions)).setBuffer(root.listBuffers()[0])
  const prim = doc.createPrimitive().setAttribute('POSITION', position).setMaterial(doc.createMaterial(name))
  root.listScenes()[0].addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
}
addCollider(COLLIDER_MATERIAL, (name) => name !== 'Bank_ClearGlass')
addCollider(GLASS_COLLIDER_MATERIAL, (name) => name === 'Bank_ClearGlass')

// Only what the game needs to find by name keeps one, which is what lets the rest be joined.
for (const node of root.listNodes()) {
  const name = node.getName()
  if (MOVING.test(name) || name === COLLIDER_MATERIAL || name === GLASS_COLLIDER_MATERIAL) continue
  node.setName('')
  node.getMesh()?.setName('')
}

await doc.transform(prune({ keepAttributes: false, keepLeaves: false }))
// The shader rebuilds tangents per pixel, so they are dead weight.
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) prim.setAttribute('TANGENT', null)
}
await doc.transform(weld())

const usage = new Map()
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const m = prim.getMaterial()
    usage.set(m, (usage.get(m) ?? 0) + (prim.getIndices()?.getCount() ?? 0) / 3)
  }
}
for (const [material, count] of usage) {
  if (count < KEEP_NORMAL_TRIANGLES) material.setNormalTexture(null)
}

// Each mesh on its own, while it is still only as big as the thing it draws.
for (const mesh of root.listMeshes()) {
  const collider = mesh.getName() === COLLIDER_MATERIAL || mesh.getName() === GLASS_COLLIDER_MATERIAL
  for (const prim of mesh.listPrimitives()) {
    const position = prim.getAttribute('POSITION')
    const low = position.getMin([])
    const high = position.getMax([])
    const extent = Math.hypot(high[0] - low[0], high[1] - low[1], high[2] - low[2]) || 1
    simplifyPrimitive(prim, {
      simplifier: MeshoptSimplifier,
      ratio: collider ? COLLIDER_RATIO : VISUAL_RATIO,
      error: collider ? COLLIDER_ERROR : Math.min(VISUAL_ERROR, VISUAL_MAX_METRES / extent),
      lockBorder: false,
    })
  }
}

await doc.transform(
  // Names count: the collider's plain material must not be merged into some other plain one.
  dedup({ keepUniqueNames: true }),
  // Only the doors and colliders still have names, and they are the ones to leave apart.
  join({ keepNamed: true }),
  prune({ keepAttributes: false, keepLeaves: false }),
)

for (const material of root.listMaterials()) {
  if (!FLAG_MATERIALS.includes(material.getName())) continue
  material.getBaseColorTexture()?.setImage(await sharp(Buffer.from(BANNER)).png().toBuffer()).setMimeType('image/png')
}

// Full size only where a texture was authored large, which is the walls and the floor.
doc.createExtension(EXTTextureWebP).setRequired(true)
for (const texture of root.listTextures()) {
  const slots = listTextureSlots(texture)
  const normal = slots.includes('normalTexture')
  const size = texture.getSize() ?? [1024, 1024]
  const longest = Math.max(...size)
  const limit = normal ? NORMAL_SIZE : slots.includes('emissiveTexture') ? EMISSIVE_SIZE : longest >= 2048 ? BASE_SIZE : SMALL_BASE_SIZE
  const image = await sharp(texture.getImage())
    .resize({ width: Math.round((size[0] * Math.min(limit, longest)) / longest), height: Math.round((size[1] * Math.min(limit, longest)) / longest), fit: 'fill' })
    .webp({ quality: normal ? 70 : 76, effort: 5 })
    .toBuffer()
  texture.setImage(image).setMimeType('image/webp').setURI('')
}

const finalTriangles = triangles(root)
const colliderTriangles = root.listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => [COLLIDER_MATERIAL, GLASS_COLLIDER_MATERIAL].includes(p.getMaterial()?.getName())).reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0)
console.log(`Triangles: ${startTriangles} -> ${finalTriangles} (${colliderTriangles} of them the colliders)`)
console.log(`Materials: ${root.listMaterials().length}, textures: ${root.listTextures().length}, draw calls: ${root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0)}`)

// 16 bits keep positions to about 1.5 mm across a hall this size, so joined props do not jitter apart.
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14 }))
await io.write(target, doc)
console.log(`${(statSync(source).size / 1e6).toFixed(1)} MB -> ${(statSync(target).size / 1e6).toFixed(1)} MB`)
