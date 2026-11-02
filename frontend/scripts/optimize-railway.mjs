/**
 * Rebuilds public/models/railway_station-transformed.glb from the 250 MB source.
 *
 *   npm run model:railway
 *
 * The source has no textures: its size is all geometry, 1.35M triangles where every vertex is split
 * by hard normals and ten unused UV sets. Vertices that differ cannot be welded, and a simplifier
 * cannot collapse what is not welded, so `gltfjsx --simplify` alone barely helps. Hence two passes:
 *   1. Keep only positions, weld, simplify. The renderer flat-shades, which suits this low-poly look.
 *   2. Hand the result to gltfjsx --transform for palette, join and Draco.
 *
 * gltfjsx's TSX is thrown away here: src/features/lawGame/three/railway/RailwayStation.tsx was adapted from it by hand.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

const here = dirname(fileURLToPath(import.meta.url))
const models = resolve(here, '../public/models')
const source = join(models, 'railway_station.glb')
const target = join(models, 'railway_station-transformed.glb')
const work = mkdtempSync(join(tmpdir(), 'railway-'))
const stage = join(work, 'railway_station.glb')

/** Fraction of the mesh's extent the simplifier may move a surface: about 4 cm on this 93 m model. */
const MAX_ERROR = 0.0004
const TARGET_RATIO = 0.15

const triangles = (root) =>
  root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + p.getIndices().getCount() / 3, 0)

const io = new NodeIO()
const doc = await io.read(source)
const root = doc.getRoot()

// The source's node names are mojibake, which would otherwise end up in the generated JSX.
for (const node of root.listNodes()) node.setName('Station')
for (const mesh of root.listMeshes()) mesh.setName('Station')
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const semantic of prim.listSemantics()) if (semantic !== 'POSITION') prim.setAttribute(semantic, null)
  }
}

await MeshoptSimplifier.ready
const before = triangles(root)
await doc.transform(
  prune({ keepAttributes: false }),
  weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_RATIO, error: MAX_ERROR }),
  prune({ keepAttributes: false }),
  dedup(),
)
console.log(`Triangles: ${before} -> ${triangles(root)}`)
await io.write(stage, doc)

// gltfjsx writes <name>-transformed.glb next to its input.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
execFileSync(npx, ['--yes', 'gltfjsx@6.5.3', 'railway_station.glb', '--types', '--transform', '--keepnames', '--output', 'RailwayStation.tsx'], {
  cwd: work,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
mkdirSync(models, { recursive: true })
copyFileSync(join(work, 'railway_station-transformed.glb'), target)
rmSync(work, { recursive: true, force: true })
console.log(`${statSync(source).size} bytes -> ${statSync(target).size} bytes`)
